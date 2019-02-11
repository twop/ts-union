// tslint:disable:no-expression-statement
// tslint:disable-next-line:no-implicit-dependencies
import { GenericValType, of, Union } from '../src/index';

// tslint:disable-next-line:no-object-literal-type-assertion
const U = Union({
  Simple: of<void>(),
  SuperSimple: of(null),
  One: of<string>(),
  Const: of(3),
  Two: of<string, number>(),
  Three: of<string, number, boolean>()
});

const { SuperSimple, Simple, One, Two, Three, Const } = U;

test('unpacks simple', () => {
  const s = Simple();
  const c = Const();

  expect(U.if.Simple(s, () => 4)).toBe(4);
  expect(U.if.Simple(c, () => 4)).toBe(undefined);
  expect(U.if.Simple(c, () => 4, () => 1)).toBe(1);
});

test('unpacks const', () => {
  const si = Simple();
  const c = Const();
  expect(U.if.Const(c, n => n)).toBe(3);
  expect(U.if.Const(si, n => n, () => 1)).toBe(1);
  expect(U.if.Const(si, n => n)).toBe(undefined);
});

test('else case accepts the original object', () => {
  const simple = Simple();
  expect(U.if.Const(simple, _ => Simple(), v => v)).toBe(simple);
});

test('unpacks one arg', () => {
  const one = One('one');
  const c = Const();
  expect(U.if.One(one, s => s)).toBe('one');
  expect(U.if.One(c, s => s, _ => 'els')).toBe('els');
  expect(U.if.One(c, s => s)).toBe(undefined);
});

test('unpacks two args', () => {
  const f = (s: string, n: number) => s + n.toString();
  const two = Two('two', 1);
  const c = Const();
  expect(U.if.Two(two, f)).toBe('two1');
  expect(U.if.Two(c, f, () => 'els')).toBe('els');
  expect(U.if.Two(c, f)).toBe(undefined);
});

test('unpacks three args', () => {
  const f = (s: string, n: number, b: boolean) =>
    s + n.toString() + (b ? 'true' : 'false');
  const three = Three('three', 1, true);
  const c = Const();
  expect(U.if.Three(three, f)).toBe('three1true');
  expect(U.if.Three(c, f, () => 'els')).toBe('els');
  expect(U.if.Three(c, f)).toBe(undefined);
});

const throwErr = (): never => {
  throw new Error('shouldnt happen');
};

test('switch simple case', () => {
  expect(
    U.match(Simple(), {
      Simple: () => 'simple',
      default: throwErr
    })
  ).toBe('simple');
});

test('switch const case', () => {
  expect(
    U.match(Const(), {
      Const: n => n,
      default: throwErr
    })
  ).toBe(3);
});

test('switch one case', () => {
  expect(
    U.match(One('one'), {
      One: s => s,
      default: throwErr
    })
  ).toBe('one');
});

test('switch two case', () => {
  expect(
    U.match(Two('two', 2), {
      Two: (s, n) => s + n.toString(),
      default: throwErr
    })
  ).toBe('two2');
});

test('switch three case', () => {
  expect(
    U.match(Three('three', 1, true), {
      Three: (s, n, b) => s + n.toString() + (b ? 'true' : 'false'),
      default: throwErr
    })
  ).toBe('three1true');
});

test('switch deferred eval', () => {
  const evalFunc = U.match({
    Simple: () => 'simple',
    SuperSimple: () => 'super simple',
    Const: n => n.toString(),
    One: s => s,
    Three: (s, n, b) => s + n.toString() + (b ? 'true' : 'false'),
    Two: (s, n) => s + n.toString()
  });

  expect(evalFunc(Simple())).toBe('simple');
  expect(evalFunc(SuperSimple)).toBe('super simple');
  expect(evalFunc(Const())).toBe('3');
  expect(evalFunc(One('one'))).toBe('one');
  expect(evalFunc(Two('two', 2))).toBe('two2');
  expect(evalFunc(Three('three', 3, true))).toBe('three3true');
});

test('switch default case', () => {
  const three = Three('three', 3, true);
  const two = Two('two', 2);
  const one = One('one');
  const si = Simple();
  const co = Const();

  const val = 'def';
  const justDef = U.match({ default: _ => val });

  expect(justDef(si)).toBe(val);
  expect(justDef(co)).toBe(val);
  expect(justDef(one)).toBe(val);
  expect(justDef(two)).toBe(val);
  expect(justDef(three)).toBe(val);

  expect(U.match(si, { default: _ => val })).toBe(val);
  expect(U.match(co, { default: _ => val })).toBe(val);
  expect(U.match(one, { default: _ => val })).toBe(val);
  expect(U.match(two, { default: _ => val })).toBe(val);
  expect(U.match(three, { default: _ => val })).toBe(val);
});

