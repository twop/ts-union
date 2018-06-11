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

// or destructure to remove `PaymentMethod.` prefix.
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
const str = PaymentMethod.if.Cash(cash, () => 'cash'); // "cash"
// typeof str === string | undefined
```

You can provide else case as well. In that case 'undefined' type will be removed.

```typescript
// typeof str === string
const str = PaymentMethod.if.Check(
  cash,
  n => `check num: ${n.toString()}`,
  _v => 'not check' // _v is the union obj that is passed in
); // str === 'not check'
```

### Type of resulted objects

At the moment types of union values are opaque. That allows me to experiment with different underlying data structures.

```typescript
type CashType = typeof cash;
// OpaqueUnion<{Cash:..., Check:..., CreditCard:...}>
// and it is the same for card and check
```

The `OpaqueUnion<...>` type for `PaymentMethod` is accessible via phantom property `T`

```typescript
type PaymentMethodType = typeof PaymentMethod.T;
// OpaqueUnion<{Cash:..., Check:..., CreditCard:...}>
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
```

Let's take a closer look at `of` function

```typescript
export declare type Types = {
  <T = void>(): T extends void ? NoData : One<T>;
  <T>(val: T): Const<T>;
  <T1, T2>(): Two<T1, T2>;
  <T1, T2, T3>(): Three<T1, T2, T3>;
};
export declare const of: Types;
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
    val: OpaqueUnion<Record>
  ) => Result;
  <Result>(val: OpaqueUnion<Record>, cases: MatchCases<Record, Result>): Result;
};
```

`if` either accepts a function that will be invoked (with a match) and/or else case.

```typescript
// typedef for if case for one argument.
// Note it doesn't throw but can return undefined
{
    <R>(val: OpaqueUnion<Rec>, f: (a: A) => R): R | undefined;
    <R>(val: OpaqueUnion<Rec>, f: (a: A) => R, els: (v: OpaqueUnion<Rec>) => R): R;
}
```

And that is the whole api.

### Breaking changes from 1.1

* `t` function to define shapes is renamed to `of`.
* There is a different underlying data structure. So if you persisted the values somewhere it wouldn't be compatible with the new version.

The actual change is pretty simple:

```typescript
type OldShape = [string, ...payload[any]];
// Note: no nesting
const oldShape = ["CreditCard",'Visa', '1111-566-...'];

type NewShape = [string, payload[any]];
// Note: captured payload is nested
const newShape = ["CreditCard", ['Visa', '1111-566-...']];
```

That allows to reduce allocations and it opens up future api extensibility. Such as:

```typescript
// namespaces to avoid collisions.
const withNamespace = ['CreditCard', ['Visa', '1111-566-...'], 'MyNamespace'];
```
