export interface NoData {
  readonly _none: 'none';
}
export interface Const<T> {
  readonly _const: T;
}
export interface One<T> {
  readonly _one: T;
}
export interface Two<T1, T2> {
  readonly _two: T1 | T2;
}
export interface Three<T1, T2, T3> {
  readonly _three: T1 | T2 | T3;
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

export type Types = {
  (): NoData;
  <T>(): One<T>;
  <T>(val: T): Const<T>;
  <T1, T2>(): Two<T1, T2>;
  <T1, T2, T3>(): Three<T1, T2, T3>;
};

export const t: Types = ((val: any) => val) as any;

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
      <R>(
        val: OpaqueUnion<Rec>,
        f: () => R,
        els: (v: OpaqueUnion<Rec>) => R
      ): R;
    }
  : T extends One<infer A>
    ? {
        <R>(val: OpaqueUnion<Rec>, f: (a: A) => R): R | undefined;
        <R>(
          val: OpaqueUnion<Rec>,
          f: (a: A) => R,
          els: (v: OpaqueUnion<Rec>) => R
        ): R;
      }
    : T extends Const<infer A>
      ? {
          <R>(val: OpaqueUnion<Rec>, f: (a: A) => R): R | undefined;
          <R>(
            val: OpaqueUnion<Rec>,
            f: (a: A) => R,
            els: (v: OpaqueUnion<Rec>) => R
          ): R;
        }
      : T extends Two<infer A1, infer A2>
        ? {
            <R>(val: OpaqueUnion<Rec>, f: (a1: A1, a2: A2) => R): R | undefined;
            <R>(
              val: OpaqueUnion<Rec>,
              f: (a1: A1, a2: A2) => R,
              els: (v: OpaqueUnion<Rec>) => R
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
                els: (v: OpaqueUnion<Rec>) => R
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
  const val: Case<any, any, any> = rec[key];
  if (val !== undefined) {
    const res = [key, val];
    return ((() => res) as any) as any;
  }

  return ((...args: any[]) => [key, ...args]) as any;
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
  _rec: Record
): UnpackFunc<Record[K], Record> {
  return ((val: any, f: (...args: any[]) => any, els?: (v: any) => any) =>
    val[0] === key ? f(...val.slice(1)) : els && els(val)) as any;
}

function createMatch<Record extends RecordDict>(): MatchFunc<Record> {
  const evalMatch = (val: any, cases: MatchCases<Record, any>): any => {
    // first elem is always the key
    const handler = cases[val[0]] as any;
    return handler
      ? handler(...val.slice(1))
      : cases.default && cases.default(val);
  };

  return ((a: any, b?: any) =>
    b ? evalMatch(a, b) : (val: any) => evalMatch(val, a)) as MatchFunc<Record>;
}
