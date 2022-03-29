import Change, { getChangeValue, isChange } from './-private/change';
import { getKeyValues, getKeyErrorValues } from './utils/get-key-values';
import { notifierForEvent } from './-private/evented';
import Err from './-private/err';
import { hasKey, pathInChanges } from './utils/has-key';
import normalizeObject from './utils/normalize-object';
import { hasChanges } from './utils/has-changes';
import pureAssign from './utils/assign';
import { CHANGESET } from './utils/is-changeset';
import isObject from './utils/is-object';
import keyInObject from './utils/key-in-object';
import { buildOldValues } from './utils/build-old-values';
import { ObjectTreeNode } from './utils/object-tree-node';
import mergeDeep from './utils/merge-deep';
import setDeep from './utils/set-deep';
import getDeep, { getSubObject } from './utils/get-deep';
import { objectToArray, arrayToObject } from './utils/array-object';

import {
  Changes,
  Config,
  Content,
  Errors,
  IErr,
  INotifier,
  InternalMap,
  NewProperty,
  Snapshot,
  ValidationErr,
  ValidatorKlass
} from './types';

const { keys } = Object;
const CONTENT = '_content';
const PREVIOUS_CONTENT = '_previousContent';
const CHANGES = '_changes';
const ORIGINAL = '_original';
const ERRORS = '_errors';
const ERRORS_CACHE = '_errorsCache';
const VALIDATOR = '_validator';
const OPTIONS = '_options';
const AFTER_ROLLBACK_EVENT = 'afterRollback';

const DEBUG = process.env.NODE_ENV !== 'production';

function assert(msg: string, property: unknown): void {
  if (DEBUG) {
    if (!property) {
      throw new Error(msg);
    }
  }
}

function maybeUnwrapProxy(content: Content): any {
  return content;
}

export function newFormat(
  obj: Record<string, any>[],
  original: any,
  getDeep: Function
): Record<string, any> {
  let newFormat: Record<string, any> = {};
  for (let item of obj) {
    const { key, value } = item;
    newFormat[key] = {
      current: value,
      original: getDeep(original, key)
    };
  }

  return newFormat;
}

// This is intended to provide an alternative changeset structure compatible with `yup`
// This slims down the set of features, including removed APIs and `validate` returns just the `validate(obj)` method call and requires users to manually add errors.
export class ValidatedChangeset {
  constructor(obj: object, public Validator: ValidatorKlass, options: Config = {}) {
    this[CONTENT] = obj;
    this[PREVIOUS_CONTENT] = undefined;
    this[CHANGES] = {};
    this[VALIDATOR] = Validator;
    this[OPTIONS] = options;

    this[ERRORS] = {};
    this[ERRORS_CACHE] = {};
  }

  /**
   * Any property that is not one of the getter/setter/methods on the
   * BufferedProxy instance. The value type is `unknown` in order to avoid
   * having to predefine key/value pairs of the correct types in the target
   * object. Setting the index signature to `[key: string]: T[K]` would allow us
   * to typecheck the value that is set on the proxy. However, no
   * getters/setters/methods can be added to the class. This is the tradeoff
   * we make for this particular design pattern (class based BufferedProxy).
   */
  [key: string]: unknown;
  [CONTENT]: object;
  [PREVIOUS_CONTENT]: object | undefined;
  [ORIGINAL]: Changes;
  [CHANGES]: Changes;
  [ERRORS]: Errors<any>;
  [ERRORS_CACHE]: Errors<any>;
  [VALIDATOR]: ValidatorKlass;
  [OPTIONS]: Config;

  __changeset__ = CHANGESET;

  _eventedNotifiers = {};

  on(eventName: string, callback: Function): INotifier {
    const notifier = notifierForEvent(this, eventName);
    return notifier.addListener(callback);
  }

  off(eventName: string, callback: Function): INotifier {
    const notifier = notifierForEvent(this, eventName);
    return notifier.removeListener(callback);
  }

  trigger(eventName: string, ...args: any[]): void {
    const notifier = notifierForEvent(this, eventName);
    if (notifier) {
      notifier.trigger(...args);
    }
  }

  /**
   * @property isObject
   * @override
   */
  isObject = isObject;

  /**
   * @property maybeUnwrapProxy
   * @override
   */
  maybeUnwrapProxy = maybeUnwrapProxy;

  /**
   * @property setDeep
   * @override
   */
  setDeep = setDeep;

