export interface Const<T> {
  readonly _const: T;
}

interface Generic {
  opaque: 'GenericToken';
}

type Case<T> = Of<T> | Const<T> | Generic;

interface RecordDict {
  readonly [key: string]: Case<unknown>;
}

type ForbidDefault = {
  default?: never;
};

type ForbidReservedProps = {
  readonly if?: never;
  readonly match?: never;
  readonly T?: never;
} & ForbidDefault;

type RequiredRecordType = RecordDict & ForbidReservedProps;

interface Of<T> {
  _opaque: T;
}

interface Types {
  <T = void>(): Of<[T]>;
  <T>(val: T): Const<T>;
  <T1, T2>(): Of<[T1, T2]>;
  <T1, T2, T3>(): Of<[T1, T2, T3]>;
}

const of: Types = ((val: any) => val) as any;

// --------------------------------------------------------
interface UnionVal<Record> {
  readonly _opaqueToken: Record;
}
interface UnionValG<P, Record> {
  readonly _opaqueToken: Record;
  readonly _type: P;
}

type GenericValType<Type, Val> = Val extends UnionValG<infer _Type, infer Rec>
  ? UnionValG<Type, Rec>
  : never;

// --------------------------------------------------------
type Constructors<Record> = {
  [T in keyof Record]: CreatorFunc<Record[T], UnionVal<Record>>
};

type ConstructorsG<Record> = {
  [K in keyof Record]: CreatorFuncG<Record[K], Record>
};

// --------------------------------------------------------
export type Cases<Record, Result> = {
  [T in keyof Record]: MatchCaseFunc<Record[T], Result>
};

type CasesG<Record, Result, P> = {
  [K in keyof Record]: MatchCaseFuncG<Record[K], Result, P>
};

// --------------------------------------------------------
type CreatorFunc<K, UVal> = K extends Of<infer A>
  ? A extends [void] ? () => UVal : A extends any[] ? (...p: A) => UVal : never
  : K extends Const<unknown> ? () => UVal : never;

type CreatorFuncG<K, Rec> = K extends Of<infer A>
  ? A extends [void]
    ? <P = never>() => UnionValG<P, Rec>
    : A extends any[] ? <P = never>(...p: A) => UnionValG<P, Rec> : never
  : K extends Generic
    ? <P>(val: P) => UnionValG<P, Rec>
    : K extends Const<unknown> ? <P = never>() => UnionValG<P, Rec> : never;

// --------------------------------------------------------
type MatchCaseFunc<K, Res> = K extends Of<infer A>
  ? A extends [void] ? () => Res : A extends any[] ? (...p: A) => Res : never
  : K extends Const<infer C> ? (c: C) => Res : never;

type MatchCaseFuncG<K, Res, P> = K extends Of<infer A>
  ? A extends [void] ? () => Res : A extends any[] ? (...p: A) => Res : never
  : K extends Generic
    ? (val: P) => Res
    : K extends Const<infer C> ? (c: C) => Res : never;

// --------------------------------------------------------
type MatchCases<Record, Result> =
  | Cases<Record, Result> & ForbidDefault
  | Partial<Cases<Record, Result>> & {
      default: (val: UnionVal<Record>) => Result;
    };

type MatchCasesG<Rec, Result, P> =
  | CasesG<Rec, Result, P> & ForbidDefault
  | Partial<CasesG<Rec, Result, P>> & {
      default: (val: UnionValG<P, Rec>) => Result;
    };

// --------------------------------------------------------
interface MatchFunc<Record> {
  <Result>(cases: MatchCases<Record, Result>): (
    val: UnionVal<Record>
  ) => Result;
  <Result>(val: UnionVal<Record>, cases: MatchCases<Record, Result>): Result;
}
interface MatchFuncG<Record> {
  <Result, P>(cases: MatchCasesG<Record, Result, P>): (
    val: UnionValG<P, Record>
  ) => Result;
  <Result, P>(
    val: UnionValG<P, Record>,
    cases: MatchCasesG<Record, Result, P>
  ): Result;
}

// --------------------------------------------------------
type UnpackFunc<K, Rec> = K extends Of<infer A>
  ? A extends [void]
    ? {
        <R>(val: UnionVal<Rec>, f: () => R): R | undefined;
        <R>(val: UnionVal<Rec>, f: () => R, els: (v: UnionVal<Rec>) => R): R;
      }
    : A extends any[]
      ? {
          <R>(val: UnionVal<Rec>, f: (...p: A) => R): R | undefined;
          <R>(
            val: UnionVal<Rec>,
            f: (...p: A) => R,
            els: (v: UnionVal<Rec>) => R
          ): R;
        }
      : never
  : K extends Const<infer С>
    ? {
        <R>(val: UnionVal<Rec>, f: (с: С) => R): R | undefined;
        <R>(
          val: UnionVal<Rec>,
          f: (с: С) => R,
          els: (v: UnionVal<Rec>) => R
        ): R;
      }
    : never;

