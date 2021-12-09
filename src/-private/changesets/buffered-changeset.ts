import assert from '../utils/assert';
import isObject from '../../utils/is-object';
import {
  pureAssign,
  CHANGESET,
  setDeep,
  getDeep,
  mergeDeep,
  getKeyValues,
  normalizeObject,
  Change,
  buildOldValues,
  isChangeset,
  ValidatedChangeset,
  objectWithout,
  mergeNested,
  Err,
  getChangeValue,
  take,
  isPromise,
  keyInObject,
  isChange
} from '../..';
import { notifierForEvent } from '..';
import { defaultValidatorFn, defaultOptions, keys } from '../utils/consts';
import maybeUnwrapProxy from '../utils/maybe-unwrap-proxy';
import {
  CONTENT,
  PREVIOUS_CONTENT,
  CHANGES,
  ERRORS,
  VALIDATOR,
  OPTIONS,
  RUNNING_VALIDATIONS,
  AFTER_ROLLBACK_EVENT,
  BEFORE_VALIDATION_EVENT,
  AFTER_VALIDATION_EVENT,
  ERRORS_CACHE,
  EXECUTE_EVENT
} from '../utils/strings';
import {
  IChangeset,
  ValidatorAction,
  ValidatorMap,
  Config,
  Changes,
  Errors,
  INotifier,
  Content,
  PrepareChangesFn,
  IErr,
  ValidationErr,
  Snapshot,
  RunningValidations,
  ValidationResult,
  NewProperty,
  InternalMap
} from '../../types';
import { getKeyErrorValues } from '../../utils';
import { objectToArray, arrayToObject } from '../../utils/array-object';
import { flattenValidations } from '../../utils/flatten-validations';
import { getSubObject } from '../../utils/get-deep';
import { hasChanges } from '../../utils/has-changes';
import { pathInChanges, hasKey } from '../../utils/has-key';
import { ObjectTreeNode } from '../../utils/object-tree-node';
import isEqual from '../utils/is-equal';

export class BufferedChangeset implements IChangeset {
  constructor(
    obj: object,
    public validateFn: ValidatorAction = defaultValidatorFn,
    public validationMap: ValidatorMap = {},
    options: Config = {}
  ) {
    this[CONTENT] = obj;
    this[PREVIOUS_CONTENT] = undefined;
    this[CHANGES] = {};
    this[ERRORS] = {};
    this[ERRORS_CACHE] = {};
    this[VALIDATOR] = validateFn;
    this[OPTIONS] = pureAssign(defaultOptions, JSON.parse(JSON.stringify(options)));
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
  [PREVIOUS_CONTENT]: object | undefined;
  [CHANGES]: Changes;
  [ERRORS]: Errors<any>;
  [ERRORS_CACHE]: Errors<any>;
  [VALIDATOR]: ValidatorAction;
  [OPTIONS]: Config;
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

  get _bareChanges() {
    let obj = this[CHANGES];

    return getKeyValues(obj).reduce((newObj: { [key: string]: any }, { key, value }) => {
      newObj[key] = value;
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

  /**
   * @property errors
   * @type {Array}
   */
  get errors() {
    let obj = this[ERRORS];

    // [{ key, validation, value }, ...]
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

    let skipValidate: boolean | undefined = config.skipValidate;
    if (skipValidate) {
      this._setProperty({ key, value, oldValue });
      this._handleValidation(true, { key, value });
      return;
    }

    this._setProperty({ key, value, oldValue });
    this._validateKey(key, value);
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

    assert('Callback to `changeset.prepare` must return an object', this.isObject(preparedChanges));

    let newObj: Changes = {};
    if (this.isObject(preparedChanges)) {
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
    let oldContent;
    if (this.isValid && this.isDirty) {
      let content: Content = this[CONTENT];
      let changes: Changes = this[CHANGES];

      // keep old values in case of error and we want to rollback
      oldContent = buildOldValues(content, this.changes, this.getDeep);

      // we want mutation on original object
      // @tracked
      this[CONTENT] = this.mergeDeep(content, changes);
    }

    // trigger any registered callbacks by same keyword as method name
    this.trigger(EXECUTE_EVENT);

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
    } else if (typeof this.safeGet(content, 'save') === 'function') {
      // we might be getting this off a proxy object.  For example, when a
      // belongsTo relationship (a proxy on the parent model)
      // another way would be content(belongsTo).content.save
      let maybePromise = this.maybeUnwrapProxy(content).save();
      if (maybePromise) {
        savePromise = maybePromise;
      }
    }

    try {
      const result = await savePromise;

      // cleanup changeset
      this.rollback();

      return result;
    } catch (e) {
      throw e;
    }
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
    this[ERRORS_CACHE] = this[ERRORS];

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
  async validate(...validationKeys: string[]): Promise<any> {
    if (keys(this.validationMap as object).length === 0 && !validationKeys.length) {
      return Promise.resolve(null);
    }

    validationKeys =
      validationKeys.length > 0
        ? validationKeys
        : keys(flattenValidations(this.validationMap as object));

    let maybePromise = validationKeys.map(key => {
      const value: any = this[key];
      const resolvedValue = value instanceof ObjectTreeNode ? value.unwrap() : value;
      return this._validateKey(key, resolvedValue);
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
    return error;
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
      changes: keys(changes).reduce((newObj: Changes, key: keyof Changes) => {
        newObj[key] = getChangeValue(changes[key]);
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
    this[ERRORS_CACHE] = this[ERRORS];

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
    let oldValue: any = this.getDeep(content, key);
    let validation: ValidationResult | Promise<ValidationResult> = this._validate(
      key,
      value,
      oldValue
    );

    this.trigger(BEFORE_VALIDATION_EVENT, key);

    // TODO: Address case when Promise is rejected.
    if (isPromise(validation)) {
      this._setIsValidating(key, validation as Promise<ValidationResult>);

      let running: RunningValidations = this[RUNNING_VALIDATIONS];
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
    // ERRORS_CACHE to avoid backtracking Ember assertion.
    this[ERRORS] = this._deleteKey(ERRORS_CACHE, key) as Errors<any>;

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
   * Increment or decrement the number of running validations for a
   * given key.
   */
  _setIsValidating(key: string, promise: Promise<ValidationResult>): void {
    let running: RunningValidations = this[RUNNING_VALIDATIONS];
    this.setDeep(running, key, promise);
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

export type T20 = InstanceType<typeof BufferedChangeset>;
