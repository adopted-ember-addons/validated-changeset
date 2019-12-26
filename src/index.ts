import Change from './-private/change';
import { getKeyValues } from './utils/get-key-values';
import { notifierForEvent } from './-private/evented';
import Err from './-private/err';
import normalizeObject from './utils/normalize-object';
import pureAssign from './utils/assign';
import isChangeset, { CHANGESET } from './utils/is-changeset';
import isObject from './utils/is-object';
import isPromise from './utils/is-promise';
import mergeNested from './utils/merge-nested';
import objectWithout from './utils/object-without';
import take from './utils/take';
import mergeDeep from './utils/merge-deep';
import setDeep from './utils/set-deep';
import getDeep from './utils/get-deep';
import {
  Changes,
  Config,
  Content,
  Errors,
  IErr,
  IChangeset,
  INotifier,
  InternalMap,
  NewProperty,
  PrepareChangesFn,
  RunningValidations,
  Snapshot,
  ValidationErr,
  ValidationResult,
  ValidatorAction,
  ValidatorMap
} from './types';

const { assign, keys } = Object;
const CONTENT = '_content';
const CHANGES = '_changes';
const ERRORS = '_errors';
const VALIDATOR = '_validator';
const OPTIONS = '_options';
const RUNNING_VALIDATIONS = '_runningValidations';
const BEFORE_VALIDATION_EVENT = 'beforeValidation';
const AFTER_VALIDATION_EVENT = 'afterValidation';
const AFTER_ROLLBACK_EVENT = 'afterRollback';
const defaultValidatorFn = () => true;
const defaultOptions = { skipValidate: false };

const DEBUG = process.env.NODE_ENV !== 'production';

function assert(msg: string, property: unknown): void {
  if (DEBUG) {
    if (!property) {
      throw new Error(msg);
    }
  }
}

