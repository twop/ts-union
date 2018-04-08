export const enum CaseType {
  NoData = 0,
  Const = -1,
  One = 1,
  Two = 2,
  Three = 3
}

const noData: NoData = { tag: CaseType.NoData };
const one = { tag: CaseType.One };
const two = { tag: CaseType.Two };
const three = { tag: CaseType.Three };

export interface NoData {
  readonly tag: CaseType.NoData;
}
export interface Const<T> {
  readonly tag: CaseType.Const;
  readonly val: T;
}
export interface One<T> {
  readonly tag: CaseType.One;
  readonly _arg: T;
}
export interface Two<T1, T2> {
  readonly tag: CaseType.Two;
  readonly _arg1: T1;
  readonly _arg2: T2;
}
export interface Three<T1, T2, T3> {
  readonly tag: CaseType.Three;
  readonly _arg1: T1;
  readonly _arg2: T2;
  readonly _arg3: T3;
}

export type Case<T1, T2, T3> =
  | NoData
  | Const<T1>
  | One<T1>
  | Two<T1, T2>
  | Three<T1, T2, T3>;

export type RecordDict = {
  [key: string]: Case<any, any, any>;
};

export type ForbidReservedProps = {
  if?: never;
  match?: never;
  T?: never;
} & ForbidDefault;

export const simple = () => (noData as any) as NoData;
export const of = <T>() => (one as any) as One<T>;
export const ofConst = <T>(val: T): Const<T> => ({ tag: CaseType.Const, val });
export const of2 = <T1, T2>() => (two as any) as Two<T1, T2>;
export const of3 = <T1, T2, T3>() => (three as any) as Three<T1, T2, T3>;

export interface OpaqueUnion<Record> {
  readonly _opaqueToken: Record;
}

export type Constructors<Record> = {
  [T in keyof Record]: CreatorFunc<Record[T], OpaqueUnion<Record>>
};

export type Cases<Record, Result> = {
  [T in keyof Record]: MatchCaseFunc<Record[T], Result>
};

export type ForbidDefault = {
  readonly default?: never;
};

export type MatchCases<Record, Result> =
  | Cases<Record, Result> & ForbidDefault
  | Partial<Cases<Record, Result>> & {
      readonly default: (val: OpaqueUnion<Record>) => Result;
    };

export type CreatorFunc<T, R> = T extends NoData
  ? () => R
  : T extends One<infer A>
    ? (a: A) => R
    : T extends Const<infer A>
      ? () => R
      : T extends Two<infer A1, infer A2>
        ? (a1: A1, a2: A2) => R
        : T extends Three<infer A1, infer A2, infer A3>
          ? (a1: A1, a2: A2, a3: A3) => R
          : never;

export type MatchCaseFunc<T, R> = T extends NoData
  ? () => R
  : T extends One<infer A>
    ? (a: A) => R
    : T extends Const<infer A>
      ? (a: A) => R
      : T extends Two<infer A1, infer A2>
        ? (a1: A1, a2: A2) => R
        : T extends Three<infer A1, infer A2, infer A3>
          ? (a1: A1, a2: A2, a3: A3) => R
          : never;

export type MatchFunc<Record> = {
  <Result>(cases: MatchCases<Record, Result>): (
    val: OpaqueUnion<Record>
  ) => Result;
  <Result>(val: OpaqueUnion<Record>, cases: MatchCases<Record, Result>): Result;
};

export type UnpackFunc<T, Rec> = T extends NoData
  ? {
      <R>(val: OpaqueUnion<Rec>, f: () => R): R | undefined;
      <R>(val: OpaqueUnion<Rec>, f: () => R, els: () => R): R;
    }
  : T extends One<infer A>
    ? {
        <R>(val: OpaqueUnion<Rec>, f: (a: A) => R): R | undefined;
        <R>(val: OpaqueUnion<Rec>, f: (a: A) => R, els: () => R): R;
      }
    : T extends Const<infer A>
      ? {
          <R>(val: OpaqueUnion<Rec>, f: (a: A) => R): R | undefined;
          <R>(val: OpaqueUnion<Rec>, f: (a: A) => R, els: () => R): R;
        }
      : T extends Two<infer A1, infer A2>
        ? {
            <R>(val: OpaqueUnion<Rec>, f: (a1: A1, a2: A2) => R): R | undefined;
            <R>(
              val: OpaqueUnion<Rec>,
              f: (a1: A1, a2: A2) => R,
              els: () => R
            ): R;
          }
        : T extends Three<infer A1, infer A2, infer A3>
          ? {
              <R>(val: OpaqueUnion<Rec>, f: (a1: A1, a2: A2, a3: A3) => R):
                | R
                | undefined;
              <R>(
                val: OpaqueUnion<Rec>,
                f: (a1: A1, a2: A2, a3: A3) => R,
                els: () => R
              ): R;
            }
          : never;

