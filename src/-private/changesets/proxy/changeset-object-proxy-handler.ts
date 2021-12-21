import { bind } from 'bind-decorator';
import { Changeset, Err, getDeep, isObject, isPromise, setDeep } from '../../..';
import {
  ChangeRecord,
  Changes,
  Content,
  Errors,
  IErr,
  IPublicChangeset,
  NewProperty,
  PrepareChangesFn,
  PublicErrors,
  RunningValidations,
  Snapshot,
  ValidationErr,
  ValidationResult,
  ValidatorAction
} from '../../../types';
import { flattenValidations } from '../../../utils/flatten-validations';
import isChangeset, { CHANGESET } from '../../../utils/is-changeset';
import { ObjectTreeNode } from '../../../utils/object-tree-node';
import Notifier from '../../notifier';
import assert from '../../utils/assert';
import { DEBUG } from '../../utils/consts';
import deleteErrorKey from '../../utils/delete-error-key';
import handlerFor from '../../utils/handler-for';
import isUnchanged from '../../utils/is-unchanged';
import requiresProxying from '../../utils/requires-proxying';
import safeSet from '../../utils/safe-set';
import splitKey from '../../utils/split-key';
import {
  AFTER_ROLLBACK_EVENT,
  AFTER_VALIDATION_EVENT,
  BEFORE_VALIDATION_EVENT,
  EXECUTE_EVENT
} from '../../utils/strings';
import IChangesetProxyHandler from './changeset-proxy-handler-interface';
import ProxyOptions from './proxy-options';
import { ObjectReplaced, DeleteOnUndo } from './proxy-symbols';

const NoValidation = false;

interface EventedCallback {
  (args: any[]): void;
}

export default class ChangesetObjectProxyHandler implements IChangesetProxyHandler {
  constructor(source: Content, options: ProxyOptions) {
    this.__options = options || {};
    this.__data = source;
    let keyFilters = options?.changesetKeys;
    if (keyFilters) {
      let localKeyFilters = []; // only the ones where our property is the leaf
      for (let filter of keyFilters) {
        let [localKey, subkey] = splitKey(filter);
        if (!subkey) {
          // it's a leaf
          localKeyFilters.push(localKey);
        }
      }
      this.__localChangesetKeyFilters = localKeyFilters;
    }
    if (options.getMap) {
      this.__nestedProxies = options.getMap<string>();
    } else {
      this.__nestedProxies = new Map<string, any>();
    }
  }

  private publicApiMethods: Map<string, Function> = new Map<string, Function>([
    ['addError', this.addError],
    ['cast', this.cast],
    ['execute', this.execute],
    ['get', this.getValue],
    ['isValidating', this.isValidating],
    ['merge', this.merge],
    ['on', this.on],
    ['off', this.off],
    ['prepare', this.prepare],
    ['pushErrors', this.pushErrors],
    ['restore', this.restore],
    ['rollback', this.rollback],
    ['rollbackInvalid', this.rollbackInvalid],
    ['rollbackProperty', this.rollbackProperty],
    ['save', this.save],
    ['set', this.setValue],
    ['snapshot', this.snapshot],
    ['unexecute', this.unexecute],
    ['unwrap', this.unwrap],
    ['validate', this.validate]
  ]);

  private publicApiProperties = new Map<string | symbol, Function>([
    ['__changeset__', () => CHANGESET], // backwards compatibility only
    ['change', () => this.change],
    ['changes', () => this.changes],
    ['content', () => this.pendingData],
    ['data', () => this.data],
    ['error', () => this.error],
    ['errors', () => this.errors],
    ['isChangeset', () => true],
    ['isDirty', () => this.isDirty],
    ['isInvalid', () => this.isInvalid],
    ['isPristine', () => this.isPristine],
    ['isValid', () => this.isValid],
    ['pendingData', () => this.pendingData]
  ]);

  public defineProperty(
    target: Record<string, any>,
    key: string,
    desc: PropertyDescriptor
  ): boolean {
    // defining a property is a change
    this.__changes.set(key, desc);
    return true;
  }

