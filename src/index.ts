export interface Const<T> {
  readonly _const: T;
}

interface Generic {
  opaque: 'TemplateToken';
}

export type Case<T> = Of<T> | Const<T> | Generic;

export interface RecordDict {
  readonly [key: string]: Case<unknown>;
}

export type ForbidReservedProps = {
  readonly if?: never;
  readonly match?: never;
  readonly T?: never;
} & ForbidDefault;

interface Of<T> {
  _opaque: T;
}

export interface Types {
  <T = void>(): T extends void ? Of<[]> : Of<[T]>;
  <T>(val: T): Const<T>;
  <T1, T2>(): Of<[T1, T2]>;
  <T1, T2, T3>(): Of<[T1, T2, T3]>;
}

export const of: Types = ((val: any) => val) as any;
// export const of2: Types2 = ((val: any) => val) as any;

// // export const of_

export interface OpaqueUnion<Record> {
  readonly _opaqueToken: Record;
}

export type Constructors<Record> = {
  [T in keyof Record]: CreatorFunc<Record[T], OpaqueUnion<Record>>
};

// export type Cases<Record, Result> = {
//   [T in keyof Record]: MatchCaseFunc<Record[T], Result>
// };

export type CasesT<Record, Result, T1 = void> = {
  [K in keyof Record]: MatchCaseFuncT<Record[K], Result, T1>
};

export interface OpaqueUnionT<Record, T1> {
  readonly _opaqueToken: Record;
  readonly template: T1;
}

export type UnionVal<Record, T1> = T1 extends void
  ? OpaqueUnion<Record>
  : OpaqueUnionT<Record, T1>;

export type GenericUnionVal<Type, Val> = Val extends OpaqueUnion<infer Rec>
  ? UnionVal<Rec, Type>
  : Val extends OpaqueUnionT<infer Rec, unknown> ? UnionVal<Rec, Type> : never;

export type ConstructorsT<Record> = {
  [K in keyof Record]: CreatorFuncT<Record[K], Record>
};

export type CreatorFuncT<K, Record> = K extends Of<infer A>
  ? A extends any[] ? <T = never>(...p: A) => UnionVal<Record, T> : never
  : K extends Generic
    ? <T>(val: T) => UnionVal<Record, T>
    : K extends Const<unknown> ? <T = never>() => UnionVal<Record, T> : never;

// const a: UnionType<typeof bla, number>;

// const cases: CasesT<typeof bla, number, boolean> = {
//   a: s => s.length,
//   b: b => (b ? 1 : 0)
// };

// const ctrs: ConstructorsT<typeof bla> = undefined as any;
// const r1 = ctrs.a<string>('a');
// const r2 = ctrs.b(5);

type MatchCaseFuncT<K, Res, P> = K extends Of<infer A>
  ? A extends any[] ? (...p: A) => Res : never
  : K extends Generic
    ? (val: P) => Res
    : K extends Const<infer C> ? (c: C) => Res : never;

type ForbidDefault = {
  default?: never;
};

type MatchCases<Record, Result, T> =
  | CasesT<Record, Result, T> & ForbidDefault
  | Partial<CasesT<Record, Result, T>> & {
      readonly default: (val: UnionVal<Record, T>) => Result;
    };

type CreatorFunc<K, R> = K extends Of<infer A>
  ? A extends any[] ? (...p: A) => R : never
  : K extends Const<unknown> ? () => R : never;

// type Bla = string | number;
// const t = of<Bla>();

// const f: CreatorFunc<typeof t, boolean> = undefined as any;
// f('a');

// export type MatchCaseFunc<K, R> = K extends Of<infer A>
//   ? A extends any[] ? (...p: A) => R : never
//   : K extends Const<infer C> ? (c: C) => R : never;

interface MatchFunc<Record> {
  <Result, T = void>(cases: MatchCases<Record, Result, T>): (
    val: UnionVal<Record, T>
  ) => Result;
  <Result, T = void>(
    val: UnionVal<Record, T>,
    cases: MatchCases<Record, Result, T>
  ): Result;
}

