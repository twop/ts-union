import { ofType, unionize } from 'unionize';
import { of, Union } from '../src/index';

const U = Union({
  Num: of<number>(),
  Str: of<string>(),
  None: of(null),
  Two: of<number, boolean>()
});

const Un = unionize(
  {
    Num: ofType<number>(),
    Str: ofType<string>(),
    Two: ofType<{ n: number; b: boolean }>(),
    None: {}
  },
  { value: 'value' }
);

type UB =
  | { tag: 'Num'; n: number }
  | { tag: 'Str'; s: string }
  | { tag: 'None' }
  | { tag: 'Two'; n: number; b: boolean };

const cachedNone: UB = { tag: 'None' };
const Num = (n: number): UB => ({ tag: 'Num', n });
const Str = (s: string): UB => ({ tag: 'Str', s });
const None = (): UB => cachedNone;
const Two = (n: number, b: boolean): UB => ({ tag: 'Two', n, b });

type UT = typeof U.T;
type UnT = typeof Un._Union;

type CreateCase<T> = (i: number) => T;
type Creation<T> = {
  name: string;
  cases: [CreateCase<T>, CreateCase<T>, CreateCase<T>, CreateCase<T>];
};

type Matching<T> = {
  name: string;
  toStr: (t: T) => string;
};

type Mapping<T> = {
  name: string;
  map: (t: T) => T;
};

type Scenario<T> = [Creation<T>, Matching<T>, Matching<T>, Mapping<T>];

const COUNT = 1000000;
const log = console.log;

const measure = (name: string, func: () => void) => {
  //log(`\n${' '.repeat(4)}${name}`);

  // let fastest = 100500;

  let runs: number[] = [];
  for (let i = 0; i < 50; i++) {
    const hrstart = process.hrtime();
    func();
    const hrend = process.hrtime(hrstart);

    const current = hrend[1] / 1000000;

    runs.push(current);

    // fastest = Math.min(fastest, current);
  }

  const result =
    runs
      .sort((a, b) => a - b)
      .slice(0, 5)
      .reduce((s, v) => s + v, 0) / 5;

  log(`${' '.repeat(4)}${name}: ${result.toFixed(2)} ms`);
};

const run = (scenarios: Scenario<any>[]) => {
  const results: string[] = Array.from({ length: COUNT }, () => '');
  const numbers: number[] = Array.from({ length: COUNT }, () => Math.random());

  const values = scenarios.map(_ =>
    Array.from({ length: COUNT }, () => ({} as any))
  );

  log(`Testing: ${COUNT} elements`);

  log(`\nCreation`);
  scenarios
    .map(s => s[0])
    .forEach(({ name, cases }, sIndex) =>
      measure(name, () => {
        for (let i = 0; i < COUNT; i++) {
          const seed = numbers[i];
          const index = seed < 0.25 ? 0 : seed < 0.5 ? 1 : seed < 0.75 ? 2 : 3;
          values[sIndex][i] = cases[index](i);
        }
      })
    );

  log(`\nMatching with inline object`);
  scenarios
    .map(s => s[1])
    .forEach(({ name, toStr }, sIndex) =>
      measure(name, () => {
        for (let i = 0; i < COUNT; i++) {
          results[i] = toStr(values[sIndex][i]);
        }
      })
    );

  log(`\nMatching with preallocated function`);
  scenarios
    .map(s => s[2])
    .forEach(({ name, toStr }, sIndex) =>
      measure(name, () => {
        for (let i = 0; i < COUNT; i++) {
          results[i] = toStr(values[sIndex][i]);
        }
      })
    );

  log(`\nMapping`);
  scenarios
    .map(s => s[3])
    .forEach(({ name, map }, sIndex) =>
      measure(name, () => {
        const curValues = values[sIndex];
        for (let i = 0; i < COUNT; i++) {
          curValues[i] = map(curValues[i]);
        }
      })
    );
};

const tsUnionName = 'ts-union';
const tsUnionScenario: Scenario<UT> = [
  {
    name: tsUnionName,
    cases: [
      U.Num,
      (i: number) => U.Str(i.toString()),
      (i: number) => U.Two(i, i % 2 === 0),
      () => U.None
    ]
  },
  {
    name: tsUnionName,
    toStr: v =>
      U.match(v, {
        Num: n => n.toString(),
        Str: s => s,
        None: () => 'none',
        Two: (n, b) => n.toString() + b
      })
  },
  {
    name: tsUnionName,
    toStr: U.match({
      Num: n => n.toString(),
      Str: s => s,
      None: () => 'none',
      Two: (n, b) => n.toString() + b
    })
  },
  {
    name: tsUnionName,
    map: (() => {
      const identity = <T>(t: T) => t;
      const numToStr = (n: number) => U.Str(n.toString());
      return (v: UT) => U.if.Num(v, numToStr, identity);
    })()
  }
];

const unionizeName = 'unionize';
const unionizeScenario: Scenario<UnT> = [
  {
    name: unionizeName,
    cases: [
      Un.Num,
      (i: number) => Un.Str(i.toString()),
      (i: number) => Un.Two({ n: i, b: i % 2 === 0 }),
      () => Un.None()
    ]
  },
  {
    name: unionizeName,
    toStr: v =>
      Un.match(v, {
        Num: n => n.toString(),
        Str: s => s,
        None: () => 'none',
        Two: two => two.n.toString() + two.b
      })
  },
  {
    name: unionizeName,
    toStr: Un.match({
      Num: n => n.toString(),
      Str: s => s,
      None: () => 'none',
      Two: ({ n, b }) => n.toString() + b
    })
  },
  {
    name: unionizeName,
    map: Un.transform({ Num: n => Un.Str(n.toString()) })
  }
];

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

const baselineName = 'baseline';
const baselineScenario: Scenario<UB> = [
  {
    name: baselineName,
    cases: [
      Num,
      (i: number) => Str(i.toString()),
      (i: number) => Two(i, i % 2 === 0),
      () => None()
    ]
  },
  {
    name: baselineName,
    toStr: baselineToString
  },
  {
    name: baselineName,
    toStr: baselineToString
  },
  {
    name: baselineName,
    map: (v: UB): UB => {
      if (v.tag === 'Num') {
        return Str(v.n.toString());
      }
      return v;
    }
  }
];

run([baselineScenario, unionizeScenario, tsUnionScenario]);
