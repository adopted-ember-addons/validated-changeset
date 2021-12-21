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

export interface Content {
  save?: Function | undefined;
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

export interface ChangeRecord {
  key: string;
  value: any;
}

export interface IPublicChangeset {
  changes: ChangeRecord[];
  errors: PublicErrors;
  error: Record<string, any>;
  change: Record<string, any>;

  content: object;
  pendingContent: object;

  isValid: boolean;
  isPristine: boolean;
  isInvalid: boolean;
  isDirty: boolean;

  prepare(preparedChangedFn: PrepareChangesFn): this;
  execute: () => this;
  unexecute: () => this;
  merge: (changeset: this) => this;
  rollback: () => this;
  rollbackInvalid: (key: string | void) => this;
  apply: (target: {}, options?: object) => this;
  validate: (...keys: string[]) => Promise<null | any | IErr<any> | Array<any | IErr<any>>>;
  pushErrors: <T>(key: string, ...newErrors: (IErr<T> | ValidationErr)[]) => IErr<any>;
  snapshot: () => Snapshot;
  restore: (obj: Snapshot) => this;
  isValidating: (key: string | void) => boolean;
}

export interface IChangeset extends IPublicChangeset {
  __changeset__: string;

  _content: object;
  _changes: Changes;
  _errors: Errors<any>;
  _validator: ValidatorAction;
  _options: Config;
  _runningValidations: RunningValidations;
  _bareChanges: { [s: string]: any };

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
