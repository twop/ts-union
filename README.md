# ts-union

A tiny library for algebraic sum types in typescript. Inspired by [unionize](https://github.com/pelotom/unionize) and [F# discriminated-unions](https://docs.microsoft.com/en-us/dotnet/fsharp/language-reference/discriminated-unions) (and other ML languages)

## Installation

```
npm add ts-union
```

NOTE: Distrubuted as modern javascript (es2018) library.

## Usage

### Define

```typescript
import { Union, of } from 'ts-union';

const PaymentMethod = Union({
  Check: of<CheckNumber>(),
  CreditCard: of<CardType, CardNumber>(),
  Cash: of(null), // means that this variant has no payload
});

type CheckNumber = number;
type CardType = 'MasterCard' | 'Visa';
type CardNumber = string;
```

### Construct a union value

```typescript
// Check is a function that accepts a check number
const check = PaymentMethod.Check(15566909);

// CreditCard is a function that accepts two arguments (CardType, CardNumber)
const card = PaymentMethod.CreditCard('Visa', '1111-566-...');

// Cash is just a value
const cash = PaymentMethod.Cash;

// or destructure it to simplify construction :)
const { Cash, Check, CreditCard } = PaymentMethod;
const anotherCheck = Check(566541123);
```

### `match`

```typescript
const str = PaymentMethod.match(cash, {
  Cash: () => 'cash',
  Check: (n) => `check num: ${n.toString()}`,
  CreditCard: (type, n) => `${type} ${n}`,
});
```

Also supports deferred (curried) matching and `default` case.

```typescript
const toStr = PaymentMethod.match({
  Cash: () => 'cash',
  default: (_v) => 'not cash', // _v is the union obj
});

const str = toStr(card); // "not cash"
```

### `if` (aka simplified match)

```typescript
const str = PaymentMethod.if.Cash(cash, () => 'yep'); // "yep"
// typeof str === string | undefined
```

You can provide else case as well, in that case 'undefined' type will be removed from the result.

```typescript
// typeof str === string
const str = PaymentMethod.if.Check(
  cash,
  (n) => `check num: ${n.toString()}`,
  (_v) => 'not check' // _v is the union obj that is passed in
); // str === 'not check'
```

### **EXPERIMENTAL** `matchWith`

WARNING: This API is experimental and currently more of an MVP.

Often we want to match a union with another union. A good example of this if we try to model a state transition in `useReducer` in React or model a state machine.

This is what you have to do currently:

```ts
const State = Union({
  Loading: of(null),
  Loaded: of<number>(),
  Err: of<string>(),
});

const Ev = Union({
  ErrorHappened: of<string>(),
  DataFetched: of<number>(),
});

const { Loaded, Err, Loading } = State;

const transition = (prev: typeof State.T, ev: typeof Ev.T) =>
  State.match(prev, {
    Loading: () =>
      Ev.match(ev, {
        ErrorHappened: (err) => Err(err),
        DataFetched: (data) => Loaded(data),
      }),

    Loaded: (loadedData) =>
      // just add to the current loaded value as an example
      Ev.if.DataFetched(
        ev,
        (data) => Loaded(loadedData + data),
        () => prev
      ),

    default: (s) => s,
  });
```

It gets worse and more verbose when complexity grows, also you have to match the `Ev` in each variant of `State`.

In my experience this comes up often enough to justify a dedicated API for matching a pair:

```ts
import { Union, of } from 'ts-union';

const State = Union({
  Loading: of(null),
  Loaded: of<number>(),
  Err: of<string>(),
});

const Ev = Union({
  ErrorHappened: of<string>(),
  DataFetched: of<number>(),
});

const { Loaded, Err, Loading } = State;

const transition = State.matchWith(Ev, {
  Loading: {
    ErrorHappened: (_, err) => Err(err),
    DataFetched: (_, data) => Loaded(data),
  },

  Loaded: {
    DataFetched: (loaded, data) => Loaded(loaded + data),
  },

  default: (prevState, ev) => prevState,
});

// usage
const newState = transition(Loading, Ev.ErrorHappened('oops')); // <-- State.Err('oops')
```

`transition` is a function with type signature: (prev: State, ev: Ev) => State.
Note that the return type is **inferred**, meaning that you can return whatever type you want :)

