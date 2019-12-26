import IEvented, { INotifier } from './evented';
import { ValidationErr, ValidationResult } from './validation-result';
import { ValidatorAction, ValidatorMapFunc, ValidatorMap } from './validator-action';

export { IEvented, INotifier };
export { ValidatorAction, ValidatorMapFunc, ValidatorMap };
export { ValidationErr, ValidationResult };
import { Config } from './config';
export { Config };

export interface IChange {
  value: any;
}
export interface Changes {
  [s: string]: IChange;
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

  changes: any; // { key: string; value: any; }[], //ComputedProperty<object[], object[]>,
  errors: { key: string; value: any }[]; //ComputedProperty<object[], object[]>,
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
  _setIsValidating: (key: string, value: boolean) => void;
  _valueFor: (s: string) => any;
  _notifyVirtualProperties: (keys?: string[]) => string[] | undefined;
  _rollbackKeys: () => Array<string>;
  _deleteKey: (objName: InternalMapKey, key: string) => InternalMap;
}

export interface IChangeset extends ChangesetDef, IEvented {}
