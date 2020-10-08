// tslint:disable:no-expression-statement
// tslint:disable-next-line:no-implicit-dependencies
import { GenericValType, of, Union } from './index';

import test from 'ava';

// tslint:disable-next-line:no-object-literal-type-assertion
const U = Union({
  Simple: of<void>(),
  SuperSimple: of(null),
  One: of<string>(),
  Const: of(3),
  Two: of<string, number>(),
  Three: of<string, number, boolean>(),
});

const { SuperSimple, Simple, One, Two, Three, Const } = U;

test('unpacks simple', t => {
  const s = Simple();
  const c = Const();

  t.is(
    U.if.Simple(s, () => 4),
    4
  );

  t.is(
    U.if.Simple(c, () => 4),
    undefined
  );

  t.is(
    U.if.Simple(
      c,
      () => 4,
      () => 1
    ),
    1
  );
});

test('unpacks const', t => {
  const si = Simple();
  const c = Const();
  t.is(
    U.if.Const(c, n => n),
    3
  );
  t.is(
    U.if.Const(
      si,
      n => n,
      () => 1
    ),
    1
  );
  t.is(
    U.if.Const(si, n => n),
    undefined
  );
});

test('else case accepts the original object', t => {
  const simple = Simple();
  t.is(
    U.if.Const(
      simple,
      _ => Simple(),
      v => v
    ),
    simple
  );
});

test('unpacks one arg', t => {
  const one = One('one');
  const c = Const();
  t.is(
    U.if.One(one, s => s),
    'one'
  );
  t.is(
    U.if.One(
      c,
      s => s,
      _ => 'els'
    ),
    'els'
  );
  t.is(
    U.if.One(c, s => s),
    undefined
  );
});

test('unpacks two args', t => {
  const f = (s: string, n: number) => s + n.toString();
  const two = Two('two', 1);
  const c = Const();
  t.is(U.if.Two(two, f), 'two1');
  t.is(
    U.if.Two(c, f, () => 'els'),
    'els'
  );
  t.is(U.if.Two(c, f), undefined);
});

test('unpacks three args', t => {
  const f = (s: string, n: number, b: boolean) => s + n.toString() + (b ? 'true' : 'false');
  const three = Three('three', 1, true);
  const c = Const();
  t.is(U.if.Three(three, f), 'three1true');
  t.is(
    U.if.Three(c, f, () => 'els'),
    'els'
  );
  t.is(U.if.Three(c, f), undefined);
});

const throwErr = (): never => {
  throw new Error('shouldnt happen');
};

test('switch simple case', t => {
  t.is(
    U.match(Simple(), {
      Simple: () => 'simple',
      default: throwErr,
    }),
    'simple'
  );
});

test('switch const case', t => {
  t.is(
    U.match(Const(), {
      Const: n => n,
      default: throwErr,
    }),
    3
  );
});

test('switch one case', t => {
  t.is(
    U.match(One('one'), {
      One: s => s,
      default: throwErr,
    }),
    'one'
  );
});

test('switch two case', t => {
  t.is(
    U.match(Two('two', 2), {
      Two: (s, n) => s + n.toString(),
      default: throwErr,
    }),
    'two2'
  );
});

test('switch three case', t => {
  t.is(
    U.match(Three('three', 1, true), {
      Three: (s, n, b) => s + n.toString() + (b ? 'true' : 'false'),
      default: throwErr,
    }),
    'three1true'
  );
});

test('switch deferred eval', t => {
  const evalFunc = U.match({
    Simple: () => 'simple',
    SuperSimple: () => 'super simple',
    Const: n => n.toString(),
    One: s => s,
    Three: (s, n, b) => s + n.toString() + (b ? 'true' : 'false'),
    Two: (s, n) => s + n.toString(),
  });

  t.is(evalFunc(Simple()), 'simple');
  t.is(evalFunc(SuperSimple), 'super simple');
  t.is(evalFunc(Const()), '3');
  t.is(evalFunc(One('one')), 'one');
  t.is(evalFunc(Two('two', 2)), 'two2');
  t.is(evalFunc(Three('three', 3, true)), 'three3true');
});

test('switch default case', t => {
  const three = Three('three', 3, true);
  const two = Two('two', 2);
  const one = One('one');
  const si = Simple();
  const co = Const();

  const val = 'def';
  const justDef = U.match({ default: _ => val });

  t.is(justDef(si), val);
  t.is(justDef(co), val);
  t.is(justDef(one), val);
  t.is(justDef(two), val);
  t.is(justDef(three), val);

  t.is(U.match(si, { default: _ => val }), val);
  t.is(U.match(co, { default: _ => val }), val);
  t.is(U.match(one, { default: _ => val }), val);
  t.is(U.match(two, { default: _ => val }), val);
  t.is(U.match(three, { default: _ => val }), val);
});