const Maybe = Union(a => ({
  Nothing: of(null),
  Just: of(a)
}));

const { Nothing, Just } = Maybe;

test('generic match', () => {
  const shouldBeTwo = Maybe.match(Just(1), {
    Just: n => n + 1,
    default: throwErr
  });

  expect(shouldBeTwo).toBe(2);

  const numToStr = Maybe.match({
    Just: (n: number) => n.toString(),
    Nothing: () => 'nothing'
  });

  expect(numToStr(Just(1))).toBe('1');
  expect(numToStr(Nothing<number>())).toBe('nothing');

  const strLen = Maybe.match<number, string>({
    Just: s => s.length,
    Nothing: () => -1
  });

  expect(strLen(Just('a'))).toBe(1);
  expect(strLen(Nothing<string>())).toBe(-1);
});

test('generic if', () => {
  const one = Just(1);
  const nothing = Nothing<number>();

  expect(Maybe.if.Just(one, n => n + 1)).toBe(2);
  expect(Maybe.if.Just(nothing, n => n)).toBe(undefined);
  expect(Maybe.if.Nothing(nothing, () => 1)).toBe(1);
});

test('if can write a generic func like map or bind', () => {
  type MaybeVal<T> = GenericValType<T, typeof Maybe.T>;

  const map = <A, B>(val: MaybeVal<A>, f: (a: A) => B) =>
    Maybe.if.Just(val, v => Just(f(v)), n => (n as unknown) as MaybeVal<B>);

  const maybeOne = map(Just('a'), s => s.length);

  expect(Maybe.if.Just(maybeOne, n => n + 1)).toBe(2);

  const bind = <A, B>(val: MaybeVal<A>, f: (a: A) => MaybeVal<B>) =>
    Maybe.if.Just(val, a => f(a), _ => Nothing<B>());

  expect(Maybe.if.Just(bind(Just(1), n => Just(n.toString())), s => s)).toBe(
    '1'
  );
});

// Used for Readme.md example
// const ReqResult = Union(TPayload => ({
//   Pending: of<void>(),
//   Ok: TPayload,
//   Err: of<string | Error>()
// }));

// const res = ReqResult.Ok('this is awesome!');

// const toStr = ReqResult.match(res, {
//   Pending: () => 'Thinking...',
//   Err: err =>
//     typeof err === 'string' ? `Oops ${err}` : `Exception ${err.message}`,
//   Ok: str => `Ok, ${str}`
// });

test('we can have boolean and union values for cases', () => {
  // related to https://github.com/Microsoft/TypeScript/issues/7294

  const T = Union({
    Bool: of<boolean>(),
    StrOrNum: of<string | number>(),
    Enum: of<'yes' | 'no'>(),
    Void: of(null)
  });

  const toStr = T.match({
    Void: () => 'void',
    Bool: b => (b === true ? 'true' : b === false ? 'false' : throwErr()),
    Enum: s => s,
    StrOrNum: sn => (typeof sn === 'number' ? sn.toString() : sn)
  });

  expect(toStr(T.Void)).toBe('void');
  expect(toStr(T.Bool(true))).toBe('true');
  expect(toStr(T.Enum('yes'))).toBe('yes');
  expect(toStr(T.StrOrNum(1))).toBe('1');
  expect(toStr(T.StrOrNum('F* yeah!'))).toBe('F* yeah!');

  expect(T.if.Void(T.Void, () => 'void')).toBe('void');

  const G = Union(a => ({
    Val: of(a),
    Nope: of<'nope' | 100500>()
  }));

  type Guess<A> = GenericValType<A, typeof G.T>;

  const valOr = <A>(val: Guess<A>, def: A) => G.if.Val(val, v => v, () => def);

  const strOrNumVal = 'v' as string | number;

  expect(valOr(G.Val(strOrNumVal), 4)).toBe('v');

  expect(valOr(G.Val(1), -1)).toBe(1);
  expect(valOr(G.Val(1), -1)).toBe(1);
  expect(valOr(G.Nope('nope'), -1)).toBe(-1);
  expect(valOr(G.Nope(100500), -1)).toBe(-1);
});

test('shorthand for declaring cases momoizes the value in generics', () => {
  const G = Union(a => ({
    Val: of(a),
    Nope: of(null),
    Void: of<void>()
  }));

  // not the same reference
  expect(G.Val(1)).not.toBe(G.Val(1));
  expect(G.Void<boolean>()).not.toBe(G.Void<boolean>());

  // but 'of' memoizes it
  expect(G.Nope<boolean>()).toBe(G.Nope<boolean>());
});