export class BufferedChangeset implements IChangeset {
  constructor(
    obj: object,
    public validateFn: ValidatorAction = defaultValidatorFn,
    public validationMap: ValidatorMap = {},
    options: Config = {}
  ) {
    this[CONTENT] = obj;
    this[CHANGES] = {};
    this[ERRORS] = {};
    this[VALIDATOR] = validateFn;
    this[OPTIONS] = pureAssign(defaultOptions, options);
    this[RUNNING_VALIDATIONS] = {};
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
  [CHANGES]: Changes;
  [ERRORS]: Errors<any>;
  [VALIDATOR]: ValidatorAction;
  [OPTIONS]: {};
  [RUNNING_VALIDATIONS]: {};

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
   * @property safeGet
   * @override
   */
  safeGet(obj: any, key: string) {
    return obj[key];
  }

  get _bareChanges() {
    function transform(c: Change) {
      return c.value;
    }

    let obj = this[CHANGES];

    return keys(obj).reduce((newObj: { [key: string]: any }, key: string) => {
      newObj[key] = transform(obj[key]);
      return newObj;
    }, Object.create(null));
  }

  /**
   * @property changes
   * @type {Array}
   */
  get changes() {
    let obj = this[CHANGES];

    // [{ key, value }, ...]
    return getKeyValues(obj);
  }

  // TODO: iterate and find all leaf errors
  // can only provide leaf key
  get errors() {
    let obj = this[ERRORS];

    function transform(e: Err) {
      return { value: e.value, validation: e.validation };
    }

    return keys(obj).map(key => {
      let value = transform(obj[key]);

      if (isObject(value)) {
        return assign({ key }, value);
      }

      return { key, value };
    });
  }

  get change() {
    let obj: Changes = this[CHANGES];
    return normalizeObject(obj);
  }

  get error() {
    let obj: Errors<any> = this[ERRORS];
    // TODO: whyy?
    return JSON.parse(JSON.stringify(obj));
  }

  get data() {
    return this[CONTENT];
  }

  /**
   * @property isValid
   * @type {Array}
   */
  get isValid() {
    return getKeyValues(this[ERRORS]).length === 0;
  }
  /**
   * @property isPristine
   * @type {Boolean}
   */
  get isPristine() {
    return Object.keys(this[CHANGES]).length === 0;
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
    let skipValidate: boolean | undefined = config['skipValidate'];

    if (skipValidate) {
      let content: Content = this[CONTENT];
      let oldValue = this.safeGet(content, key);
      this._setProperty({ key, value, oldValue });
      this._handleValidation(true, { key, value });
      return;
    }

    let content: Content = this[CONTENT];
    let oldValue: any = this.safeGet(content, key);
    this._setProperty({ key, value, oldValue });
    this._validateKey(key, value);
  }

  /**
   * String representation for the changeset.
   */
  toString(): string {
    let normalisedContent: object = pureAssign(this[CONTENT], {});
    return `changeset:${normalisedContent.toString()}`;
  }

  /**
   * Provides a function to run before emitting changes to the model. The
   * callback function must return a hash in the same shape:
   *
   * ```
   * changeset
   *   .prepare((changes) => {
   *     let modified = {};
   *
   *     for (let key in changes) {
   *       modified[underscore(key)] = changes[key];
   *     }
   *
   *    return modified; // { first_name: "Jim", last_name: "Bob" }
   *  })
   *  .execute(); // execute the changes
   * ```
   *
   * @method prepare
   */
  prepare(prepareChangesFn: PrepareChangesFn): this {
    let changes: { [s: string]: any } = this._bareChanges;
    let preparedChanges = prepareChangesFn(changes);

    assert('Callback to `changeset.prepare` must return an object', isObject(preparedChanges));

    let newObj: Changes = {};
    if (isObject(preparedChanges)) {
      let newChanges: Changes = keys(preparedChanges as Record<string, any>).reduce(
        (newObj: Changes, key: keyof Changes) => {
          newObj[key] = new Change((preparedChanges as Record<string, any>)[key]);
          return newObj;
        },
        newObj
      );

      // @tracked
      this[CHANGES] = newChanges;
    }

    return this;
  }

  /**
   * Executes the changeset if in a valid state.
   *
   * @method execute
   */
  execute(): this {
    if (this.isValid && this.isDirty) {
      let content: Content = this[CONTENT];
      let changes: Changes = this[CHANGES];
      // we want mutation on original object
      // @tracked
      this[CONTENT] = mergeDeep(content, changes);
    }

    return this;
  }

  /**
   * Executes the changeset and saves the underlying content.
   *
   * @method save
   * @param {Object} options optional object to pass to content save method
   */
  async save(options?: object): Promise<IChangeset | any> {
    let content: Content = this[CONTENT];
    let savePromise: any | Promise<BufferedChangeset | any> = Promise.resolve(this);
    this.execute();

    if (typeof content.save === 'function') {
      savePromise = content.save(options);
    } else if (typeof content.save === 'function') {
      // we might be getting this off a proxy object.  For example, when a
      // belongsTo relationship (a proxy on the parent model)
      // another way would be content(belongsTo).content.save
      let saveFunc: Function = content.save;
      if (saveFunc) {
        savePromise = saveFunc(options);
      }
    }

    const result = await savePromise;

    this.rollback();
    return result;
  }

  /**
   * Merges 2 valid changesets and returns a new changeset. Both changesets
   * must point to the same underlying object. The changeset target is the
   * origin. For example:
   *
   * ```
   * let changesetA = new Changeset(user, validatorFn);
   * let changesetB = new Changeset(user, validatorFn);
   * changesetA.set('firstName', 'Jim');
   * changesetB.set('firstName', 'Jimmy');
   * changesetB.set('lastName', 'Fallon');
   * let changesetC = changesetA.merge(changesetB);
   * changesetC.execute();
   * user.get('firstName'); // "Jimmy"
   * user.get('lastName'); // "Fallon"
   * ```
   *
   * @method merge
   */
  merge(changeset: this): this {
    let content: Content = this[CONTENT];
    assert('Cannot merge with a non-changeset', isChangeset(changeset));
    assert('Cannot merge with a changeset of different content', changeset[CONTENT] === content);

    if (this.isPristine && changeset.isPristine) {
      return this;
    }

    let c1: Changes = this[CHANGES];
    let c2: Changes = changeset[CHANGES];
    let e1: Errors<any> = this[ERRORS];
    let e2: Errors<any> = changeset[ERRORS];

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    let newChangeset: any = new ValidatedChangeset(content, this[VALIDATOR]); // ChangesetDef
    let newErrors: Errors<any> = objectWithout(keys(c2), e1);
    let newChanges: Changes = objectWithout(keys(e2), c1);
    let mergedErrors: Errors<any> = mergeNested(newErrors, e2);
    let mergedChanges: Changes = mergeNested(newChanges, c2);

    newChangeset[ERRORS] = mergedErrors;
    newChangeset[CHANGES] = mergedChanges;
    newChangeset._notifyVirtualProperties();
    return newChangeset;
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
      if (errorKeys.indexOf(key) > -1) {
        this[CHANGES] = this._deleteKey(CHANGES, key) as Changes;
      }
    } else {
      this._notifyVirtualProperties();
      this[ERRORS] = {};

      // if on CHANGES hash, rollback those as well
      errorKeys.forEach(errKey => {
        this[CHANGES] = this._deleteKey(CHANGES, errKey) as Changes;
      });
    }

    return this;
  }