const Maybe = Union(a => ({
  Nothing: of(null),
  Just: of(a),
}));

const { Nothing, Just } = Maybe;

test('generic match', t => {
  const shouldBeTwo = Maybe.match(Just(1), {
    Just: n => n + 1,
    default: throwErr,
  });

  t.is(shouldBeTwo, 2);

  const numToStr = Maybe.match({
    Just: (n: number) => n.toString(),
    Nothing: () => 'nothing',
  });

  t.is(numToStr(Just(1)), '1');
  t.is(numToStr(Nothing<number>()), 'nothing');

  const strLen = Maybe.match<number, string>({
    Just: s => s.length,
    Nothing: () => -1,
  });

  t.is(strLen(Just('a')), 1);
  t.is(strLen(Nothing<string>()), -1);
});

test('generic if', t => {
  const one = Just(1);
  const nothing = Nothing<number>();

  t.is(
    Maybe.if.Just(one, n => n + 1),
    2
  );
  t.is(
    Maybe.if.Just(nothing, n => n),
    undefined
  );
  t.is(
    Maybe.if.Nothing(nothing, () => 1),
    1
  );
});

test('if can write a generic func like map or bind', t => {
  type MaybeVal<T> = GenericValType<T, typeof Maybe.T>;

  const map = <A, B>(val: MaybeVal<A>, f: (a: A) => B) =>
    Maybe.if.Just(
      val,
      v => Just(f(v)),
      n => (n as unknown) as MaybeVal<B>
    );

  const maybeOne = map(Just('a'), s => s.length);

  t.is(
    Maybe.if.Just(maybeOne, n => n + 1),
    2
  );

  const bind = <A, B>(val: MaybeVal<A>, f: (a: A) => MaybeVal<B>) =>
    Maybe.if.Just(
      val,
      a => f(a),
      _ => Nothing<B>()
    );

  t.is(
    Maybe.if.Just(
      bind(Just(1), n => Just(n.toString())),
      s => s
    ),
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

test('we can have boolean and union values for cases', t => {
  // related to https://github.com/Microsoft/TypeScript/issues/7294

  const T = Union({
    Bool: of<boolean>(),
    StrOrNum: of<string | number>(),
    Enum: of<'yes' | 'no'>(),
    Void: of(null),
  });

  const toStr = T.match({
    Void: () => 'void',
    Bool: b => (b === true ? 'true' : b === false ? 'false' : throwErr()),
    Enum: s => s,
    StrOrNum: sn => (typeof sn === 'number' ? sn.toString() : sn),
  });

  t.is(toStr(T.Void), 'void');
  t.is(toStr(T.Bool(true)), 'true');
  t.is(toStr(T.Enum('yes')), 'yes');
  t.is(toStr(T.StrOrNum(1)), '1');
  t.is(toStr(T.StrOrNum('F* yeah!')), 'F* yeah!');

  t.is(
    T.if.Void(T.Void, () => 'void'),
    'void'
  );

  const G = Union(a => ({
    Val: of(a),
    Nope: of<'nope' | 100500>(),
  }));

  type Guess<A> = GenericValType<A, typeof G.T>;

  const valOr = <A>(val: Guess<A>, def: A) =>
    G.if.Val(
      val,
      v => v,
      () => def
    );

  const strOrNumVal = 'v' as string | number;

  t.is(valOr(G.Val(strOrNumVal), 4), 'v');

  t.is(valOr(G.Val(1), -1), 1);
  t.is(valOr(G.Val(1), -1), 1);
  t.is(valOr(G.Nope('nope'), -1), -1);
  t.is(valOr(G.Nope(100500), -1), -1);
});

test('shorthand for declaring cases momoizes the value in generics', t => {
  const G = Union(a => ({
    Val: of(a),
    Nope: of(null),
    Void: of<void>(),
  }));

  // not the same reference
  t.not(G.Val(1), G.Val(1));
  t.not(G.Void<boolean>(), G.Void<boolean>());

  // but 'of(null)' memoizes it
  t.is(G.Nope<boolean>(), G.Nope<boolean>());
});

test('it can correctly create matchWith function', t => {
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

    default: (prevState, _ev) => prevState,
  });

  const { ErrorHappened, DataFetched } = Ev;

  // declared cases
  t.deepEqual(transition(Loading, ErrorHappened('oops')), Err('oops'));
  t.deepEqual(transition(Loading, DataFetched(1)), Loaded(1));
  t.deepEqual(transition(Loaded(1), DataFetched(1)), Loaded(2));
  // fallback to default
  t.deepEqual(transition(Loaded(1), ErrorHappened('oops')), Loaded(1));
});
