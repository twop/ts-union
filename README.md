# ts-union

Tiny library (1Kb unzipped) for algebraic sum types that looks similar to swift enums. Inspired by [unionize](https://github.com/pelotom/unionize) and [F# discriminated-unions](https://docs.microsoft.com/en-us/dotnet/fsharp/language-reference/discriminated-unions)

## Installation

```
npm add ts-union
```

NOTE: uses features from typescript 2.8

## Usage

### Create

```typescript
import { Union, of } from 'ts-union';

const PaymentMethod = Union({
  Cash: of<void>(), // or just of()
  Check: of<CheckNumber>(),
  CreditCard: of<CardType, CardNumber>()
});

type CheckNumber = number;
type CardType = 'MasterCard' | 'Visa';
type CardNumber = string;
```

### Type constructors

```typescript
const cash = PaymentMethod.Cash();
const check = PaymentMethod.Check(15566909);
const card = PaymentMethod.CreditCard('Visa', '1111-566-...');

// or destructure it to simplify construction
const { Cash, Check, CreditCard } = PaymentMethod;
const anotherCheck = Check(566541123);
```

### Matching

```typescript
const str = PaymentMethod.match(cash, {
  Cash: () => 'cash',
  Check: n => `check num: ${n.toString()}`,
  CreditCard: (type, n) => `${type} ${n}`
});
```

Also supports deferred (curried) matching and `default` case.

```typescript
const toStr = PaymentMethod.match({
  Cash: () => 'cash',
  default: _v => 'not cash' // _v is the union obj
});

const str = toStr(card); // "not cash"
```

### if (aka simplified match)

```typescript
const str = PaymentMethod.if.Cash(cash, () => 'yep'); // "yep"
// typeof str === string | undefined
```

You can provide else case as well, then 'undefined' type will be removed from the result.

```typescript
// typeof str === string
const str = PaymentMethod.if.Check(
  cash,
  n => `check num: ${n.toString()}`,
  _v => 'not check' // _v is the union obj that is passed in
); // str === 'not check'
```

### Generic Union

```typescript
// Pass a function that accepts a type token and returns a record
const Maybe = Union(T => ({
  Nothing: of<void>(),
  Just: T
}));
```

Note that `T` is a **variable** of the special type `Generic` that will be substituted with an actual type later on.

This can be handy to model network request states (like in `Redux`):

```typescript
const ReqResult = Union(TPayload => ({
  Pending: of<void>(),
  Ok: TPayload,
  Err: of<string | Error>()
}));

// type is UnionValG<string, ...>.
const res = ReqResult.Ok('this is awesome!');

const toStr = ReqResult.match(res, {
  Pending: () => 'Thinking...',
  Err: err =>
    typeof err === 'string' ? `Oops ${err}` : `Exception ${err.message}`,
  Ok: str => `Ok, ${str}`
}); // 'Ok, this is awesome!'
```

Let's try to define a `map` and `bind` functions for `Maybe`:

```typescript
const { Nothing, Just } = Maybe;

// GenericValType helper allows you to substitute Generic token type.
type MaybeVal<T> = GenericValType<T, typeof Maybe.T>;

const map = <A, B>(val: MaybeVal<A>, f: (a: A) => B) =>
  Maybe.match(val, {
    Just: v => Just(f(v)),
    Nothing: () => Nothing<B>() // note that we have to explicitly provide B type here
  });

const bind = <A, B>(val: MaybeVal<A>, f: (a: A) => MaybeVal<B>) =>
  Maybe.if.Just(val, a => f(a), n => (n as unknown) as MaybeVal<B>);

map(Just('a'), s => s.length); // -> Just(1)
bind(Just(100), n => Just(n.toString())); // -> Just('100')

map(Nothing<string>(), s => s.length); // -> Nothing
```

And if you want to **add** these functions to `Maybe` union:

```typescript
const TempMaybe = Union(T => ({
  Nothing: of<void>(),
  Just: T
}));

const map = .....
const bind = .....

// TempMaybe is just an object. So this is perfectly fine
export const Maybe = {...TempMaybe, map, bind};
```

### Type of resulted objects

At the moment types of union values are opaque. That allows me to experiment with different underlying data structures.

```typescript
type CashType = typeof cash;
// UnionVal<{Cash:..., Check:..., CreditCard:...}>
// and it is the same for card and check
```

The `UnionVal<...>` type for `PaymentMethod` is accessible via phantom property `T`

```typescript
type PaymentMethodType = typeof PaymentMethod.T;
// UnionVal<{Cash:..., Check:..., CreditCard:...}>
```

## Api and implementation details

If you will try to log a union value you will see just an array.

```typescript
console.log(PaymentMethod.Check(15566909));
// ['Check', [15566909]]
```

All union values are arrays. The first element is the key to match and the second is payload. I decided not to expose that through typings but I might reconsider that in the future. Although you cannot use it for redux action you can **safely use it for redux state**.

### Api

How to define shape

```typescript
const U = Union({
  Simple: of(), // or of<void>(). no payload.
  One: of<string>(), // one argument
  Const: of(3), // one constant argument that is baked in
  Two: of<string, number>(), // two arguments
  Three: of<string, number, boolean>() // three
});

// generic version
const Option = Union(T => ({
  None: of<void>(),
  Some: T // Note: here T is a value not a type.
}));
```

Let's take a closer look at `of` function

```typescript
interface Types {
  <T = void>(): Of<[T]>;
  <T>(val: T): Const<T>;
  <T1, T2>(): Of<[T1, T2]>;
  <T1, T2, T3>(): Of<[T1, T2, T3]>;
}
declare const of: Types;
```

the actual implementation is pretty simple:

```typescript
export const of: Types = ((val: any) => val) as any;
```

We just capture the constant and don't really care about the rest. Typescript will guide us to provide proper number of args for each case.

`match` accepts either a full set of props or a subset with a default case.

```typescript
// typedef for match function. Note there is a curried version
export type MatchFunc<Record> = {
  <Result>(cases: MatchCases<Record, Result>): (
    val: UnionVal<Record>
  ) => Result;
  <Result>(val: UnionVal<Record>, cases: MatchCases<Record, Result>): Result;
};
```

`if` either accepts a function that will be invoked (with a match) and/or else case.

```typescript
// typedef for if case for one argument.
// Note it doesn't throw but can return undefined
{
    <R>(val: UnionVal<Rec>, f: (a: A) => R): R | undefined;
    <R>(val: UnionVal<Rec>, f: (a: A) => R, els: (v: UnionVal<Rec>) => R): R;
}
```

And that is the whole api.

### Technically breaking changes going 1.2 -> 2.0

There should be no breaking changes but I cut the exported types to reduce api surface.

```typescript
export {
  Union, // the main entry point function
  of, // helper to define cases payload
  GenericValType, // helper type for working with generic unions
  UnionObj, // Non generic union object: Constructors, match, if
  GenericUnionObj // generic version of it
};
```

### Breaking changes going 1.1 -> 1.2

- `t` function to define shapes is renamed to `of`.
- There is a different underlying data structure. So if you persisted the values somewhere it wouldn't be compatible with the new version.

The actual change is pretty simple:

```typescript
type OldShape = [string, ...payload[any]];
// Note: no nesting
const oldShape = ['CreditCard', 'Visa', '1111-566-...'];

type NewShape = [string, payload[any]];
// Note: captured payload is nested
const newShape = ['CreditCard', ['Visa', '1111-566-...']];
```

That allows to reduce allocations and it opens up future api extensibility. Such as:

```typescript
// namespaces to avoid collisions.
const withNamespace = ['CreditCard', ['Visa', '1111-566-...'], 'MyNamespace'];
```
