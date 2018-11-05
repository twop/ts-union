// tslint:disable:no-expression-statement
import { test } from 'ava';
import { GenericUnion, GenericUnionVal, of, Union } from './index';

const U = Union({
  Simple: of<void>(),
  One: of<string>(),
  Const: of(3),
  Two: of<string, number>(),
  Three: of<string, number, boolean>()
});

const { Simple, One, Two, Three, Const } = U;

test('unpacks simple', t => {
  const s = Simple();
  const c = Const();

  t.is(U.if.Simple(s, () => 4), 4);
  t.is(U.if.Simple(c, () => 4), undefined);
  t.is(U.if.Simple(c, () => 4, () => 1), 1);
});

test('unpacks const', t => {
  const si = Simple();
  const c = Const();
  t.is(U.if.Const(c, n => n), 3);
  t.is(U.if.Const(si, n => n, () => 1), 1);
  t.is(U.if.Const(si, n => n), undefined);
});

test('else case accepts the original object', t => {
  const simple = Simple();
  t.is(U.if.Const(simple, _ => Simple(), v => v), simple);
});

test('unpacks one arg', t => {
  const one = One('one');
  const c = Const();
  t.is(U.if.One(one, s => s), 'one');
  t.is(U.if.One(c, s => s, _ => 'els'), 'els');
  t.is(U.if.One(c, s => s), undefined);
});

test('unpacks two args', t => {
  const f = (s: string, n: number) => s + n.toString();
  const two = Two('two', 1);
  const c = Const();
  t.is(U.if.Two(two, f), 'two1');
  t.is(U.if.Two(c, f, () => 'els'), 'els');
  t.is(U.if.Two(c, f), undefined);
});

test('unpacks three args', t => {
  const f = (s: string, n: number, b: boolean) =>
    s + n.toString() + (b ? 'true' : 'false');
  const three = Three('three', 1, true);
  const c = Const();
  t.is(U.if.Three(three, f), 'three1true');
  t.is(U.if.Three(c, f, () => 'els'), 'els');
  t.is(U.if.Three(c, f), undefined);
});

const throwErr = (): never => {
  throw new Error('shouldnt happen');
};

test('switch simple case', t => {
  t.is(
    U.match(Simple(), {
      Simple: () => 'simple',
      default: throwErr
    }),
    'simple'
  );
});

test('switch const case', t => {
  t.is(
    U.match(Const(), {
      Const: n => n,
      default: throwErr
    }),
    3
  );
});

test('switch one case', t => {
  t.is(
    U.match(One('one'), {
      One: s => s,
      default: throwErr
    }),
    'one'
  );
});

test('switch two case', t => {
  t.is(
    U.match(Two('two', 2), {
      Two: (s, n) => s + n.toString(),
      default: throwErr
    }),
    'two2'
  );
});

test('switch three case', t => {
  t.is(
    U.match(Three('three', 1, true), {
      Three: (s, n, b) => s + n.toString() + (b ? 'true' : 'false'),
      default: throwErr
    }),
    'three1true'
  );
});

test('switch deferred eval', t => {
  const evalFunc = U.match({
    Simple: () => 'simple',
    Const: n => n.toString(),
    One: s => s,
    Three: (s, n, b) => s + n.toString() + (b ? 'true' : 'false'),
    Two: (s, n) => s + n.toString()
  });

  t.is(evalFunc(Simple()), 'simple');
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

const Maybe = GenericUnion(T => ({
  Nothing: of<void>(),
  Just: T
}));

test('bla', t => {
  const { Nothing, Just } = Maybe;

  const num = Just(5);
  const str = Just('something');
  const nothing = Nothing<number>();

  const res = Maybe.if.Just(num, n => n + 1, () => 2);
  const res2 = Maybe.if.Just(str, n => n + 'aha!', () => ' oops');

  const r3 = Maybe.match(num, { Just: n => n + 1, Nothing: () => 2 });
  const r4 = Maybe.match<number, number>({
    Just: n => n + 1,
    Nothing: () => 2
  });

  const r5 = Maybe.match(nothing, {
    Just: n => n + 1,
    Nothing: () => 2
  });

  type MaybeVal<T> = GenericUnionVal<T, typeof Maybe.T>;

  // reverseCurry<MaybeVal<A>,(a: A) => B, MaybeVal<B> >(
  interface MapFunc {
    <A, B>(val: MaybeVal<A>, f: (a: A) => B): MaybeVal<B>;
    <A, B>(f: (a: A) => B): (val: MaybeVal<A>) => MaybeVal<B>;
  }
  const evalMap = <A, B>(val: MaybeVal<A>, f: (a: A) => B) =>
    Maybe.if.Just(val, v => Just(f(v)), n => (n as unknown) as MaybeVal<B>);

  const map = ((a: any, b?: any) =>
    (b ? evalMap(a, b) : (v: any) => evalMap(v, a)) as any) as MapFunc;
  //     return <A, B>(val: MaybeVal<A>) => evalMap(val, second as (a: A) => B);
  //   }
  //   return evalMap(first as MaybeVal<any>, second as (a: any) => any);
  // };

  // const curriedMap = reverseCurry(map);
  const bind = <A, B>(val: MaybeVal<A>, f: (a: A) => MaybeVal<B>) =>
    Maybe.if.Just(val, a => f(a), n => (n as unknown) as MaybeVal<B>);

  // const Maybe2 = extend(Maybe, ({ if: check, T }) => ({
  //   map: <A, B>(val: GenericUnionVal<A, typeof T>, f: (a: A) => B) =>
  //     check.Just(
  //       val,
  //       v => Just(f(v)),
  //       n => (n as unknown) as GenericUnionVal<B, typeof Maybe.T>
  //     )
  // }));

  const Maybe2 = { ...Maybe, map, bind };

  const just4 = Maybe2.Just(4);

  const r8 = Maybe2.bind(just4, n => Just(n.toString()));

  const r7 = Maybe.if.Just(just4, n => n + 1, () => 3);

  const r6 = Maybe2.map((n: number) => n.toString());
  r6(Just(2));
  // Maybe.match(val, { Nothing: () => Nothing<To>(), Just: v => Just(f(v)) });

  r4(num);
  // r4(str);
});
