# ts-union

Tiny library (<1Kb gzipped) for algebraic sum types that looks similar to swift enums. Inspired by [unionize](https://github.com/pelotom/unionize) and [F# discriminated-unions](https://docs.microsoft.com/en-us/dotnet/fsharp/language-reference/discriminated-unions)

## Installation

```
npm add ts-union
```
NOTE: uses features from typescript 2.8

## Usage

### Create

```typescript
const PaymentMethod = Union({
  Cash: simple(),
  Check: of<CheckNumber>(),
  CreditCard: of2<CardType, CardNumber>()
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

// or destructure for simplicity
const { Cash, Check, CreditCard } = PaymentMethod;
const anotherCheck = Check(566541123);
```

### Matching

```typescript
const str = PaymentMethod.match(cash, {
  Cash: () => 'cash',
  Check: n => `check num: ${n.toString()}`,
  CreditCard: (type, n) => `${type} ${n}`
}); // cash
```

Also supports deferred (curried) matching and default case.

```typescript
const toStr = PaymentMethod.match({
  Cash: () => 'cash',
  default: _v => 'not cash' // _v is the union obj
});

const str = toStr(card); //not cash
```

### if (simplified match)

```typescript
const str = PaymentMethod.if.Cash(cash, () => 'cash'); //cash
// typeof str === string | undefined
```

You can provide else case as well. In that case 'undefined' type will be removed.

```typescript
// typeof str === string
const str = PaymentMethod.if.Check(
  cash,
  n => `check num: ${n.toString()}`,
  () => 'not check'
); // str === 'not check'
```

### Type of resulted objects

At the moment types of cash, check, card are opaque.

```typescript
type CashType = typeof cash;
// OpaqueUnion<{Cash:..., Check:..., CreditCard:...}>
// and it is the same for card and check
```

The OpaqueUnion<...> type for PaymentMethod is accessible via T phantom property

```typescript
type PaymentMethodType = typeof PaymentMethod.T;
// OpaqueUnion<{Cash:..., Check:..., CreditCard:...}>
```

## Api and implementation details

If you will try to debug value for check you will see an array.

```typescript
console.log(PaymentMethod.Check(15566909));
// ['Check', 15566909]
```

All values are arrays. The first element is the key to match against and the rest is payload. I decided not to expose that through typings but I might reconsider that in the future. Although you cannot use it for redux action you can **safely use it for redux state**.

### Api

How to define shape

```typescript
const U = Union({
  Simple: simple(), // no payload
  One: of<string>(), // one argument
  Const: ofConst(3), // one constant argument that is baked in
  Two: of2<string, number>(), // two arguments
  Three: of3<string, number, boolean>() // three
});
```

match accepts either a full set of props or a subset with default case.

```typescript
// typedef for match function. Note there is a curried version
export type MatchFunc<Record> = {
  <Result>(cases: MatchCases<Record, Result>): (
    val: OpaqueUnion<Record>
  ) => Result;
  <Result>(val: OpaqueUnion<Record>, cases: MatchCases<Record, Result>): Result;
};
```

if either accepts a function that will be invoked (with a match) and/or else case.

```typescript
// typedef for if case for one argument.
// Note it doesn't throw but can return undefined
{
    <R>(val: OpaqueUnion<Rec>, f: (a: A) => R): R | undefined;
    <R>(val: OpaqueUnion<Rec>, f: (a: A) => R, els: () => R): R;
}
```
