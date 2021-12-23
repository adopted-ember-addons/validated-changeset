export interface ProxyHandler {
  changes: Record<string, any>;
  content: unknown;
  proxy: any;
  children: Record<string, any>;
  safeGet: Function;
  unwrap: Function;
  [key: string]: any;
}

export type Config = {
  skipValidate?: boolean;
  changesetKeys?: string[];
};

export type ValidationOk = boolean | [boolean];
export type ValidationErr = string | string[];
export type ValidationResult = ValidationOk | ValidationErr;

export interface INotifier {
  listeners: Function[];
  addListener(callback: Function): Function;
  removeListener(callback: Function): void;
  trigger(...args: any[]): void;
}

export interface IEvented {
  on(eventName: string, callback: Function): INotifier;
  off(eventName: string, callback: Function): INotifier;
  trigger(eventName: string, ...args: any[]): void;
  _eventedNotifiers: { [key: string]: any };
}

export type ValidatorAction =
  | {
      (params: {
        key: string;
        newValue: unknown;
        oldValue: unknown;
        changes: unknown;
        content: object;
      }): ValidationResult | Promise<ValidationResult>;
    }
  | null
  | undefined;

export type ValidatorMapFunc = {
  (key: string, newValue: unknown, oldValue: unknown, changes: unknown, content: object):
    | ValidationResult
    | Promise<ValidationResult>;
};

export interface ValidatorClass {
  validate: ValidatorMapFunc;
  [s: string]: any;
}

export type ValidatorMap =
  | { [s: string]: ValidatorMapFunc | ValidatorMapFunc[] | any }
  | null
  | undefined;

// https://github.com/microsoft/TypeScript/pull/26797
/* export interface IChange { */
/*   [s: symbol]: any; */
/* } */
export interface Changes {
  [s: string]: any; //IChange;
}

export type TContentObject = { [key: string]: any }; //Record<string, any>;
export type TContentArray = any[];
export type TContent = TContentObject | TContentArray;

export interface IErr<T> {
  value: T;
  validation: ValidationErr | ValidationErr[];
}

export type Errors<T> = {
  [s: string]: IErr<T>;
};

export type PublicErrors = {
  key: string;
  value: any;
  validation: ValidationErr | ValidationErr[];
}[];

export type RunningValidations = {
  [s: string]: number;
};

export type InternalMap = Changes | Errors<any> | RunningValidations;

export interface NewProperty<T> {
  key: string;
  value: T;
  oldValue?: any;
}

export type InternalMapKey = '_changes' | '_errors' | '_runningValidations';

export type Snapshot = {
  changes: { [s: string]: any };
  errors: { [s: string]: IErr<any> };
};

export type PrepareChangesFn = (obj: { [s: string]: any }) => { [s: string]: any } | null;

export interface ChangeRecord {
  key: string;
  value: any;
}

export interface IChangeset<T extends TContent> {
  changes: ChangeRecord[];
  errors: PublicErrors;
  error: Record<string, any>;
  change: Record<string, any>;

  content: T;
  originalContent: T;

  isValid: boolean;
  isPristine: boolean;
  isInvalid: boolean;
  isDirty: boolean;

  prepare(preparedChangedFn: PrepareChangesFn): this;
  execute(): this;
  unexecute(): this;
  merge(changeset2: IChangeset<T>): IChangeset<T>;
  rollback(): this;
  rollbackInvalid(key?: string): this;
  applyTo(target: T, options?: object): this;
  validate(...keys: string[]): Promise<null | any | IErr<any> | Array<any | IErr<any>>>;
  pushErrors(key: string, ...newErrors: (IErr<T> | ValidationErr)[]): IErr<any>;
  snapshot(): Snapshot;
  restore(obj: Snapshot): this;
  isValidating(key?: string): boolean;
}
