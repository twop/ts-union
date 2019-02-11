# Just primitive benchmarks

Currently we compare three ADT approaches that provide similar functionality.

- ts-union (this library)
- [unionize](https://github.com/pelotom/unionize)
- baseline - manual approach via `{tag:'tag1'...}` powered by ts control flow analysis

```ts
// ts-union
const U = Union({
  Num: of<number>(),
  Str: of<string>(),
  None: of(null),
  Two: of<number, boolean>()
});

// unionize
const Un = unionize(
  {
    Num: ofType<number>(),
    Str: ofType<string>(),
    Two: ofType<{ n: number; b: boolean }>(),
    None: {}
  },
  { value: 'value' }
);

// baseline
type UB =
  | { tag: 'Num'; n: number }
  | { tag: 'Str'; s: string }
  | { tag: 'None' }
  | { tag: 'Two'; n: number; b: boolean };
```

There are 4 benchmark categories:

- Creation of a union value
- Match union value to produce a string via inline object
- Match union value to produce a string via cached functions
- Map `Num` union value to produce a 'Str' value out of it

If you just want to see the numbers then scroll to the bottom :)

## Creation

All of them need to provide constructors from a number. The idea is that we preallocate an array for all of them (to avoid any GC or array resizing), and then give an equal probability call one of constructors.

Note currently the number of elements is 2000000.

### baseline

```ts
const cachedNone: UB = { tag: 'None' };
const Num = (n: number): UB => ({ tag: 'Num', n });
const Str = (s: string): UB => ({ tag: 'Str', s });
const None = (): UB => cachedNone;
const Two = (n: number, b: boolean): UB => ({ tag: 'Two', n, b });

const cases = [
  Num,
  (i: number) => Str(i.toString()),
  (i: number) => Two(i, i % 2 === 0),
  () => None()
];
```

### unionize

```ts
const cases = [
  Un.Num,
  (i: number) => Un.Str(i.toString()),
  (i: number) => Un.Two({ n: i, b: i % 2 === 0 }),
  () => Un.None()
];
```

### ts-union

```ts
// almost identical to unionize
const cases = [
  U.Num,
  (i: number) => U.Str(i.toString()),
  (i: number) => U.Two(i, i % 2 === 0),
  () => U.None
];
```

## Matching with inline cases object

Both unionize ad ts-union provide an api to extract a value with an object that has match cases. In this benchmark we need to produce a string value out of a union object.

### baseline

There is no such concept for baseline. So there is going to be just a manual `switch` statement.

```ts
const baselineToString = (v: UB): string => {
  switch (v.tag) {
    case 'None':
      return 'none';
    case 'Num':
      return v.n.toString();
    case 'Str':
      return v.s;
    case 'Two':
      return v.n.toString() + v.b;
  }
};
```

### unionize

```ts
// note that the cases object is constructed with each call
const toStr = (v: UnT) =>
  Un.match(v, {
    Num: n => n.toString(),
    Str: s => s,
    None: () => 'none',
    Two: two => two.n.toString() + two.b
  });
```

### ts-union

```ts
// again, almost identical to unionize
const toStr = (v: UT) =>
  U.match(v, {
    Num: n => n.toString(),
    Str: s => s,
    None: () => 'none',
    Two: (n, b) => n.toString() + b
  });
```

## Matching with cached cases function

Both unionize ad ts-union allow to build a function out of cases object.

### baseline

No changes for baseline

### unionize

```ts
const toStr = Un.match({
  Num: n => n.toString(),
  Str: s => s,
  None: () => 'none',
  Two: two => two.n.toString() + two.b
});
```

### ts-union

```ts
const toStr = U.match({
  Num: n => n.toString(),
  Str: s => s,
  None: () => 'none',
  Two: (n, b) => n.toString() + b
});
```

## Mapping

The goal of this benchmark is to identify a `Num` case and convert it to 'Str' case by simply calling `(n:number)=>n.toString()`

### baseline

```ts
const numToStr = (v: UB): UB => {
  if (v.tag === 'Num') {
    return Str(v.n.toString());
  }
  return v;
};
```

### unionize

```ts
// pretty cool transform api :)
const numToStr = Un.transform({ Num: n => Un.Str(n.toString()) });
```

### ts-union

```ts
// hoist cases handlers
const identity = <T>(t: T) => t;
const n2s = (n: number) => U.Str(n.toString());
const numToStr = (v: UT) => U.if.Num(v, n2s, identity);
```

## Results

The benchmarks are performed this way:

- run 50 times
- take 5 fastest
- return average of them

I have 6 cores I7 mac mini 2018 model.

```
Testing: 1000000 elements

Creation
    baseline: 50.18 ms
    unionize: 159.61 ms
    ts-union: 183.96 ms

Matching with inline object
    baseline: 58.30 ms
    unionize: 126.50 ms
    ts-union: 130.10 ms

Matching with preallocated function
    baseline: 57.37 ms
    unionize: 78.53 ms
    ts-union: 83.43 ms

Mapping
    baseline: 9.28 ms
    unionize: 21.52 ms
    ts-union: 11.78 ms
```

## Conclusion

Nothing beats handwritten switch case :) But both `unionize` and `ts-union` provided comparable performance with baseline when matching function is cached.

Note that I got different results all the time even with 50 attempts. So think about these numbers as a very rough approximation. In the real world usecases the functions might not be even considered as "hot". Thus, in my opinion the performance of these libraries is "good enough" to use them without thinking too much about it.
