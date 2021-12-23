import {
  ChangeRecord,
  IChangeset,
  IErr,
  PrepareChangesFn,
  PublicErrors,
  Snapshot,
  TContent,
  ValidationErr
} from '../../../types';

export interface Change {
  key: string;
  value: any;
}

export default interface IChangesetProxyHandler<T extends TContent> extends ProxyHandler<T> {
  changes: ChangeRecord[];
  errors: PublicErrors;
  error: object;
  change: object;

  isDirty: boolean;
  isPristine: boolean;
  isValid: boolean;
  isInvalid: boolean;
  content: T;
  originalContent: T;
  execute(): this;
  isValidating(key: string | void): boolean;
  merge(changeset: IChangeset<T>): this;
  prepare(preparedChangedFn: PrepareChangesFn): this;
  applyTo(target?: T): this;
  pushErrors<T>(key: string, ...newErrors: (ValidationErr | IErr<T>)[]): IErr<any>;
  restore(obj: Snapshot): this;
  rollback(): void;
  rollbackInvalid(key: string | void): this;
  rollbackProperty(key: string): this;
  snapshot(): Snapshot;
  unexecute(): this;
  unwrap(): this; // deprecated
  validate(keys: string[]): Promise<void>;
}