type UnpackFunc<K, Rec> = K extends Of<infer A>
  ? A extends any[]
    ? {
        <R, T = void>(val: UnionVal<Rec, T>, f: (...p: A) => R): R | undefined;
        <R, T = void>(
          val: UnionVal<Rec, T>,
          f: (...p: A) => R,
          els: (v: UnionVal<Rec, T>) => R
        ): R;
      }
    : never
  : K extends Generic
    ? {
        <R, T = void>(val: UnionVal<Rec, T>, f: (val: T) => R): R | undefined;
        <R, T = void>(
          val: UnionVal<Rec, T>,
          f: (val: T) => R,
          els: (v: UnionVal<Rec, T>) => R
        ): R;
      }
    : K extends Const<infer С>
      ? {
          <R, T = void>(val: UnionVal<Rec, T>, f: (с: С) => R): R | undefined;
          <R, T = void>(
            val: UnionVal<Rec, T>,
            f: (с: С) => R,
            els: (v: UnionVal<Rec, T>) => R
          ): R;
        }
      : never;

type Unpack<Record> = { [K in keyof Record]: UnpackFunc<Record[K], Record> };

export type UnionObj<Record, T1 = void> = {
  match: MatchFunc<Record>;
  if: Unpack<Record>;
  T: UnionVal<Record, void>;
} & (T1 extends void ? Constructors<Record> : ConstructorsT<Record>);

export const extend = <U, Funcs>(
  union: U,
  funcs: (u: U) => Funcs
): U extends UnionObj<infer _Rec, infer _Generic> ? U & Funcs : never => ({
  ...(union as any),
  ...(funcs as any)
});

export const GenericUnion = <Record extends RecordDict & ForbidReservedProps>(
  ctor: (t1: Generic) => Record
) =>
  (Union<Record>(ctor((undefined as any) as Generic)) as any) as UnionObj<
    Record,
    'Generic'
  >;

export function Union<Record extends RecordDict & ForbidReservedProps>(
  record: Record
): UnionObj<Record> {
  // tslint:disable-next-line:prefer-object-spread
  return (Object.assign(
    { if: createUnpack(record), match: createMatch() },
    createContructors(record)
  ) as any) as UnionObj<Record>;
}

function createContructors<Record extends RecordDict>(
  rec: Record
): Constructors<Record> {
  const result: Partial<Constructors<Record>> = {};
  // tslint:disable-next-line:forin
  for (const key in rec) {
    result[key] = createCtor(key, rec);
  }
  return result as Constructors<Record>;
}

function createCtor<K extends keyof Record, Record extends RecordDict>(
  key: K,
  rec: Record
): CreatorFunc<Record[K], OpaqueUnion<Record>> {
  const val: Case<unknown> = rec[key];
  // tslint:disable-next-line:no-if-statement
  if (val !== undefined) {
    const res: ReadonlyArray<any> = [key, [val]];
    return ((() => res) as any) as any;
  }

  return ((...args: any[]) => [key, args]) as any;
}

function createUnpack<Record extends RecordDict>(rec: Record): Unpack<Record> {
  const result: Partial<Unpack<Record>> = {};
  // tslint:disable-next-line:forin
  for (const key in rec) {
    result[key] = createUnpackFunc(key, rec);
  }
  return result as Unpack<Record>;
}

function createUnpackFunc<K extends keyof Record, Record extends RecordDict>(
  key: K,
  // tslint:disable-next-line:variable-name
  _rec: Record
): UnpackFunc<Record[K], Record> {
  return ((val: any, f: (...args: any[]) => any, els?: (v: any) => any) =>
    val[0] === key ? f(...val[1]) : els && els(val)) as any;
}

function createMatch<Record extends RecordDict>(): MatchFunc<Record> {
  const evalMatch = (
    val: any,
    cases: MatchCases<Record, unknown, unknown>
  ): any => {
    // first elem is always the key
    const handler = cases[val[0]] as any;
    return handler ? handler(...val[1]) : cases.default && cases.default(val);
  };

  return ((a: any, b?: any) =>
    b ? evalMatch(a, b) : (val: any) => evalMatch(val, a)) as MatchFunc<Record>;
}
