import { Content, PrepareChangesFn, PublicErrors } from '../../../types';

export interface Change {
  key: string;
  value: any;
}

export default interface IChangesetProxyHandler {
  changes: Record<string, any>[];
  errors: PublicErrors;
  error: object;
  change: object;
  data: object;

  isChangeset: boolean;
  isDirty: boolean;
  isPristine: boolean;
  isValid: boolean;
  pendingData: { [index: string]: any };
  execute(): this;
  isValidating: (key: string | void) => boolean;
  prepare(preparedChangedFn: PrepareChangesFn): this;
  save: (options?: object) => Promise<this | any>;
  rollback(): void;
  rollbackInvalid: (key: string | void) => this;
  rollbackProperty: (key: string) => this;
  unexecute(): this;
  unwrap(): this; // deprecated
  validate(): Promise<void>;
  // backwards compatible with old ember-changeset
  get(target: Content, key: string, proxy?: {}): any;
  set(target: Content, key: string, value: any): any;
}