  /**
   * Proxy trap that intercepts get of all properties and methods.
   *
   * @method get
   */
  public get(_target: {}, key: string, proxy?: Record<string, any>): any {
    if (!this.__outerProxy && proxy) {
      // this is the first time that we are given our containing proxy
      this.__outerProxy = proxy;
      // add new properties to the proxy if they've been defined already
      let changes = this.__changes;
      for (let key of changes.keys()) {
        let change = changes.get(key);
        if (isObject(change)) {
          // this is a defined property
          Object.defineProperty(proxy, key, change);
        }
      }
    }

    // key may be dotted
    let [localkey, subkey] = splitKey(key);

    if (this.publicApiMethods.has(localkey)) {
      return this.publicApiMethods.get(localkey);
    }
    if (this.publicApiProperties.has(localkey)) {
      let getter = this.publicApiProperties.get(localkey) as Function;
      let result = getter();
      if (subkey) {
        result = getDeep(result, subkey);
      }
      return result;
    }
    // otherwise it's to be found on the wrapped object
    return this.getValue(key);
  }

  /**
   * Proxy trap that intercepts has key.
   *
   * @method has
   */
  public has(target: Record<string, any>, key: string) {
    return Reflect.has(target, key) || this.__nestedProxies.has(key) || this.__changes.has(key);
  }

  public set(_target: {}, key: string, value: any): any {
    return this.setValue(key, value);
  }

  public ownKeys(target: Record<string, any>) {
    let keys = Object.keys(target);
    for (let k of this.__nestedProxies.keys()) {
      if (!keys.includes(k)) {
        keys.push(k);
      }
    }
    for (let k of this.__changes.keys()) {
      if (!keys.includes(k)) {
        keys.push(k);
      }
    }
    return keys;
  }

  public getOwnPropertyDescriptor(
    target: Record<string, any>,
    key: string
  ): PropertyDescriptor | undefined {
    if (this.__nestedProxies.has(key)) {
      return {
        value: this.__nestedProxies.get(key),
        writable: true,
        configurable: true,
        enumerable: true
      };
    }
    if (this.__changes.has(key)) {
      return {
        value: this.__changes.get(key),
        writable: true,
        configurable: true,
        enumerable: true
      };
    }
    return Reflect.getOwnPropertyDescriptor(target, key);
  }

  public readonly isChangeset = true;

  public get data(): Content {
    return this.__data;
  }

  public get error(): object {
    return this.__errors;
  }

  public get errors(): PublicErrors {
    // walk the tree of errors and flatten
    let result: PublicErrors = [];
    let recurse = (obj: Record<string, any>, parentKey: string | null) => {
      for (let key of Object.keys(obj).sort()) {
        let entry = obj[key];
        let fullKey = parentKey ? `${parentKey}.${key}` : key;
        if (entry instanceof Err) {
          result.push({
            key: fullKey,
            value: entry.value,
            validation: entry.validation
          });
        } else if (isObject(entry)) {
          recurse(entry, fullKey);
        }
      }
    };
    recurse(this.__errors, null);
    return result;
  }

  public get isDirty(): boolean {
    // we're dirty if either we have top level changes
    // or if a nested proxy is dirty
    let locallyDirty = this.__changes.size > 0;
    if (locallyDirty) {
      return true;
    }
    for (let proxy of this.__nestedProxies.values()) {
      if (proxy.isDirty) {
        return true;
      }
    }
    return false;
  }

  public get isPristine(): boolean {
    return !this.isDirty;
  }

  public get isInvalid(): boolean {
    return !this.isValid;
  }

  public get isValid(): boolean {
    // validate this level
    if (Object.keys(this.__errors).length > 0) {
      return false;
    }
    // now look at all the nested proxies
    for (let proxy of this.__nestedProxies.values()) {
      if (!proxy.isValid) {
        return false;
      }
    }
    return true;
  }

  public get pendingData(): { [index: string]: any } {
    return this.__outerProxy as {};
  }

