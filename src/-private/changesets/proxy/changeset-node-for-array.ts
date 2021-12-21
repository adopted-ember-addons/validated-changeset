import { ChangeRecord, IPublicChangeset, PublicErrors } from '../../../types';
import ChangesetNode from './changeset-node';

const NotImplemented = 'Not Implemented';

export default class ChangeSetNodeForObject extends ChangesetNode implements IPublicChangeset {
  get content(): object {
    throw NotImplemented;
  }

  get changes(): ChangeRecord[] {
    throw NotImplemented;
  }

  get errors(): PublicErrors {
    throw NotImplemented;
  }

  get error(): Record<string, any> {
    throw NotImplemented;
  }

  get change(): Record<string, any> {
    throw NotImplemented;
  }

  get pendingContent(): object {
    throw NotImplemented;
  }

  get isValid(): boolean {
    throw NotImplemented;
  }

  get isPristine(): boolean {
    throw NotImplemented;
  }

  get isInvalid(): boolean {
    throw NotImplemented;
  }

  get isDirty(): boolean {
    throw NotImplemented;
  }

  prepare(preparedChangedFn: PrepareChangesFn): this {
    throw new Error('Method not implemented.');
  }
  execute: () => this;
  unexecute: () => this;
  merge: (changeset: this) => this;
  rollback: () => this;
  rollbackInvalid: (key: string | void) => this;
  apply: (target: {}, options?: object | undefined) => this;
  validate: (...keys: string[]) => Promise<any>;
  pushErrors: <T>(key: string, ...newErrors: (ValidationErr | IErr<T>)[]) => IErr<any>;
  snapshot: () => Snapshot;
  restore: (obj: Snapshot) => this;
  isValidating: (key: string | void) => boolean;
}
