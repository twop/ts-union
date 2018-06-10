// tslint:disable:no-expression-statement
import { test } from 'ava';
import { of, Union } from './index';

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