  @bind
  public getValue(key: string): any {
    // nested keys are separated by dots
    let [localKey, subkey] = splitKey(key as string);

    // to be backwards compatible we support getting properties by the get function
    if (this.publicApiProperties.has(localKey)) {
      let getter = this.publicApiProperties.get(localKey) as Function;
      let value = getter();
      if (subkey) {
        return value[subkey];
      }
      return value;
    }
    // it wasn't in there so look in our contents

    if (localKey === '_content') {
      // backwards compatibility only
      if (subkey) {
        return this.__outerProxy[subkey];
      }
      return this.__outerProxy;
    }
    // is it an existing proxy?
    if (this.__nestedProxies.has(localKey)) {
      let proxy = this.__nestedProxies.get(localKey);
      if (subkey) {
        return proxy[subkey];
      }
      return proxy;
    } else {
      let changes = this.__changes;
      if (changes.has(localKey)) {
        // we have a pending change
        // return it
        // we know it's not undefined so we can safely cast it
        let value = changes.get(localKey);
        if (value !== ObjectReplaced) {
          if (isObject(value)) {
            if (value.get) {
              value = value.get.bind(this.__outerProxy).call();
            } else {
              value = value.value;
            }
          }
          if (subkey) {
            return getDeep(value, subkey);
          }
          return value;
        }
      }
    }
    // drop back to the internal object property
    // or a proxy of it if it's an object

    let value = Reflect.get(this.__data, localKey);
    if (requiresProxying(value)) {
      // we know that this key has not already been proxied
      let proxy = this.addProxy(localKey);
      if (subkey) {
        return proxy[subkey];
      }
      return proxy;
    }
    return value;
  }

  @bind
  public setValue(key: string, value: any, _validate = true): boolean {
    if (DEBUG) {
      if (this.publicApiMethods.has(key) || this.publicApiProperties.has(key)) {
        throw `changeset.${key} is a readonly property of the changeset`;
      }
    }

    // nested keys are separated by dots
    let [localKey, subkey] = splitKey(key as string);

    let result = false;
    if (subkey) {
      // pass the change down to a nested level
      let proxy = this.__nestedProxies.get(localKey);
      if (!proxy) {
        // no existing proxy
        // so they're trying to set deep into an object that isn't yet proxied
        // wrap the existing object or create an empty one
        proxy = this.addProxy(localKey);
        // if there was a previous leaf value here, delete it
        this.__changes.delete(localKey);
      }
      result = proxy.set(subkey, value);
    } else {
      // this is a change at our level
      // check the changeset key filter
      if (this.isKeyFilteredOut(localKey)) {
        return false;
      }
      if (requiresProxying(value)) {
        // mark the overwrite if this is a new object
        let currentObject = this.__nestedProxies.get(localKey)?.data ?? this.__data[localKey];
        if (isUnchanged(currentObject, value)) {
          this.__changes.delete(localKey);
        } else {
          this.markChange(localKey, ObjectReplaced);
        }
        this.addProxy(localKey, value);
      } else {
        if (isUnchanged(value, this.__data[localKey])) {
          this.__changes.delete(localKey);
        } else {
          // the value is a local property
          this.markChange(localKey, value);
        }
        // remove a proxy if there was one with the same key
        if (this.__nestedProxies.has(key)) {
          this.__nestedProxies.delete(key);
        }
      }
      result = true;
    }
    if (_validate && this.__options.skipValidate !== true) {
      this._validateKey(key, value);
    }
    return result;
  }

  /**
   * Creates a snapshot of the changeset's errors and changes.
   *
   * @method snapshot
   */
  @bind
  snapshot(): Snapshot {
    let changes: Changes = this.change;
    let errors: Errors<any> = this.__errors;

    return {
      changes: Object.keys(changes).reduce((newObj: Changes, key: keyof Changes) => {
        let change = changes[key];
        if (isObject(change)) {
          // clone it
          change = Object.assign({}, change);
        }
        newObj[key] = change;
        return newObj;
      }, {}),

      errors: Object.keys(errors).reduce((newObj: Errors<any>, key: keyof Errors<any>) => {
        let e = errors[key];
        newObj[key] = { value: e.value, validation: e.validation };
        return newObj;
      }, {})
    };
  }

  /**
   * Restores a snapshot of changes and errors. This overrides existing
   * changes and errors.
   *
   * @method restore
   */
  @bind
  restore({ changes, errors }: Snapshot): this {
    this.clearPending();
    if (changes) {
      for (let key of Object.keys(changes)) {
        let value = changes[key];
        if (isObject(value)) {
          // pass the change down to a nested level
          let proxy = this.__nestedProxies.get(key);
          if (!proxy) {
            // no existing proxy
            proxy = this.addProxy(key);
          }
          proxy.restore({ changes: value });
        } else {
          this.__changes.set(key, value);
        }
      }
    }
    if (errors) {
      let newErrors: Errors<any> = Object.keys(errors).reduce(
        (newObj: Errors<any>, key: keyof Changes) => {
          let e: IErr<any> = errors[key];
          newObj[key] = new Err(e.value, e.validation);
          return newObj;
        },
        {}
      );

      // @tracked
      this.__errors = newErrors;
      this.__errorsCache = this.__errors;
    }
    return this;
  }