export type Unpack<Record> = {
  [T in keyof Record]: UnpackFunc<Record[T], Record>
};

export type UnionObj<Record> = Constructors<Record> & {
  readonly match: MatchFunc<Record>;
  readonly if: Unpack<Record>;
  readonly T: OpaqueUnion<Record>;
};

export function Union<Record extends RecordDict & ForbidReservedProps>(
  record: Record
): UnionObj<Record> {
  return (Object.assign(
    { if: createUnpack(record), match: createMatch() },
    createContructors(record)
  ) as any) as UnionObj<Record>;
}

function createContructors<Record extends RecordDict>(
  rec: Record
): Constructors<Record> {
  const result: Partial<Constructors<Record>> = {};
  for (const key in rec) {
    result[key] = createCtor(key, rec);
  }
  return result as Constructors<Record>;
}

function createCtor<K extends keyof Record, Record extends RecordDict>(
  key: K,
  rec: Record
): CreatorFunc<Record[K], OpaqueUnion<Record>> {
  type Func = CreatorFunc<Record[K], OpaqueUnion<Record>>;
  const val: Case<any, any, any> = rec[key];

  switch (val.tag) {
    case CaseType.NoData: {
      const res = [key];
      return ((() => res) as any) as Func;
    }
    case CaseType.Const: {
      const res = [key, val.val];
      return ((() => res) as any) as Func;
    }
    case CaseType.One:
      return (((a: any) => [key, a]) as any) as Func;
    case CaseType.Two:
      return (((a: any, b: any) => [key, a, b]) as any) as Func;
    case CaseType.Three:
      return (((a: any, b: any, c: any) => [key, a, b, c]) as any) as Func;
  }
}

function createUnpack<Record extends RecordDict>(rec: Record): Unpack<Record> {
  const result: Partial<Unpack<Record>> = {};
  for (const key in rec) {
    result[key] = createUnpackFunc(key, rec);
  }
  return result as Unpack<Record>;
}

function createUnpackFunc<K extends keyof Record, Record extends RecordDict>(
  key: K,
  rec: Record
): UnpackFunc<Record[K], Record> {
  type Func = UnpackFunc<Record[K], Record>;
  const val: Case<any, any, any> = rec[key];

  switch (val.tag) {
    case CaseType.NoData: {
      return ((([k]: [K], f: () => any, els?: () => any) =>
        k === key ? f() : els && els()) as any) as Func;
    }
    case CaseType.Const: {
      return ((([k, c]: [K, any], f: (a: any) => any, els?: () => any) =>
        k === key ? f(c) : els && els()) as any) as Func;
    }
    case CaseType.One:
      return ((([k, a]: [K, any], f: (a: any) => any, els?: () => any) =>
        k === key ? f(a) : els && els()) as any) as Func;
    case CaseType.Two:
      return (((
        [k, a, b]: [K, any, any],
        f: (a: any, b: any) => any,
        els?: () => any
      ) => (k === key ? f(a, b) : els && els())) as any) as Func;
    case CaseType.Three:
      return (((
        [k, a, b, c]: [K, any, any, any],
        f: (a: any, b: any, c: any) => any,
        els?: () => any
      ) => (k === key ? f(a, b, c) : els && els())) as any) as Func;
  }
}

function createMatch<Record extends RecordDict>(): MatchFunc<Record> {
  const evalMatch = (val: any, cases: MatchCases<Record, any>): any => {
    // first elem is always the key
    const key: keyof Record = val[0];
    const handler = (cases[key] as any) as MatchCaseFunc<
      Record[typeof key],
      any
    >;

    return handler
      ? invokeHandler(val, handler)
      : cases.default && cases.default(val);
  };

  return ((a: any, b?: any) =>
    b ? evalMatch(a, b) : (val: any) => evalMatch(val, a)) as MatchFunc<Record>;
}

function invokeHandler<K extends keyof Record, Record extends RecordDict, Res>(
  val: any[],
  handler: MatchCaseFunc<Record[K], Res>
): Res {
  switch (val.length) {
    case 1:
      return (<() => Res>handler)();
    case 2:
      return (<(a: any) => Res>handler)(val[1]);
    case 3:
      return (<(a: any, b: any) => Res>handler)(val[1], val[2]);
    case 4:
      return (<(a: any, b: any, c: any) => Res>handler)(val[1], val[2], val[3]);
    default:
      throw new Error('Invalid value for matching');
  }
}
