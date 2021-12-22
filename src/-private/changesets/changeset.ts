import {
  ChangeRecord,
  Config,
  IChangeset,
  IErr,
  PrepareChangesFn,
  PublicErrors,
  Snapshot,
  ValidationErr,
  ValidatorAction,
  ValidatorMap
} from '../../types';
import handlerFor from '../utils/handler-for';
import IChangesetProxyHandler from './proxy/changeset-proxy-handler-interface';
import ProxyOptions from './proxy/proxy-options';

export default class Changeset<T extends object> implements IChangeset<T> {
  constructor(
    data: T,
    validateFn?: ValidatorAction,
    validationMap?: ValidatorMap | null | undefined,
    options?: Config
  ) {
    const handlerOptions: ProxyOptions = {
      changesetKeys: options?.changesetKeys,
      skipValidate: options?.skipValidate,
      getArrayStorage: undefined,
      getMap: undefined,
      validateFn,
      validationMap
    };
    this._originalContent = data;
    this._proxyHandler = handlerFor(data, handlerOptions);
    this._proxy = new Proxy(data, this._proxyHandler);
  }

  private _proxy: T;
  private _originalContent: T;
  private _proxyHandler: IChangesetProxyHandler<T>;

  get content(): T {
    return this._proxy;
  }

  get originalContent(): T {
    return this._originalContent;
  }

  changes: ChangeRecord[];
  errors: PublicErrors;
  error: Record<string, any>;
  change: Record<string, any>;
  pendingContent: T;
  isValid: boolean;
  isPristine: boolean;
  isInvalid: boolean;
  isDirty: boolean;
  prepare(preparedChangedFn: PrepareChangesFn): this {
    throw new Error('Method not implemented.');
  }
  execute: () => this;
  unexecute: () => this;
  merge: (changeset: IChangeset<T>) => this;
  rollback: () => this;
  rollbackInvalid: (key: string | void) => this;
  apply: (target: {}, options?: object | undefined) => this;
  validate: (...keys: string[]) => Promise<any>;
  pushErrors: <T>(key: string, ...newErrors: (ValidationErr | IErr<T>)[]) => IErr<any>;
  snapshot: () => Snapshot;
  restore: (obj: Snapshot) => this;
  isValidating: (key: string | void) => boolean;
}