  /**
   * Discards changes/errors for the specified properly only.
   *
   * @public
   * @chainable
   * @method rollbackProperty
   * @param {String} key key to delete off of changes and errors
   * @return {Changeset}
   */
  rollbackProperty(key: string): this {
    // @tracked
    this[CHANGES] = this._deleteKey(CHANGES, key) as Changes;
    // @tracked
    this[ERRORS] = this._deleteKey(ERRORS, key) as Errors<any>;

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
  validate(...validationKeys: string[]): Promise<any> {
    if (keys(this.validationMap as object).length === 0) {
      return Promise.resolve(null);
    }

    validationKeys =
      validationKeys.length > 0 ? validationKeys : keys(this.validationMap as object);

    let maybePromise = validationKeys.map(key => {
      const x = this._validateKey(key as string, this._valueFor(key as string));
      return x;
    });

    return Promise.all(maybePromise);
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
      isObject(error) && !Array.isArray(error);
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
    this[ERRORS] = this.setDeep(errors, key, newError);

    // Return passed-in `error`.
    return error;
  }

  /**
   * Manually push multiple errors to the changeset as an array.
   * key maybe in form 'name.short' so need to get deep
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
    this[ERRORS] = this.setDeep(errors, key as string, newError);

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
      changes: keys(changes).reduce((newObj: Changes, key: keyof Changes) => {
        newObj[key] = changes[key].value;
        return newObj;
      }, {}),

      errors: keys(errors).reduce((newObj: Errors<any>, key: keyof Errors<any>) => {
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
  restore({ changes, errors }: Snapshot): this {
    let newChanges: Changes = keys(changes).reduce((newObj: Changes, key: keyof Changes) => {
      newObj[key] = new Change(changes[key]);
      return newObj;
    }, {});

    let newErrors: Errors<any> = keys(errors).reduce((newObj: Errors<any>, key: keyof Changes) => {
      let e: IErr<any> = errors[key];
      newObj[key] = new Err(e.value, e.validation);
      return newObj;
    }, {});

    // @tracked
    this[CHANGES] = newChanges;
    // @tracked
    this[ERRORS] = newErrors;

    this._notifyVirtualProperties();
    return this;
  }

  /**
   * Unlike `Ecto.Changeset.cast`, `cast` will take allowed keys and
   * remove unwanted keys off of the changeset. For example, this method
   * can be used to only allow specified changes through prior to saving.
   *
   * @method cast
   */
  cast(allowed: string[] = []): this {
    let changes: Changes = this[CHANGES];

    if (Array.isArray(allowed) && allowed.length === 0) {
      return this;
    }

    let changeKeys: string[] = keys(changes);
    let validKeys = changeKeys.filter((key: string) => allowed.includes(key));
    let casted = take(changes, validKeys);
    // @tracked
    this[CHANGES] = casted;
    return this;
  }

  /**
   * Checks to see if async validator for a given key has not resolved.
   * If no key is provided it will check to see if any async validator is running.
   *
   * @method isValidating
   */
  isValidating(key?: string | void): boolean {
    let runningValidations: RunningValidations = this[RUNNING_VALIDATIONS];
    let ks: string[] = keys(runningValidations);
    if (key) {
      return ks.includes(key);
    }
    return ks.length > 0;
  }

  /**
   * Validates a specific key
   *
   * @method _validateKey
   * @private
   */
  _validateKey<T>(
    key: string,
    value: T
  ): Promise<ValidationResult | T | IErr<T>> | T | IErr<T> | ValidationResult {
    let content: Content = this[CONTENT];
    let oldValue: any = this.safeGet(content, key);
    let validation: ValidationResult | Promise<ValidationResult> = this._validate(
      key,
      value,
      oldValue
    );

    this.trigger(BEFORE_VALIDATION_EVENT, key);

    // TODO: Address case when Promise is rejected.
    if (isPromise(validation)) {
      this._setIsValidating(key, true);

      return (validation as Promise<ValidationResult>).then(
        (resolvedValidation: ValidationResult) => {
          this._setIsValidating(key, false);
          this.trigger(AFTER_VALIDATION_EVENT, key);

          return this._handleValidation(resolvedValidation, { key, value });
        }
      );
    }

    let result = this._handleValidation(validation as ValidationResult, { key, value });

    this.trigger(AFTER_VALIDATION_EVENT, key);

    return result;
  }

  /**
   * Takes resolved validation and adds an error or simply returns the value
   *
   * @method _handleValidation
   * @private
   */
  _handleValidation<T>(
    validation: ValidationResult,
    { key, value }: NewProperty<T>
  ): T | IErr<T> | ValidationErr {
    const isValid: boolean =
      validation === true ||
      (Array.isArray(validation) && validation.length === 1 && validation[0] === true);

    // Happy path: remove `key` from error map.
    // @tracked
    this[ERRORS] = this._deleteKey(ERRORS, key) as Errors<any>;

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
  _validate(
    key: string,
    newValue: unknown,
    oldValue: unknown
  ): ValidationResult | Promise<ValidationResult> {
    let validator: ValidatorAction = this[VALIDATOR];
    let content: Content = this[CONTENT];

    if (typeof validator === 'function') {
      let isValid = validator({
        key,
        newValue,
        oldValue,
        changes: this.change,
        content
      });

      return typeof isValid === 'boolean' || Boolean(isValid) ? isValid : true;
    }

    return true;
  }

  /**
   * Sets property or error on the changeset.
   * Returns value or error
   */
  _setProperty<T>({ key, value, oldValue }: NewProperty<T>): void {
    let changes: Changes = this[CHANGES];

    // Happy path: update change map.
    if (oldValue !== value) {
      // @tracked
      this[CHANGES] = this.setDeep(changes, key, new Change(value));
    } else if (key in changes) {
      // @tracked
      this[CHANGES] = this._deleteKey(CHANGES, key) as Changes;
    }
  }

  /**
   * Increment or decrement the number of running validations for a
   * given key.
   */
  _setIsValidating(key: string, value: boolean): void {
    let running: RunningValidations = this[RUNNING_VALIDATIONS];
    let count: number = running[key] || 0;

    if (!value && count === 1) {
      delete running[key];
      return;
    }

    this.setDeep(running, key, value ? count + 1 : count - 1);
  }

  /**
   * Value for change/error/content or the original value.
   */
  _valueFor(key: string): any {
    let changes: Changes = this[CHANGES];
    let errors: Errors<any> = this[ERRORS];
    let content: Content = this[CONTENT];

    if (errors.hasOwnProperty(key)) {
      let e: Err = errors[key];
      return e.value;
    }

    // 'person'
    if (Object.prototype.hasOwnProperty.apply(changes, [key])) {
      let result: Change = changes[key];
      if (isObject(result)) {
        return normalizeObject(result);
      }

      return result.value;
    }

    // 'person.username'
    let [baseKey, ...remaining] = key.split('.');
    if (Object.prototype.hasOwnProperty.apply(changes, [baseKey])) {
      let c: Change = changes[baseKey];
      let result = this.getDeep(normalizeObject(c), remaining.join('.'));
      // just b/c top level key exists doesn't mean it has the nested key we are looking for
      if (result) {
        return result;
      }
    }

    let original: any = this.getDeep(content, key);
    return original;
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
      while (isObject(currentNode) && currentKey) {
        let curr: { [key: string]: unknown } = currentNode;
        if (curr.value || curr.validation) {
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

    if (Object.prototype.hasOwnProperty.call(this[CHANGES], baseKey)) {
      let changes: Changes = this[CHANGES];
      let result;

      if (remaining.length > 0) {
        let c = changes[baseKey];
        result = this.getDeep(normalizeObject(c), remaining.join('.'));
        if (result) {
          return result;
        }
      } else {
        result = changes[baseKey];
      }

      if (result && isObject(result)) {
        return normalizeObject(result);
      }

      if (result) {
        return result.value;
      }
    }

    // return getters/setters/methods on BufferedProxy instance
    if (this[key]) {
      return this[key];
    } else if (this[baseKey]) {
      const v: unknown = this[baseKey];
      if (isObject(v)) {
        const result = this.getDeep(v as Record<string, any>, remaining.join('.'));
        return result;
      }
    }

    // finally return on underlying object
    let content: Content = this[CONTENT];
    const result = this.getDeep(content, key);
    return result;
  }

  set<T>(
    key: string,
    value: T
  ): void | Promise<ValidationResult | T | IErr<T>> | T | IErr<T> | ValidationResult {
    if (this.hasOwnProperty(key) || key in this) {
      this[key] = value;
      return;
    }

    this.setUnknownProperty(key, value);
  }
}

/**
 * Creates new changesets.
 */
export function changeset(
  obj: object,
  validateFn?: ValidatorAction,
  validationMap?: ValidatorMap | null | undefined,
  options?: Config
): BufferedChangeset {
  return new BufferedChangeset(obj, validateFn, validationMap, options);
}

type T20 = InstanceType<typeof BufferedChangeset>;

export class ValidatedChangeset {
  /**
   * Changeset factory class if you need to extend
   *
   * @class ValidatedChangeset
   * @constructor
   */
  constructor(
    obj: object,
    validateFn?: ValidatorAction,
    validationMap?: ValidatorMap | null | undefined,
    options?: Config
  ) {
    const c: BufferedChangeset = changeset(obj, validateFn, validationMap, options);

    return new Proxy(c, {
      get(targetBuffer, key /*, receiver*/) {
        const res = targetBuffer.get(key.toString());
        return res;
      },

      set(targetBuffer, key, value /*, receiver*/) {
        targetBuffer.set(key.toString(), value);
        return true;
      }
    }) as T20;
  }
}

export function Changeset(
  obj: object,
  validateFn?: ValidatorAction,
  validationMap?: ValidatorMap | null | undefined,
  options?: Config
): BufferedChangeset {
  const c: BufferedChangeset = changeset(obj, validateFn, validationMap, options);

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
