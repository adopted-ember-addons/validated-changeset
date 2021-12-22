import { PrepareChangesFn, PublicErrors } from '../../../types';

export interface Change {
  key: string;
  value: any;
}

export default interface IChangesetProxyHandler<T extends object> {
  changes: Record<string, any>[];
  errors: PublicErrors;
  error: object;
  change: object;
  data: T;

  isDirty: boolean;
  isPristine: boolean;
  isValid: boolean;
  content: T;
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
}