  @bind
  public merge(changeset2: IPublicChangeset): IPublicChangeset {
    assert('Cannot merge with a non-changeset', isChangeset(changeset2));
    assert('Cannot merge with a changeset of different content', changeset2.data === this.__data);
    let result = Changeset(
      this.data,
      this.__options.validateFn,
      this.__options.validationMap,
      this.__options
    );
    let applyChanges = (changes: ChangeRecord[]) => {
      for (let change of changes) {
        result[change.key] = change.value;
      }
    };
    applyChanges(this.changes);
    applyChanges(changeset2.changes);

    let applyErrors = (errors: PublicErrors) => {
      for (let error of errors) {
        result.addError(error.key, new Err(error.value, error.validation));
      }
    };
    applyErrors(this.errors);
    applyErrors(changeset2.errors);
    return result;
  }

  @bind
  public prepare(fn: PrepareChangesFn): this {
    if (!fn) {
      return this;
    }
    let changes: Record<string, any> = {};
    for (let change of this.changes) {
      changes[change.key] = change.value;
    }
    const modifiedChanges = fn(changes);
    if (modifiedChanges === null || typeof modifiedChanges !== 'object') {
      throw 'prepare callback must return an object';
    }
    // clear all our changes
    this.clearPending();
    // and replace with these
    if (modifiedChanges !== null) {
      for (let key in modifiedChanges) {
        const value = modifiedChanges[key];
        this.setValue(key, value, NoValidation);
      }
    }
    return this;
  }

  @bind
  on(eventName: string, callback: EventedCallback) {
    const notifier = this.notifierForEvent(eventName);
    return notifier.addListener(callback);
  }

  @bind
  off(eventName: string, callback: EventedCallback) {
    const notifier = this.notifierForEvent(eventName);
    return notifier.removeListener(callback);
  }

  @bind
  public cast(allowedKeys?: string[]): void {
    if (!allowedKeys) {
      return;
    }
    let allowedMap = new Map<string, null>();
    for (let key of allowedKeys) {
      allowedMap.set(key, null);
    }
    // property changes
    let changes = this.__changes;
    if (changes) {
      let deletions = [];
      for (let key of changes.keys()) {
        if (!allowedMap.has(key)) {
          deletions.push(key);
        }
      }
      for (let key of deletions) {
        changes.delete(key);
      }
    }
    // nested proxies
    let nestedProxies = this.__nestedProxies;
    if (nestedProxies) {
      let deletions = [];
      for (let key of nestedProxies.keys()) {
        if (!allowedMap.has(key)) {
          deletions.push(key);
        }
      }
      for (let key of deletions) {
        nestedProxies.delete(key);
      }
    }
    // undo state
    let undoState = this.__undoState;
    if (undoState) {
      let deletions = [];
      for (let key of undoState.keys()) {
        if (!allowedMap.has(key)) {
          deletions.push(key);
        }
      }
      for (let key of deletions) {
        undoState.delete(key);
      }
    }
  }

  @bind
  public execute(): this {
    // execute the tree from the top down
    if (!this.__undoState) {
      this.__undoState = new Map<string, any>();
    }
    if (!this.__undoStateProxies) {
      this.__undoStateProxies = new Map<string, any>();
    }
    // apply the changes to the source
    // but keep the changes for undo later
    if (this.isDirty && this.isValid) {
      let changes = [...this.__changes.entries()];
      for (let [key, newValue] of changes) {
        // grab the old value for undo
        let oldValue = Reflect.get(this.__data, key);
        if (oldValue === undefined) {
          oldValue = DeleteOnUndo;
        }
        this.__undoState.set(key, oldValue);
        // apply the new value
        if (newValue === ObjectReplaced) {
          // apply the entire proxy now
          // and changes in the next phase below
          Reflect.set(this.__data, key, this.__nestedProxies.get(key).data);
        } else if (isObject(newValue)) {
          // this is a defineProperty descriptor
          Reflect.defineProperty(this.__data, key, newValue);
        } else {
          Reflect.set(this.__data, key, newValue);
        }
      }
    }
    // now apply the data from the nested proxies
    for (let [key, proxy] of this.__nestedProxies.entries()) {
      if (!Reflect.has(this.__data, key)) {
        Reflect.set(this.__data, key, proxy.data);
        this.__undoState.set(key, DeleteOnUndo);
      }
      proxy.execute();
      this.__undoStateProxies.set(key, proxy);
    }
    this.clearPending();
    // trigger any registered callbacks by same keyword as method name
    this.trigger(EXECUTE_EVENT);

    return this;
  }