  /**
   * @property getDeep
   * @override
   */
  getDeep = getDeep;

  /**
   * @property mergeDeep
   * @override
   */
  mergeDeep = mergeDeep;

  /**
   * @property safeGet
   * @override
   */
  safeGet(obj: any, key: string) {
    return obj[key];
  }

  /**
   * @property safeSet
   * @override
   */
  safeSet(obj: any, key: string, value: unknown) {
    return (obj[key] = value);
  }

  /**
   * @property changes
   * @type {Array}
   */
  get changes() {
    let obj = this[CHANGES];
    let original = this[CONTENT];

    // foo: {
    //  original: 0,
    //  current: 1,
    // }
    return newFormat(getKeyValues(obj), original, this.getDeep);
  }

  /**
   * @property errors
   * @type {Array}
   */
  get errors() {
    let obj = this[ERRORS];

    return getKeyErrorValues(obj);
  }

  get change() {
    let obj: Changes = this[CHANGES];
    if (hasChanges(this[CHANGES])) {
      return normalizeObject(obj);
    }

    return {};
  }

  get error() {
    return this[ERRORS];
  }

  get data() {
    return this[CONTENT];
  }

  /**
   * @property isValid
   * @type {Array}
   */
  get isValid() {
    return getKeyErrorValues(this[ERRORS]).length === 0;
  }
  /**
   * @property isPristine
   * @type {Boolean}
   */
  get isPristine() {
    let validationKeys = Object.keys(this[CHANGES]);
    const userChangesetKeys: string[] | undefined = this[OPTIONS].changesetKeys;
    if (Array.isArray(userChangesetKeys) && userChangesetKeys.length) {
      validationKeys = validationKeys.filter(k => userChangesetKeys.includes(k));
    }

    if (validationKeys.length === 0) {
      return true;
    }

    return !hasChanges(this[CHANGES]);
  }
  /**
   * @property isInvalid
   * @type {Boolean}
   */
  get isInvalid() {
    return !this.isValid;
  }
  /**
   * @property isDirty
   * @type {Boolean}
   */
  get isDirty() {
    return !this.isPristine;
  }

  /**
   * Stores change on the changeset.
   * This approximately works just like the Ember API
   *
   * @method setUnknownProperty
   */
  setUnknownProperty<T>(key: string, value: T): void {
    let config: Config = this[OPTIONS];
    let changesetKeys = config.changesetKeys;
    if (Array.isArray(changesetKeys) && changesetKeys.length > 0) {
      const hasKey = changesetKeys.find(chKey => key.match(chKey));
      if (!hasKey) {
        return;
      }
    }

    let content: Content = this[CONTENT];
    let oldValue = this.safeGet(content, key);

    this._setProperty({ key, value, oldValue });
  }

  /**
   * String representation for the changeset.
   */
  get [Symbol.toStringTag](): string {
    let normalisedContent: object = pureAssign(this[CONTENT], {});
    return `changeset:${normalisedContent.toString()}`;
  }

  /**
   * String representation for the changeset.
   */
  toString(): string {
    let normalisedContent: object = pureAssign(this[CONTENT], {});
    return `changeset:${normalisedContent.toString()}`;
  }

  /**
   * Executes the changeset if in a valid state.
   *
   * @method execute
   */
  execute(): this {
    let oldContent;
    if (this.isValid && this.isDirty) {
      let content: Content = this[CONTENT];
      let changes: Changes = this[CHANGES];

      // keep old values in case of error and we want to rollback
      oldContent = buildOldValues(content, getKeyValues(changes), this.getDeep);

      // we want mutation on original object
      // @tracked
      this[CONTENT] = this.mergeDeep(content, changes);
    }

    // trigger any registered callbacks by same keyword as method name
    this.trigger('execute');

    this[CHANGES] = {};
    this[PREVIOUS_CONTENT] = oldContent;

    return this;
  }

  unexecute(): this {
    if (this[PREVIOUS_CONTENT]) {
      this[CONTENT] = this.mergeDeep(this[CONTENT], this[PREVIOUS_CONTENT], {
        safeGet: this.safeGet,
        safeSet: this.safeSet
      });
    }

    return this;
  }

  /**
   * Returns the changeset to its pristine state, and discards changes and
   * errors.
   *
   * @method rollback
   */
  rollback(): this {
    // Get keys before reset.
    let keys = this._rollbackKeys();

    // Reset.
    this[CHANGES] = {};
    this[ERRORS] = {};
    this[ERRORS_CACHE] = {};
    this._notifyVirtualProperties(keys);

    this.trigger(AFTER_ROLLBACK_EVENT);
    return this;
  }