```ts
const logLoadingTransition = State.matchWith(Ev, {
  Loading: {
    ErrorHappened: (_, err) => 'Oops, error happened: ' + err,
    DataFetched: (_, data) => 'Data loaded with: ' + data.toString(),
  },
  default: () => '',
});
```

#### Caveats

1. Doesn't support generic version (yet?)
2. Doesn't work with unions that have more than 1 arguments in variants. E.g. `of<string, number>()` will give an incomprehensible type error.
3. You cannot pass additional data to the update function. I'm tinkering about something like this for the future releases:

```ts
const transition = State.matchWith(Ev, {...}, of<SomeContext>());
transition = (prev, ev, someContextValue);
```

### Two ways to specify variants with no payload

You can define variants with no payload with either `of(null)` or `of<void>()`;

```ts
const Nope = Union({
  Old: of<void>(), // only option in 2.0
  New: of(null), // new syntax in 2.1
});

// Note that New is a value not a function
const nope = Nope.New;

// here Old is a function
const oldNope = Nope.Old();
```

Note that `Old` will always allocate a new value while `New` **is** a value (thus more efficient).

For generics the syntax differs a little bit:

```ts
// generic version
const Option = Union((t) => ({
  None: of(null),
  Some: of(t),
}));

// we need to provide a type for the Option to "remember" it.
const maybeNumber = Option.None<number>();
```

Even though `None` is a function, but it **always** returns the same value. It is just a syntax to "remember" the type it was constructed with;

Speaking of generics...

### Generic version

```typescript
// Pass a function that accepts a type token and returns a record
const Maybe = Union((val) => ({
  Nothing: of(null), // type is Of<[Unit]>
  Just: of(val), // type is Of<[Generic]>
}));
```

Note that `val` is a **value** of the special type `Generic` that will be substituted with an actual type later on. It is just a variable name, pls feel free to name it whatever you feel like :) Maybe `a`, `T` or `TPayload`?

This feature can be handy to model network requests (like in `Redux`):

```typescript
const ReqResult = Union((data) => ({
  Pending: of(null),
  Ok: of(data),
  Err: of<string | Error>(),
}));

// res is inferred as UnionValG<string, ...>
const res = ReqResult.Ok('this is awesome!');

const status = ReqResult.match(res, {
  Pending: () => 'Thinking...',
  Err: (err) =>
    typeof err === 'string' ? `Oops ${err}` : `Exception ${err.message}`,
  Ok: (str) => `Ok, ${str}`,
}); // 'Ok, this is awesome!'
```

Let's try to build `map` and `bind` functions for `Maybe`:

```typescript
const { Nothing, Just } = Maybe;

// GenericValType is a helper that allows you to substitute Generic token type.
type MaybeVal<T> = GenericValType<T, typeof Maybe.T>;

const map = <A, B>(val: MaybeVal<A>, f: (a: A) => B) =>
  Maybe.match(val, {
    Just: (v) => Just(f(v)),
    Nothing: () => Nothing<B>(), // note that we have to explicitly provide B type here
  });

const bind = <A, B>(val: MaybeVal<A>, f: (a: A) => MaybeVal<B>) =>
  Maybe.if.Just(
    val,
    (a) => f(a),
    (n) => (n as unknown) as MaybeVal<B>
  );

map(Just('a'), (s) => s.length); // -> Just(1)
bind(Just(100), (n) => Just(n.toString())); // -> Just('100')

map(Nothing<string>(), (s) => s.length); // -> Nothing
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

If you log a union value to console you will see a plain object.

```typescript
console.log(PaymentMethod.Check(15566909));
// {k:'Check', p0:15566909, p1: undefined, p2: undefined, a: 1}
```

This is because union values are objects under the hood. The `k` element is the key, `p0` - `p1` are passed in parameters and `a` is the number of parameters. I decided not to expose that through typings but I might reconsider that in the future. You **cannot** use it for redux actions, however you can **safely use it for redux state**.

Note that in version 2.0 it was a tuple. But [benchmarks](https://github.com/twop/ts-union/tree/master/benchmarks) showed that object are more efficient (I have no idea why arrays cannot be jitted efficiently). You can find more details below

### API

Use `Union` constructor to define the type

```typescript
import { Union, of } from 'ts-union';