  @bind
  public isValidating(key: string | void): boolean {
    let runningValidations: RunningValidations = this._runningValidations;
    let ks: string[] = Object.keys(runningValidations);
    if (key) {
      return ks.includes(key);
    }
    return ks.length > 0;
  }

  @bind
  public rollback(): void {
    // rollback from the bottom up to the previous execute

    // roll back the proxies
    for (let proxy of this.__nestedProxies.values()) {
      proxy.rollback();
    }

    this.clearPending();
    this.trigger(AFTER_ROLLBACK_EVENT);
  }

  @bind
  rollbackInvalid(key: string | void): this {
    if (!key) {
      // clone the array so we can edit the object
      // while iterating the keys
      let keys = [...Object.keys(this.__errors)];
      for (let key of keys) {
        this.rollbackProperty(key);
      }
    } else if (this.__errors[key]) {
      this.rollbackProperty(key);
    }
    return this;
  }

  @bind
  public rollbackProperty(key: string): this {
    // nested keys are separated by dots
    let [localKey, subkey] = splitKey(key as string);

    if (subkey) {
      // it's meant for a child node
      this.__nestedProxies.get(localKey)?.rollbackProperty(subkey);
    } else {
      this.__changes.delete(localKey);
    }
    delete this.__errors[key];
    delete this.__errorsCache[key];
    this.trigger(AFTER_ROLLBACK_EVENT);
    return this;
  }

  @bind
  public async save(options?: object): Promise<this | any> {
    this.execute();
    let result = null;
    if (typeof this.__data.save === 'function') {
      result = await this.__data.save(options);
    }
    this.clearPending();
    return result;
  }

  @bind
  public unwrap(): this {
    // deprecated
    return this;
  }

  @bind
  public unexecute(): this {
    // apply the undo state from the bottom up
    if (this.__undoStateProxies) {
      for (let [key, proxy] of this.__undoStateProxies.entries()) {
        proxy.unexecute();
        this.__nestedProxies.set(key, proxy);
      }
      this.__undoStateProxies = undefined;
    }

    if (this.__undoState) {
      let oldStates = [...this.__undoState.entries()];
      for (let [key, value] of oldStates) {
        if (value === DeleteOnUndo) {
          Reflect.deleteProperty(this.__data, key);
        } else {
          Reflect.set(this.__data, key, value);
        }
      }
    }
    // clear the undo state
    this.__undoState = undefined;
    return this;
  }

  /**
   * Validates the changeset immediately against the validationMap passed in.
   * If no key is passed into this method, it will validate all fields on the
   * validationMap and set errors accordingly. Will throw an error if no
   * validationMap is present.
   *
   * @method validate
   */
  @bind
  public async validate(...validationKeys: string[]): Promise<any> {
    // only called on the top level node
    let validationMap = this.__options.validationMap || {};
    if (Object.keys(validationMap as object).length === 0 && !validationKeys.length) {
      return null;
    }

    validationKeys =
      validationKeys.length > 0
        ? validationKeys
        : Object.keys(flattenValidations(validationMap as object));

    let maybePromise = validationKeys.map(key => {
      const value: any = this.getValue(key);
      const resolvedValue = value instanceof ObjectTreeNode ? value.unwrap() : value;
      return this._validateKey(key, resolvedValue);
    });

    return await Promise.all(maybePromise);
  }

  public get change(): { [index: string]: any } {
    // property changes first
    let result: { [index: string]: any } = {};
    let changes = [...this.__changes.entries()];
    for (let [key, value] of changes) {
      if (value === ObjectReplaced) {
        result[key] = this.__nestedProxies.get(key).pendingData;
      } else {
        result[key as string] = value;
      }
    }
    // now apply the __nestedProxies
    for (let [key, proxy] of this.__nestedProxies.entries()) {
      let thisChange = proxy.change;
      if (Object.keys(thisChange).length > 0) {
        result[key] = Object.assign(result[key] || {}, thisChange);
      }
    }
    return result;
  }

