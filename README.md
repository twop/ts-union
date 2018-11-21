# ts-union

Tiny library (<1Kb unminified & unzipped) for algebraic sum types in typescript. Inspired by [unionize](https://github.com/pelotom/unionize) and [F# discriminated-unions](https://docs.microsoft.com/en-us/dotnet/fsharp/language-reference/discriminated-unions) (and other ML languages)

## Installation

```
npm add ts-union
```

NOTE: uses features from typescript 3.0 (such as `unknown` type)

## Usage

### Define

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

### Construct

```typescript
const cash = PaymentMethod.Cash();
const check = PaymentMethod.Check(15566909);
const card = PaymentMethod.CreditCard('Visa', '1111-566-...');

// or destructure it to simplify construction :)
const { Cash, Check, CreditCard } = PaymentMethod;
const anotherCheck = Check(566541123);
```

### `match`

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

### `if` (aka simplified match)

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

### Generic version

```typescript
// Pass a function that accepts a type token and returns a record
const Maybe = Union(val => ({
  Nothing: of<void>(),
  Just: of(val) // Just has type Of<[Generic]>
}));
```

Note that `val` is a **value** of the special type `Generic` that will be substituted with an actual type later on. It is just a variable name, pls feel free to name it whatever you feel like :) Maybe `a`, `T` or `TPayload`?

This feature can be handy to model network requests (like in `Redux`):

```typescript
const ReqResult = Union(data => ({
  Pending: of<void>(),
  Ok: of(data),
  Err: of<string | Error>()
}));

// res is inferred as UnionValG<string, ...>
const res = ReqResult.Ok('this is awesome!');

const status = ReqResult.match(res, {
  Pending: () => 'Thinking...',
  Err: err =>
    typeof err === 'string' ? `Oops ${err}` : `Exception ${err.message}`,
  Ok: str => `Ok, ${str}`
}); // 'Ok, this is awesome!'
```

Let's try to build `map` and `bind` functions for `Maybe`:

```typescript
const { Nothing, Just } = Maybe;

// GenericValType is a helper that allows you to substitute Generic token type.
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

And if you want to **extend** `Maybe` with these functions:

```typescript
const TempMaybe = Union(val => ({
  Nothing: of(),
  Just: of(val)
}));

const map = .....
const bind = .....

// TempMaybe is just an object, so this is perfectly legit
export const Maybe = {...TempMaybe, map, bind};
```

### Type of resulted objects

Types of union values are opaque. That makes it possible to experiment with different underlying data structures.

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

## API and implementation details

If you to log a union value all you see is an array.

```typescript
console.log(PaymentMethod.Check(15566909));
// ['Check', [15566909]]
```

This is because union values are arrays under the hood. The first element is the key and the second is payload array. I decided not to expose that through typings but I might reconsider that in the future. You **cannot** use it for redux actions, however you can **safely use it for redux state**.

### API

Use `Union` constructor to define the type

```typescript
import { Union, of } from 'ts-union';

const U = Union({
  Simple: of(), // or of<void>(). no payload.
  One: of<string>(), // one argument
  Const: of(3), // one constant argument that is baked in
  Two: of<string, number>(), // two arguments
  Three: of<string, number, boolean>() // three
});

// generic version
const Option = Union(t => ({
  None: of<void>(),
  Some: of(t) // Note: t is a value of the special type Generic
}));
```

Let's take a closer look at `of` function

```typescript
interface Types {
  <T = void>(): Of<[T]>;
  (g: Generic): Of<[Generic]>;
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

`GenericValType` is a type that helps with generic union values. It just replaces `Generic` token type with provided `Type`.

```typescript
type GenericValType<Type, Val> = Val extends UnionValG<infer _Type, infer Rec>
  ? UnionValG<Type, Rec>
  : never;

// Example
import { Union, of, GenericValType } from 'ts-union';
const Maybe = Union(t => ({ Nothing: of(), Just: of(t) }));
type MaybeVal<T> = GenericValType<T, typeof Maybe.T>;
```

That's the whole API.

### Breaking changes from 1.2 -> 2.0

There should be no breaking changes, but I removed some of the exported types to reduce the API surface.

```typescript
export {
  Union, // the main entry point function
  of, // helper to define cases payload
  GenericValType, // helper type for working with generic unions
  UnionObj, // Non-generic union object: Constructors, match, if
  GenericUnionObj // generic version of the union object
};
```

### Breaking changes from 1.1 -> 1.2

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

That reduces allocations and opens up possibility for future API extensions. Such as:

```typescript
// namespaces to avoid collisions.
const withNamespace = ['CreditCard', ['Visa', '1111-566-...'], 'MyNamespace'];
```
