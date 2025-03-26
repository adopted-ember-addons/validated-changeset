export interface ProxyHandler {
  changes: Record<string, any>;
  content: Content;
  proxy: any;
  children: Record<string, any>;
  safeGet: (obj: any, key: string) => any;
  unwrap: (...args: unknown[]) => unknown;
  [key: string]: any;
}

export type Config = {
  skipValidate?: boolean;
  initValidate?: boolean;
  changesetKeys?: string[];
};

export type ValidationOk = boolean | [boolean];
export type ValidationErr = string | string[];
export type ValidationResult = ValidationOk | ValidationErr;

export interface INotifier {
  listeners: (...args: unknown[]) => unknown[];
  addListener(callback: (...args: unknown[]) => unknown): (...args: unknown[]) => unknown;
  removeListener(callback: (...args: unknown[]) => unknown): void;
  trigger(...args: any[]): void;
}

export interface IEvented {
  on(eventName: string, callback: (key: string) => unknown): INotifier;
  off(eventName: string, callback: (key: string) => unknown): INotifier;
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

export interface Content {
  save?: (...args: unknown[]) => unknown | undefined;
  [key: string]: any;
}

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

export interface ChangesetDef {
  __changeset__: string;

  _content: object;
  _changes: Changes;
  _errors: Errors<any>;
  _validator: ValidatorAction;
  _options: Config;
  _runningValidations: RunningValidations;
  _bareChanges: { [s: string]: any };

  changes: Record<string, any>[];
  errors: PublicErrors;
  error: object;
  change: object;
  data: object;

  isValid: boolean;
  isPristine: boolean;
  isInvalid: boolean;
  isDirty: boolean;

  get: (key: string) => any;
  set: <T>(
    key: string,
    value: T
  ) => void | T | IErr<T> | Promise<T> | Promise<ValidationResult | T | IErr<T>> | ValidationResult;
  maybeUnwrapProxy: (content: Content) => any;
  getDeep: any;
  setDeep: any;
  safeGet: (obj: any, key: string) => any;
  prepare(preparedChangedFn: PrepareChangesFn): this;
  execute: () => this;
  save: (options: object) => Promise<ChangesetDef | any>;
  merge: (changeset: this) => this;
  rollback: () => this;
  rollbackInvalid: (key: string | void) => this;
  rollbackProperty: (key: string) => this;
  validate: (
    key: string
  ) => Promise<null> | Promise<any | IErr<any>> | Promise<Array<any | IErr<any>>>;
  addError: <T>(key: string, error: IErr<T> | ValidationErr) => IErr<T> | ValidationErr;
  pushErrors: (key: string, newErrors: string[]) => IErr<any>;
  snapshot: () => Snapshot;
  restore: (obj: Snapshot) => this;
  cast: (allowed: Array<string>) => this;
  isValidating: (key: string | void) => boolean;
  _validate: (
    key: string,
    newValue: any,
    oldValue: any
  ) => ValidationResult | Promise<ValidationResult>;
  _setProperty: <T>(obj: NewProperty<T>) => void;
  _setIsValidating: (key: string, value: Promise<ValidationResult>) => void;
  _notifyVirtualProperties: (keys?: string[]) => string[] | undefined;
  _rollbackKeys: () => Array<string>;
  _deleteKey: (objName: InternalMapKey, key: string) => InternalMap;
}

export interface IChangeset extends ChangesetDef, IEvented {}