  public get changes(): ChangeRecord[] {
    let replacements: string[] = [];
    let allChanges = [...this.__changes.entries()].map(([key, value]) => {
      if (value === ObjectReplaced) {
        replacements.push(key);
        value = Object.assign({}, this.__nestedProxies.get(key).pendingData);
      }
      return {
        key,
        value
      };
    });
    // now add the proxy changes with the nested key
    // except for the ones that were replaced
    for (let [key, proxy] of this.__nestedProxies.entries()) {
      if (replacements.includes(key)) {
        continue;
      }
      let proxyChanges = proxy.changes;
      for (let change of proxyChanges) {
        allChanges.push({
          key: `${key}.${change.key}`,
          value: change.value
        });
      }
    }
    return allChanges.sort((a, b) => (a.key === b.key ? 0 : a.key < b.key ? -1 : 1));
  }

  /**
   * Takes resolved validation and adds an error or simply returns the value
   *
   * @method _handleValidation
   * @private
   */
  private _handleValidation<T>(
    validation: ValidationResult,
    { key, value }: NewProperty<T>
  ): T | IErr<T> | ValidationErr {
    const isValid: boolean =
      validation === true ||
      (Array.isArray(validation) && validation.length === 1 && validation[0] === true);

    // Happy path: remove `key` from error map.
    // @tracked
    // ERRORS_CACHE to avoid backtracking Ember assertion.

    this.__errors = deleteErrorKey(this.__errorsCache, key) as Errors<any>;

    // Error case.
    if (!isValid) {
      return this.addError(key, { value, validation } as IErr<T>);
    }

    return value;
  }

  /**
   * runs the validator with the key and value
   *
   * @method _validate
   * @private
   */
  private _validate(
    key: string,
    newValue: unknown,
    oldValue: unknown
  ): ValidationResult | Promise<ValidationResult> {
    let validator: ValidatorAction = this.__options.validateFn;
    let content: Content = this.__data;

    if (typeof validator === 'function') {
      let validationResult = validator({
        key,
        newValue,
        oldValue,
        changes: this.change,
        content
      });

      if (validationResult === undefined) {
        // no validator function found for key
        return true;
      }

      return validationResult;
    }

    return true;
  }

  /**
   * Validates a specific key
   *
   * @method _validateKey
   * @private
   */
  private _validateKey<T>(
    key: string,
    value: T
  ): Promise<ValidationResult | T | IErr<T>> | T | IErr<T> | ValidationResult {
    let content: Content = this.__data;
    let oldValue: any = getDeep(content, key);
    let validation: ValidationResult | Promise<ValidationResult> = this._validate(
      key,
      value,
      oldValue
    );

    this.trigger(BEFORE_VALIDATION_EVENT, key);

    // TODO: Address case when Promise is rejected.
    if (isPromise(validation)) {
      this._setIsValidating(key, validation as Promise<ValidationResult>);

      let running: RunningValidations = this._runningValidations;
      let promises = Object.entries(running);

      return Promise.all(promises).then(() => {
        return (validation as Promise<ValidationResult>)
          .then((resolvedValidation: ValidationResult) => {
            delete running[key];

            return this._handleValidation(resolvedValidation, { key, value });
          })
          .then(result => {
            this.trigger(AFTER_VALIDATION_EVENT, key);
            return result;
          });
      });
    }

    let result = this._handleValidation(validation as ValidationResult, { key, value });

    this.trigger(AFTER_VALIDATION_EVENT, key);

    return result;
  }

  /**
   * Manually add an error to the changeset. If there is an existing
   * error or change for `key`, it will be overwritten.
   *
   * @method addError
   */
  @bind
  public addError<T>(key: string, error: IErr<T> | ValidationErr) {
    // Construct new `Err` instance.
    let newError;

    const isIErr = <T>(error: unknown): error is IErr<T> =>
      isObject(error) && !Array.isArray(error);
    if (isIErr(error)) {
      assert('Error must have value.', error.hasOwnProperty('value') || error.value !== undefined);
      assert('Error must have validation.', error.hasOwnProperty('validation'));
      newError = new Err(error.value, error.validation);
    } else {
      let value = this.getValue(key);
      newError = new Err(value, error as ValidationErr);
    }

    // Add `key` to errors map.
    let errors: Errors<any> = this.__errors || {};
    // @tracked
    this.__errors = setDeep(errors, key, newError, {});
    this.__errorsCache = this.__errors;

    // Return passed-in `error`.
    return error;
  }