  /**
   * Discards any errors, keeping only valid changes.
   *
   * @public
   * @chainable
   * @method rollbackInvalid
   * @param {String} key optional key to rollback invalid values
   * @return {Changeset}
   */
  rollbackInvalid(key: string | void): this {
    let errorKeys = keys(this[ERRORS]);

    if (key) {
      this._notifyVirtualProperties([key]);
      // @tracked
      this[ERRORS] = this._deleteKey(ERRORS, key) as Errors<any>;
      this[ERRORS_CACHE] = this[ERRORS];
      if (errorKeys.indexOf(key) > -1) {
        this[CHANGES] = this._deleteKey(CHANGES, key) as Changes;
      }
    } else {
      this._notifyVirtualProperties();
      this[ERRORS] = {};
      this[ERRORS_CACHE] = this[ERRORS];

      // if on CHANGES hash, rollback those as well
      errorKeys.forEach(errKey => {
        this[CHANGES] = this._deleteKey(CHANGES, errKey) as Changes;
      });
    }

    return this;
  }

  /**
   * @method validate
   */
  async validate(): Promise<any> {
    const changes = this[CHANGES];
    const content = this[CONTENT];

    return this.Validator.validate({ ...normalizeObject(content), ...normalizeObject(changes) });
  }

  /**
   * @method validateSync
   */
  async validateSync(): Promise<any> {
    const changes = this[CHANGES];
    const content = this[CONTENT];

    return this.Validator.validateSync(
      { ...normalizeObject(content), ...normalizeObject(changes) },
      { abortEarly: false }
    );
  }

  /**
   * Manually add an error to the changeset. If there is an existing
   * error or change for `key`, it will be overwritten.
   *
   * @method addError
   */
  addError<T>(key: string, error: IErr<T> | ValidationErr) {
    // Construct new `Err` instance.
    let newError;

    const isIErr = <T>(error: unknown): error is IErr<T> =>
      this.isObject(error) && !Array.isArray(error);
    if (isIErr(error)) {
      assert('Error must have value.', error.hasOwnProperty('value') || error.value !== undefined);
      assert('Error must have validation.', error.hasOwnProperty('validation'));
      newError = new Err(error.value, error.validation);
    } else {
      let value = this[key];
      newError = new Err(value, error as ValidationErr);
    }

    // Add `key` to errors map.
    let errors: Errors<any> = this[ERRORS];
    // @tracked
    this[ERRORS] = this.setDeep(errors, key, newError, { safeSet: this.safeSet });
    this[ERRORS_CACHE] = this[ERRORS];

    // Return passed-in `error`.
    return newError;
  }

  /**
   * @method removeError
   */
  removeError<T>(key: string) {
    // Remove `key` to errors map.
    let errors: Errors<any> = this[ERRORS];
    // @tracked
    this[ERRORS] = this.setDeep(errors, key, null, { safeSet: this.safeSet });
    this[ERRORS] = this._deleteKey(ERRORS, key) as Errors<any>;
    this[ERRORS_CACHE] = this[ERRORS];
  }

  /**
   * @method removeError
   */
  removeErrors() {
    // @tracked
    this[ERRORS] = {};
    this[ERRORS_CACHE] = this[ERRORS];
  }

  /**
   * Manually push multiple errors to the changeset as an array.
   * key maybe in form 'name.short' so need to go deep
   *
   * @method pushErrors
   */
  pushErrors(key: string, ...newErrors: string[] | ValidationErr[]): IErr<any> {
    let errors: Errors<any> = this[ERRORS];
    let existingError: IErr<any> | Err = this.getDeep(errors, key) || new Err(null, []);
    let validation: ValidationErr | ValidationErr[] = existingError.validation;
    let value: any = this[key];

    if (!Array.isArray(validation) && Boolean(validation)) {
      existingError.validation = [validation];
    }

    let v = existingError.validation;
    validation = [...v, ...newErrors];
    let newError = new Err(value, validation);
    // @tracked
    this[ERRORS] = this.setDeep(errors, key as string, newError, { safeSet: this.safeSet });
    this[ERRORS_CACHE] = this[ERRORS];

    return { value, validation };
  }

