import {
  ChangeRecord,
  Config,
  IChangeset,
  IErr,
  PrepareChangesFn,
  PublicErrors,
  Snapshot,
  TContent,
  ValidationErr,
  ValidatorAction,
  ValidatorMap
} from '../../types';
import handlerFor from '../utils/handler-for';
import IChangesetProxyHandler from './proxy/changeset-proxy-handler-interface';
import ProxyOptions from './proxy/proxy-options';

export default class Changeset<T extends TContent> implements IChangeset<T> {
  constructor(
    data: T,
    validateFn?: ValidatorAction,
    validationMap?: ValidatorMap | null | undefined,
    options?: Config
  ) {
    this._options = {
      changesetKeys: options?.changesetKeys,
      skipValidate: options?.skipValidate,
      getArrayStorage: undefined,
      getMap: undefined,
      validateFn,
      validationMap
    };
    this._proxyHandler = handlerFor(data, this._options);
    this._proxy = new Proxy(data, this._proxyHandler);
  }

  private readonly _options: ProxyOptions;
  private readonly _proxy: T;
  private readonly _proxyHandler: IChangesetProxyHandler<T>;

  get content(): T {
    return this._proxy;
  }

  get originalContent(): T {
    return this._proxyHandler.originalContent;
  }

  get changes(): ChangeRecord[] {
    return this._proxyHandler.changes;
  }

  get errors(): PublicErrors {
    return this._proxyHandler.errors;
  }

  get error(): Record<string, any> {
    return this._proxyHandler.errors;
  }

  get change(): Record<string, any> {
    return this._proxyHandler.errors;
  }

  get isDirty(): boolean {
    return this._proxyHandler.isDirty;
  }

  get isPristine(): boolean {
    return this._proxyHandler.isPristine;
  }

  get isValid(): boolean {
    return this._proxyHandler.isValid;
  }

  get isInvalid(): boolean {
    return this._proxyHandler.isInvalid;
  }

  prepare(preparedChangedFn: PrepareChangesFn): this {
    this._proxyHandler.prepare(preparedChangedFn);
    return this;
  }

  execute(): this {
    this._proxyHandler.execute();
    return this;
  }

  unexecute(): this {
    this._proxyHandler.unexecute();
    return this;
  }

  merge(changeset2: IChangeset<T>): IChangeset<T> {
    let newContent = (Array.isArray(this.content) ? [] : {}) as T;
    // create a new changeset with our options
    let result = new Changeset(newContent, this._options.validateFn, this._options.validationMap, {
      changesetKeys: this._options.changesetKeys,
      skipValidate: this._options.skipValidate
    });
    // apply our changes
    this.applyTo(result.content);
    // apply the other changes over the top
    changeset2.applyTo(result.content);
    return result;
  }

  rollback(): this {
    this._proxyHandler.rollback();
    return this;
  }

  rollbackInvalid(key: string | void): this {
    this._proxyHandler.rollbackInvalid(key);
    return this;
  }

  applyTo(target: T): this {
    this._proxyHandler.applyTo(target);
    return this;
  }

  validate(...keys: string[]): Promise<any> {
    return this._proxyHandler.validate(...keys);
  }

  pushErrors<T>(key: string, ...newErrors: (ValidationErr | IErr<T>)[]): IErr<any> {
    return this._proxyHandler.pushErrors(key, ...newErrors);
  }

  snapshot(): Snapshot {
    return this._proxyHandler.snapshot();
  }

  restore(obj: Snapshot): this {
    this._proxyHandler.restore(obj);
    return this;
  }

  isValidating(key: string | void): boolean {
    return this._proxyHandler.isValidating(key);
  }
}