  @bind
  public pushErrors<T>(key: string, ...newErrors: string[] | ValidationErr[]): IErr<any> {
    let errors: Errors<any> = this.__errors;
    let existingError: IErr<any> | Err = getDeep(errors, key) || new Err(null, []);
    let validation: ValidationErr | ValidationErr[] = existingError.validation;
    let value: any = this.getValue(key);

    if (!Array.isArray(validation) && Boolean(validation)) {
      existingError.validation = [validation];
    }

    let v = existingError.validation;
    validation = [...v, ...newErrors];
    let newError = new Err(value, validation);
    // @tracked
    this.__errors = setDeep(errors, key as string, newError, { safeSet });
    this.__errorsCache = this.__errors;

    return { value, validation };
  }

  /**
   * Increment or decrement the number of running validations for a
   * given key.
   */
  private _setIsValidating(key: string, promise: Promise<ValidationResult>): void {
    let running: RunningValidations = this._runningValidations;
    setDeep(running, key, promise);
  }

  private clearPending() {
    this.__nestedProxies.clear();
    this.__changes.clear();
    this.__errors = {};
    this.__errorsCache = {};
  }

  private markChange(localKey: string, value: any) {
    const oldValue = Reflect.get(this.__data, localKey);
    const unchanged = isUnchanged(value, oldValue);
    let changes = this.__changes;
    if (changes.has(localKey)) {
      // we have a pending change
      // modify it or delete
      if (unchanged) {
        // we're back to the original value
        // so delete the change
        changes.delete(localKey);
      } else {
        // we know the key exists so the cast is safe
        changes.set(localKey, value);
      }
    } else if (!unchanged) {
      // create a new pending change
      changes.set(localKey, value);
    }
  }

  // /**
  //  * String representation for the changeset.
  //  */
  // get [Symbol.toStringTag](): string {
  //   let normalisedContent: object = pureAssign(this.__data, {});
  //   return `changeset:${normalisedContent.toString()}`;
  // }

  private addProxy(key: string, value?: {}): any {
    // get sends just the key
    // set sends the key and the new value
    if (value === undefined) {
      // use the original
      value = Reflect.get(this.__data, key);
    }
    if (value === undefined) {
      // missing on original but added in the changeset
      value = {};
    }
    let options = this.__options;
    if (options.changesetKeys) {
      // filter the changeset keys for the child
      let filteredKeys: any[] | undefined = [];
      let foundLeafNode = false;
      for (let changesetKey of options.changesetKeys) {
        let [localKey, subkey] = splitKey(changesetKey);
        if (localKey === key) {
          if (subkey) {
            filteredKeys.push(subkey);
          } else {
            // this is the leaf node of the changeset key
            // so allow all changes below here
            foundLeafNode = true;
          }
        }
      }
      if (foundLeafNode && filteredKeys.length == 0) {
        filteredKeys = undefined;
      }
      // make a copy
      options = Object.assign({}, options);
      options.changesetKeys = filteredKeys;
    }
    let proxy = new Proxy(value, handlerFor(value, options));
    this.__nestedProxies.set(key, proxy);
    return proxy;
  }

  private isKeyFilteredOut(key: string) {
    return (
      this.__localChangesetKeyFilters !== undefined &&
      !this.__localChangesetKeyFilters.includes(key)
    );
  }

  private trigger(eventName: string, ...args: any[]): void {
    const notifier = this.notifierForEvent(eventName);
    if (notifier) {
      notifier.trigger(...args);
    }
  }

  private notifierForEvent(eventName: string): Notifier<any> {
    let notifiers = this.__eventedNotifiers;
    if (notifiers === undefined) {
      notifiers = this.__eventedNotifiers = new Map<string, Notifier<any>>();
    }

    if (!notifiers.has(eventName)) {
      notifiers.set(eventName, new Notifier());
    }

    let notifier = notifiers.get(eventName) as Notifier<any>;

    return notifier;
  }

  private __options: ProxyOptions;
  private _runningValidations: RunningValidations = {};
  private __localChangesetKeyFilters?: string[]; // only where our property is the leaf
  private __data: Content;
  private __errors: Errors<any> = {};
  private __errorsCache: Errors<any> = {};
  private __undoState: Map<string, any> | undefined;
  private __undoStateProxies: Map<string, any> | undefined;
  private __nestedProxies: Map<string, any>;
  private __changes: Map<string, any> = new Map<string, any>();
  private __eventedNotifiers?: Map<string, Notifier<any>>;
  private __outerProxy!: Record<string, any>;
  private __prepareFn?: PrepareChangesFn;
}