const U = Union({
  Simple: of(), // or of<void>(). no payload.
  SuperSimple: of(null), // static union value with no payload
  One: of<string>(), // one argument
  Const: of(3), // one constant argument that is baked in
  Two: of<string, number>(), // two arguments
  Three: of<string, number, boolean>(), // three
});

// generic version
const Option = Union((t) => ({
  None: of(null),
  Some: of(t), // Note: t is a value of the special type Generic
}));

// for static variant values you still have to provide a type
// because it needs to "remember" the type.
// Thus a function call, but it will always return the same object
const opt = Option.None<string>();

// But here type is inferred as number
const opt2 = Option.Some(5);
```

Let's take a closer look at `of` function

```typescript
export interface Types {
  (unit: null): Of<[Unit]>;
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
const Maybe = Union((t) => ({ Nothing: of(), Just: of(t) }));
type MaybeVal<T> = GenericValType<T, typeof Maybe.T>;
```

That's the whole API.

### Benchmarks

You can find a more details [here](https://github.com/twop/ts-union/tree/master/benchmarks). Both `unionize` and `ts-union` are 1.2x -2x (ish?) times slower than handwritten discriminated unions: aka `{tag: 'num', n: number} | {tag: 'str', s: string}`. But the good news is that you don't have to write the boilerplate yourself, _and_ it is still blazing fast!

### Breaking changes from 2.1.1 -> 2.2.0

There should be no public breaking changes, but I changed the underlying data structure (again!? and again!?) to be `{k: string, p0: any, p1: any, p2: any, a: number}`, where k is a case name like `"CreditCard"`, `p0`-`p2` passed in parameters and `a` is how many parameters were passed in. So if you stored the values somewhere (localStorage?) then please migrate accordingly.

```ts
const oldShape = { k: 'CreditCard', p: ['Visa', '1111-566-...'] };
const newShape = {
  k: 'CreditCard',
  p0: 'Visa',
  p1: '1111-566-...',
  p2: undefined,
  a: 2,
};
```

motivation for this is potential perf wins avoiding dealing with `(...args) => {...}`. The current approach should be more friendly for JIT compilers (arguments and ...args are hard to optimize). That kinda aligns with my local perf results:

old shape

```
Creation
    baseline: 8.39 ms
    unionize: 17.32 ms
    ts-union: 11.10 ms

Matching with inline object
    baseline: 1.97 ms
    unionize: 5.96 ms
    ts-union: 7.32 ms

Matching with preallocated function
    baseline: 2.20 ms
    unionize: 4.21 ms
    ts-union: 4.52 ms

Mapping
    baseline: 2.02 ms
    unionize: 2.98 ms
    ts-union: 1.69 ms
```

new shape

```
Creation
    baseline: 6.90 ms
    unionize: 15.62 ms
    ts-union: 6.38 ms

Matching with inline object
    baseline: 2.33 ms
    unionize: 6.26 ms
    ts-union: 5.19 ms

Matching with preallocated function
    baseline: 1.67 ms
    unionize: 4.44 ms
    ts-union: 3.88 ms

Mapping
    baseline: 1.96 ms
    unionize: 2.93 ms
    ts-union: 1.39 ms
```

### Breaking changes from 2.0.1 -> 2.1

There should be no public breaking changes, but I changed the underlying data structure (again!?) to be `{k: string, p: any[]}`, where k is a case name like `"CreditCard"` and p is a payload array. So if you stored the values somewhere (localStorage?) then please migrate accordingly.

The motivation for it that I finally tried to benchmark the performance of the library. Arrays were 1.5x - 2x slower than plain objects :(

```ts
const oldShape = ['CreditCard', ['Visa', '1111-566-...']];

// and yes this is faster. Blame V8.
const newShape = { k: 'CreditCard', p: ['Visa', '1111-566-...'] };
```

### Breaking changes from 1.2 -> 2.0

There should be no breaking changes, but I completely rewrote the types that drive public api. So if you for some reasons used them pls look into d.ts file for a replacement.

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