  /**
   * Creates a snapshot of the changeset's errors and changes.
   *
   * @method snapshot
   */
  snapshot(): Snapshot {
    let changes: Changes = this[CHANGES];
    let errors: Errors<any> = this[ERRORS];

    return {
      changes: this.getChangesForSnapshot(changes),

      errors: keys(errors).reduce((newObj: Errors<any>, key: keyof Errors<any>) => {
        let e = errors[key];
        newObj[key] = { value: e.value, validation: e.validation };
        return newObj;
      }, {})
    };
  }

  private getChangesForSnapshot(changes: Changes) {
    return keys(changes).reduce((newObj: Changes, key: keyof Changes) => {
      newObj[key] = isChange(changes[key])
        ? getChangeValue(changes[key])
        : this.getChangesForSnapshot(changes[key]);
      return newObj;
    }, {});
  }

  /**
   * Restores a snapshot of changes and errors. This overrides existing
   * changes and errors.
   *
   * @method restore
   */
  restore({ changes, errors }: Snapshot): this {
    let newChanges: Changes = this.getChangesFromSnapshot(changes);

    let newErrors: Errors<any> = keys(errors).reduce((newObj: Errors<any>, key: keyof Changes) => {
      let e: IErr<any> = errors[key];
      newObj[key] = new Err(e.value, e.validation);
      return newObj;
    }, {});

    // @tracked
    this[CHANGES] = newChanges;
    // @tracked
    this[ERRORS] = newErrors;
    this[ERRORS_CACHE] = this[ERRORS];

    this._notifyVirtualProperties();
    return this;
  }

  private getChangesFromSnapshot(changes: Changes) {
    return keys(changes).reduce((newObj, key) => {
      newObj[key] = this.getChangeForProp(changes[key]);
      return newObj;
    }, {} as Changes);
  }

  private getChangeForProp(value: any) {
    if (!isObject(value)) {
      return new Change(value);
    }

    return keys(value).reduce((newObj, key) => {
      newObj[key] = this.getChangeForProp(value[key]);
      return newObj;
    }, {} as Changes);
  }

  /**
   * Sets property on the changeset.
   */
  _setProperty<T>({ key, value, oldValue }: NewProperty<T>): void {
    let changes: Changes = this[CHANGES];

    // Happy path: update change map.
    if (!isEqual(value, oldValue) || oldValue === undefined) {
      // @tracked
      let result: Changes = this.setDeep(changes, key, new Change(value), {
        safeSet: this.safeSet
      });

      this[CHANGES] = result;
    } else if (keyInObject(changes, key)) {
      // @tracked
      // remove key if setting back to original
      this[CHANGES] = this._deleteKey(CHANGES, key) as Changes;
    }
  }

  /**
   * Notifies virtual properties set on the changeset of a change.
   * You can specify which keys are notified by passing in an array.
   *
   * @private
   * @param {Array} keys
   * @return {Void}
   */
  _notifyVirtualProperties(keys?: string[]): string[] | undefined {
    if (!keys) {
      keys = this._rollbackKeys();
    }

    return keys;
  }

  /**
   * Gets the changes and error keys.
   */
  _rollbackKeys(): string[] {
    let changes: Changes = this[CHANGES];
    let errors: Errors<any> = this[ERRORS];
    return [...new Set([...keys(changes), ...keys(errors)])];
  }

  /**
   * Deletes a key off an object and notifies observers.
   */
  _deleteKey(objName: string, key = ''): InternalMap {
    let obj = this[objName] as InternalMap;
    let keys = key.split('.');

    if (keys.length === 1 && obj.hasOwnProperty(key)) {
      delete obj[key];
    } else if (obj[keys[0]]) {
      let [base, ...remaining] = keys;
      let previousNode: { [key: string]: any } = obj;
      let currentNode: any = obj[base];
      let currentKey: string | undefined = base;

      // find leaf and delete from map
      while (this.isObject(currentNode) && currentKey) {
        let curr: { [key: string]: unknown } = currentNode;
        if (isChange(curr) || typeof curr.value !== 'undefined' || curr.validation) {
          delete previousNode[currentKey];
        }

        currentKey = remaining.shift();
        previousNode = currentNode;
        if (currentKey) {
          currentNode = currentNode[currentKey];
        }
      }
    }

    return obj;
  }