type UnpackFuncG<K, Rec> = K extends Of<infer A>
  ? A extends [void]
    ? {
        <R, P>(val: UnionValG<P, Rec>, f: () => R): R | undefined;
        <R, P>(
          val: UnionValG<P, Rec>,
          f: () => R,
          els: (v: UnionValG<P, Rec>) => R
        ): R;
      }
    : A extends any[]
      ? {
          <R, P>(val: UnionValG<P, Rec>, f: (...p: A) => R): R | undefined;
          <R, P>(
            val: UnionValG<P, Rec>,
            f: (...p: A) => R,
            els: (v: UnionValG<P, Rec>) => R
          ): R;
        }
      : never
  : K extends Generic
    ? {
        <R, P>(val: UnionValG<P, Rec>, f: (val: P) => R): R | undefined;
        <R, P>(
          val: UnionValG<P, Rec>,
          f: (val: P) => R,
          els: (v: UnionValG<P, Rec>) => R
        ): R;
      }
    : K extends Const<infer С>
      ? {
          <R, P>(val: UnionValG<P, Rec>, f: (с: С) => R): R | undefined;
          <R, P>(
            val: UnionValG<P, Rec>,
            f: (с: С) => R,
            els: (v: UnionValG<P, Rec>) => R
          ): R;
        }
      : never;

// --------------------------------------------------------
type Unpack<Rec> = { [K in keyof Rec]: UnpackFunc<Rec[K], Rec> };
type UnpackG<Rec> = { [K in keyof Rec]: UnpackFuncG<Rec[K], Rec> };

// --------------------------------------------------------
type UnionObj<Rec> = {
  match: MatchFunc<Rec>;
  if: Unpack<Rec>;
  T: UnionVal<Rec>;
} & Constructors<Rec>;

type GenericUnionObj<Rec> = {
  match: MatchFuncG<Rec>;
  if: UnpackG<Rec>;
  T: UnionValG<unknown, Rec>;
} & ConstructorsG<Rec>;

// --------------------------------------------------------

interface UnionFunc {
  <R extends RequiredRecordType>(record: R): UnionObj<R>;
  <R extends RequiredRecordType>(ctor: (g: Generic) => R): GenericUnionObj<R>;
}

const Union: UnionFunc = <R extends RequiredRecordType>(
  recOrFunc: ((g: Generic) => R) | R
) => {
  const record =
    typeof recOrFunc === 'function'
      ? recOrFunc((undefined as unknown) as Generic)
      : recOrFunc;

  // tslint:disable-next-line:prefer-object-spread
  return Object.assign(
    { if: createUnpack(record), match },
    createContructors(record)
  ) as any;
};

const evalMatch = <Record extends RecordDict>(
  val: any,
  cases: MatchCases<Record, unknown>
): any => {
  // first elem is always the key
  const handler = cases[val[0]] as any;
  return handler ? handler(...val[1]) : cases.default && cases.default(val);
};

const match: MatchFunc<unknown> = (a: any, b?: any) =>
  b ? evalMatch(a, b) : (val: any) => evalMatch(val, a);

const createContructors = <Record extends RecordDict>(
  rec: Record
): Constructors<Record> => {
  const result: Partial<Constructors<Record>> = {};
  // tslint:disable-next-line:forin
  for (const key in rec) {
    result[key] = createCtor(key, rec);
  }
  return result as Constructors<Record>;
};

const createCtor = <K extends keyof Record, Record extends RecordDict>(
  key: K,
  rec: Record
): CreatorFunc<Record[K], UnionVal<Record>> => {
  const val: Case<unknown> = rec[key];
  // tslint:disable-next-line:no-if-statement
  if (val !== undefined) {
    const res: ReadonlyArray<any> = [key, [val]];
    return ((() => res) as any) as any;
  }

  return ((...args: any[]) => [key, args]) as any;
};

const createUnpack = <Record extends RecordDict>(
  rec: Record
): Unpack<Record> => {
  const result: Partial<Unpack<Record>> = {};
  // tslint:disable-next-line:forin
  for (const key in rec) {
    result[key] = createUnpackFunc(key);
  }
  return result as Unpack<Record>;
};

const createUnpackFunc = <K extends keyof Record, Record extends RecordDict>(
  key: K
): UnpackFunc<Record[K], Record> =>
  ((val: any, f: (...args: any[]) => any, els?: (v: any) => any) =>
    val[0] === key ? f(...val[1]) : els && els(val)) as any;

export {
  Union,
  of,
  UnionVal,
  UnionVal as OpaqueUnion, // backward compat
  UnionValG,
  GenericValType,
  UnionObj,
  GenericUnionObj
};