  get(key: string): any {
    // 'person'
    // 'person.username'
    let [baseKey, ...remaining] = key.split('.');
    let changes: Changes = this[CHANGES];
    let content: Content = this[CONTENT];
    if (Object.prototype.hasOwnProperty.call(changes, baseKey)) {
      const changesValue = this.getDeep(changes, key);
      const isObject = this.isObject(changesValue);

      if (!isObject && changesValue !== undefined) {
        // if safeGet returns a primitive, then go ahead return
        return changesValue;
      }
    }
    // At this point, we may have a changes object, a dot separated key, or a need to access the `key`
    // on `this` or `content`
    if (Object.prototype.hasOwnProperty.call(changes, baseKey) && hasChanges(changes)) {
      let baseChanges = changes[baseKey];

      // 'user.name'
      const normalizedBaseChanges = normalizeObject(baseChanges);
      if (this.isObject(normalizedBaseChanges)) {
        const result = this.maybeUnwrapProxy(
          this.getDeep(normalizedBaseChanges, remaining.join('.'))
        );

        // need to do this inside of Change object
        // basically anything inside of a Change object that is undefined means it was removed
        if (
          typeof result === 'undefined' &&
          pathInChanges(changes, key, this.safeGet) &&
          !hasKey(changes, key, this.safeGet) &&
          this.getDeep(content, key)
        ) {
          return;
        }

        if (this.isObject(result)) {
          if (isChange(result)) {
            return getChangeValue(result);
          }

          const baseContent = this.safeGet(content, baseKey) || {};
          const subContent = this.getDeep(baseContent, remaining.join('.'));
          const subChanges = getSubObject(changes, key);
          // give back an object that can further retrieve changes and/or content
          const tree = new ObjectTreeNode(subChanges, subContent, this.getDeep, this.isObject);
          return tree.proxy;
        } else if (typeof result !== 'undefined') {
          return result;
        }
      }

      // this comes after the isObject check to ensure we don't lose remaining keys
      if (isChange(baseChanges) && remaining.length === 0) {
        return getChangeValue(baseChanges);
      }
    }

    // return getters/setters/methods on BufferedProxy instance
    if (baseKey in this || key in this) {
      return this.getDeep(this, key);
    }

    const subContent = this.maybeUnwrapProxy(this.getDeep(content, key));
    if (this.isObject(subContent)) {
      let subChanges = this.getDeep(changes, key);
      if (!subChanges) {
        // if no changes, we need to add the path to the existing changes (mutate)
        // so further access to nested keys works
        subChanges = this.getDeep(this.setDeep(changes, key, {}), key);
      }

      // may still access a value on the changes or content objects
      const tree = new ObjectTreeNode(subChanges, subContent, this.getDeep, this.isObject);
      return tree.proxy;
    } else if (Array.isArray(subContent)) {
      let subChanges = this.getDeep(changes, key);
      if (!subChanges) {
        // return array of contents. Dont need to worry about further access sibling keys in array case
        return subContent;
      }

      if (isObject(subChanges)) {
        if (isObject(subContent)) {
          subChanges = normalizeObject(subChanges, this.isObject);
          return { ...subContent, ...subChanges };
        } else if (Array.isArray(subContent)) {
          subChanges = normalizeObject(subChanges, this.isObject);

          return objectToArray(mergeDeep(arrayToObject(subContent), subChanges));
        }
      }

      return subChanges;
    }

    return subContent;
  }

  set<T>(key: string, value: T): void {
    if (this.hasOwnProperty(key) || keyInObject(this, key)) {
      this[key] = value;
    } else {
      this.setUnknownProperty(key, value);
    }
  }
}

/**
 * Creates new changesets.
 */
export function changeset(
  obj: object,
  validatorKlass: ValidatorKlass,
  options?: Config
): ValidatedChangeset {
  return new ValidatedChangeset(obj, validatorKlass, options);
}

type T20 = InstanceType<typeof ValidatedChangeset>;

export function Changeset(
  obj: object,
  validatorKlass: ValidatorKlass,
  options?: Config
): ValidatedChangeset {
  const c: ValidatedChangeset = changeset(obj, validatorKlass, options);

  return new Proxy(c, {
    get(targetBuffer, key /*, receiver*/) {
      const res = targetBuffer.get(key.toString());
      return res;
    },

    set(targetBuffer, key, value /*, receiver*/) {
      targetBuffer.set(key.toString(), value);
      return true;
    }
  });
}

// determine if two values are equal
function isEqual(v1: unknown, v2: unknown) {
  if (v1 instanceof Date && v2 instanceof Date) {
    return v1.getTime() === v2.getTime();
  }

  return v1 === v2;
}
