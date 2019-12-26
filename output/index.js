'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class Change {
    constructor(value) {
        this.value = value;
    }
}

function isObject(val) {
    return typeof val === 'object';
}

/**
 * traverse through target and return leaf nodes with `value` property and key as 'person.name'
 *
 * @method getKeyValues
 * @return {Array} [{ 'person.name': value }]
 */
function getKeyValues(obj, keysUpToValue = []) {
    const map = [];
    for (let key in obj) {
        keysUpToValue.push(key);
        if (obj[key] && isObject(obj[key])) {
            if (Object.prototype.hasOwnProperty.call(obj[key], 'value')) {
                map.push({ key: keysUpToValue.join('.'), value: obj[key].value });
                // stop collecting keys
                keysUpToValue = [];
            }
            else if (key !== 'value') {
                map.push(...getKeyValues(obj[key], keysUpToValue));
            }
        }
    }
    return map;
}

// this statefull class holds and notifies
class Notifier {
    constructor() {
        this.listeners = [];
    }
    addListener(callback) {
        this.listeners.push(callback);
        return () => this.removeListener(callback);
    }
    removeListener(callback) {
        for (let i = 0; i < this.listeners.length; i++) {
            if (this.listeners[i] === callback) {
                this.listeners.splice(i, 1);
                return;
            }
        }
    }
    trigger(...args) {
        this.listeners.forEach(callback => callback(...args));
    }
}

function notifierForEvent(object, eventName) {
    if (object._eventedNotifiers === undefined) {
        object._eventedNotifiers = {};
    }
    let notifier = object._eventedNotifiers[eventName];
    if (!notifier) {
        notifier = object._eventedNotifiers[eventName] = new Notifier();
    }
    return notifier;
}

class Err {
    constructor(value, validation) {
        this.value = value;
        this.validation = validation;
    }
}

/**
 * traverse through target and unset `value` from leaf key so can access normally
 * {
 *  name: Change {
 *    value: 'Charles'
 *  }
 * }
 *
 * to
 *
 * {
 *  name: 'Charles'
 * }
 *
 * Shallow copy here is fine because we are swapping out the leaf nested object
 * rather than mutating a property in something with reference
 *
 * @method normalizeObject
 * @param target
 */
function normalizeObject(target) {
    if ('value' in target) {
        return target.value;
    }
    let obj = { ...target };
    for (let key in obj) {
        if (key === 'value') {
            return obj[key];
        }
        if (obj[key] && isObject(obj[key])) {
            if (Object.prototype.hasOwnProperty.call(obj[key], 'value')) {
                obj[key] = obj[key].value;
            }
            else {
                obj[key] = normalizeObject(obj[key]);
            }
        }
    }
    return obj;
}

// keep getters and setters
function pureAssign(...objects) {
    return objects.reduce((acc, obj) => {
        return Object.defineProperties(acc, Object.getOwnPropertyDescriptors(obj));
    }, {});
}

const CHANGESET = '__CHANGESET__';
function isChangeset(changeset) {
    return changeset['__changeset__'] === CHANGESET;
}

function isPromiseLike(obj) {
    return (!!obj &&
        !!obj.then &&
        !!obj.catch &&
        !!obj.finally &&
        typeof obj.then === 'function' &&
        typeof obj.catch === 'function' &&
        typeof obj.finally === 'function');
}
function isPromise(obj) {
    return isObject(obj) && isPromiseLike(obj);
}

// to avoid overwriting child keys of leaf node
function result(target, path, value) {
    target[path] = value;
}
function split(path) {
    const keys = path.split('.');
    return keys;
}
function isValidKey(key) {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}
function isObject$1(val) {
    return val !== null && (typeof val === 'object' || typeof val === 'function');
}
/**
 * TODO: consider
 * https://github.com/emberjs/ember.js/blob/822452c4432620fc67a777aba3b150098fd6812d/packages/%40ember/-internals/metal/lib/property_set.ts
 *
 * Handles both single path or nested string paths ('person.name')
 *
 * @method setDeep
 */
function setDeep(target, path, value) {
    const keys = split(path).filter(isValidKey);
    // We will mutate target and through complex reference, we will mutate the orig
    let orig = target;
    if (keys.length === 1) {
        target[path] = value;
        return target;
    }
    for (let i = 0; i < keys.length; i++) {
        let prop = keys[i];
        const obj = isObject$1(target[prop]);
        if (!obj) {
            target[prop] = {};
        }
        else if (obj && target[prop] instanceof Change) {
            // we don't want to merge new changes with a Change instance higher up in the obj tree
            target[prop] = {};
        }
        // last iteration
        if (i === keys.length - 1) {
            result(target, prop, value);
            break;
        }
        // assign next level of object for next loop
        target = target[prop];
    }
    return orig;
}
// function isPlainObject(o: unknown): o is object {
//   return Object.prototype.toString.call(o) === '[object Object]';
// }

const { keys } = Object;
/**
 * Given an array of objects, merge their keys into a new object and
 * return the new object.
 *
 * This function merges using `setNestedProperty`.
 */
function mergeNested(...objects) {
    let finalObj = {};
    objects.forEach(obj => keys(obj).forEach(key => setDeep(finalObj, key, obj[key])));
    return finalObj;
}

/**
 * Merges all sources together, excluding keys in excludedKeys.
 *
 * @param  {string[]} excludedKeys
 * @param  {...object} sources
 * @return {object}
 */
function objectWithout(excludedKeys, ...sources) {
    return sources.reduce((acc, source) => {
        Object.keys(source)
            .filter(key => excludedKeys.indexOf(key) === -1 || !source.hasOwnProperty(key))
            .forEach(key => (acc[key] = source[key]));
        return acc;
    }, {});
}

function take(originalObj = {}, keysToTake = []) {
    let newObj = {};
    for (let key in originalObj) {
        if (keysToTake.indexOf(key) !== -1) {
            newObj[key] = originalObj[key];
        }
    }
    return newObj;
}

function isNonNullObject(value) {
    return !!value && typeof value === 'object';
}
function isSpecial(value) {
    let stringValue = Object.prototype.toString.call(value);
    return stringValue === '[object RegExp]' || stringValue === '[object Date]';
}
function isMergeableObject(value) {
    return isNonNullObject(value) && !isSpecial(value);
}
function getEnumerableOwnPropertySymbols(target) {
    return Object.getOwnPropertySymbols
        ? Object.getOwnPropertySymbols(target).filter(symbol => {
            return target.propertyIsEnumerable(symbol);
        })
        : [];
}
function getKeys(target) {
    return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
}
function propertyIsOnObject(object, property) {
    try {
        return property in object;
    }
    catch (_) {
        return false;
    }
}
// Protects from prototype poisoning and unexpected merging up the prototype chain.
function propertyIsUnsafe(target, key) {
    return (propertyIsOnObject(target, key) && // Properties are safe to merge if they don't exist in the target yet,
        // unsafe if they exist up the prototype chain and also unsafe if they're nonenumerable.
        !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key)));
}
/**
 * DFS - traverse depth first until find object with `value`.  Then go back up tree and try on next key
 * Need to exhaust all possible avenues.
 *
 * @method buildPathToValue
 */
function buildPathToValue(source, options, kv, possibleKeys) {
    Object.keys(source).forEach((key) => {
        let possible = source[key];
        if (possible && possible.hasOwnProperty('value')) {
            possibleKeys.push(key);
            kv[possibleKeys.join('.')] = possible.value;
            return;
        }
        if (typeof possible === 'object') {
            possibleKeys.push(key);
            buildPathToValue(possible, options, kv, possibleKeys);
        }
    });
    return kv;
}
/**
 * `source` will always have a leaf key `value` with the property we want to set
 *
 * @method mergeTargetAndSource
 */
function mergeTargetAndSource(target, source, options) {
    getKeys(source).forEach(key => {
        // proto poisoning.  So can set by nested key path 'person.name'
        if (propertyIsUnsafe(target, key)) {
            // if safeSet, we will find keys leading up to value and set
            if (options.safeSet) {
                const kv = buildPathToValue(source, options, {}, []);
                // each key will be a path nested to the value `person.name.other`
                if (Object.keys(kv).length > 0) {
                    // we found some keys!
                    for (key in kv) {
                        const val = kv[key];
                        options.safeSet(target, key, val);
                    }
                }
            }
            return;
        }
        // else safe key on object
        if (propertyIsOnObject(target, key) &&
            isMergeableObject(source[key]) &&
            !source[key].hasOwnProperty('value')) {
            /* eslint-disable @typescript-eslint/no-use-before-define */
            target[key] = mergeDeep(options.safeGet(target, key), options.safeGet(source, key), options);
        }
        else {
            let next = source[key];
            if (next && next instanceof Change) {
                return (target[key] = next.value);
            }
            // if just some normal leaf value, then set
            return (target[key] = next);
        }
    });
    return target;
}
/**
 * goal is to mutate target with source's properties, ensuring we dont encounter
 * pitfalls of { ..., ... } spread syntax overwriting keys on objects that we merged
 *
 * This is also adjusted for Ember peculiarities.  Specifically `options.setPath` will allows us
 * to handle properties on Proxy objects (that aren't the target's own property)
 *
 * @method mergeDeep
 */
function mergeDeep(target, source, options = { safeGet: undefined, safeSet: undefined }) {
    options.safeGet =
        options.safeGet ||
            function (obj, key) {
                return obj[key];
            };
    options.safeSet = options.safeSet;
    let sourceIsArray = Array.isArray(source);
    let targetIsArray = Array.isArray(target);
    let sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
    if (!sourceAndTargetTypesMatch) {
        return source;
    }
    else if (sourceIsArray) {
        return source;
    }
    else {
        return mergeTargetAndSource(target, source, options);
    }
}

/**
 * Handles both single key or nested string keys ('person.name')
 *
 * @method getDeep
 */
function getDeep(root, path) {
    let obj = root;
    if (path.indexOf('.') === -1) {
        return obj[path];
    }
    const parts = typeof path === 'string' ? path.split('.') : path;
    for (let i = 0; i < parts.length; i++) {
        if (obj === undefined || obj === null) {
            return undefined;
        }
        // next iteration has next level
        obj = obj[parts[i]];
    }
    return obj;
}

const { assign, keys: keys$1 } = Object;
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
const DEBUG = process.env.NODE_ENV === 'development';
function assert(msg, property) {
    if (DEBUG) {
        if (property) {
            console.warn(msg);
        }
    }
}
class BufferedChangeset {
    constructor(obj, validateFn = defaultValidatorFn, validationMap = {}, options = {}) {
        this.validateFn = validateFn;
        this.validationMap = validationMap;
        this.__changeset__ = CHANGESET;
        this._eventedNotifiers = {};
        /**
         * @property setDeep
         * @override
         */
        this.setDeep = setDeep;
        /**
         * @property getDeep
         * @override
         */
        this.getDeep = getDeep;
        this[CONTENT] = obj;
        this[CHANGES] = {};
        this[ERRORS] = {};
        this[VALIDATOR] = validateFn;
        this[OPTIONS] = pureAssign(defaultOptions, options);
        this[RUNNING_VALIDATIONS] = {};
    }
    on(eventName, callback) {
        const notifier = notifierForEvent(this, eventName);
        return notifier.addListener(callback);
    }
    off(eventName, callback) {
        const notifier = notifierForEvent(this, eventName);
        return notifier.removeListener(callback);
    }
    trigger(eventName, ...args) {
        const notifier = notifierForEvent(this, eventName);
        if (notifier) {
            notifier.trigger(...args);
        }
    }
    /**
     * @property safeGet
     * @override
     */
    safeGet(obj, key) {
        return obj[key];
    }
    get _bareChanges() {
        function transform(c) {
            return c.value;
        }
        let obj = this[CHANGES];
        return keys$1(obj).reduce((newObj, key) => {
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
        function transform(e) {
            return { value: e.value, validation: e.validation };
        }
        return keys$1(obj).map(key => {
            let value = transform(obj[key]);
            if (isObject(value)) {
                return assign({ key }, value);
            }
            return { key, value };
        });
    }
    get change() {
        let obj = this[CHANGES];
        return normalizeObject(obj);
    }
    get error() {
        let obj = this[ERRORS];
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
    setUnknownProperty(key, value) {
        let config = this[OPTIONS];
        let skipValidate = config['skipValidate'];
        if (skipValidate) {
            let content = this[CONTENT];
            let oldValue = this.safeGet(content, key);
            this._setProperty({ key, value, oldValue });
            this._handleValidation(true, { key, value });
            return;
        }
        let content = this[CONTENT];
        let oldValue = this.safeGet(content, key);
        this._setProperty({ key, value, oldValue });
        this._validateKey(key, value);
    }
    /**
     * String representation for the changeset.
     */
    toString() {
        let normalisedContent = pureAssign(this[CONTENT], {});
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
    prepare(prepareChangesFn) {
        let changes = this['_bareChanges'];
        let preparedChanges = prepareChangesFn(changes);
        assert('Callback to `changeset.prepare` must return an object', isObject(preparedChanges));
        let newObj = {};
        let newChanges = keys$1(preparedChanges).reduce((newObj, key) => {
            newObj[key] = new Change(preparedChanges[key]);
            return newObj;
        }, newObj);
        // @tracked
        this[CHANGES] = newChanges;
        return this;
    }
    /**
     * Executes the changeset if in a valid state.
     *
     * @method execute
     */
    execute() {
        if (this.isValid && this.isDirty) {
            let content = this[CONTENT];
            let changes = this[CHANGES];
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
    async save(options) {
        let content = this[CONTENT];
        let savePromise = Promise.resolve(this);
        this.execute();
        if (typeof content.save === 'function') {
            savePromise = content.save(options);
        }
        else if (typeof content.save === 'function') {
            // we might be getting this off a proxy object.  For example, when a
            // belongsTo relationship (a proxy on the parent model)
            // another way would be content(belongsTo).content.save
            let saveFunc = content.save;
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
    merge(changeset) {
        let content = this[CONTENT];
        assert('Cannot merge with a non-changeset', isChangeset(changeset));
        assert('Cannot merge with a changeset of different content', changeset[CONTENT] === content);
        if (this.isPristine && changeset.isPristine) {
            return this;
        }
        let c1 = this[CHANGES];
        let c2 = changeset[CHANGES];
        let e1 = this[ERRORS];
        let e2 = changeset[ERRORS];
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        let newChangeset = new ValidatedChangeset(content, this[VALIDATOR]); // ChangesetDef
        let newErrors = objectWithout(keys$1(c2), e1);
        let newChanges = objectWithout(keys$1(e2), c1);
        let mergedErrors = mergeNested(newErrors, e2);
        let mergedChanges = mergeNested(newChanges, c2);
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
    rollback() {
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
    rollbackInvalid(key) {
        let errorKeys = keys$1(this[ERRORS]);
        if (key) {
            this._notifyVirtualProperties([key]);
            // @tracked
            this[ERRORS] = this._deleteKey(ERRORS, key);
            if (errorKeys.indexOf(key) > -1) {
                this[CHANGES] = this._deleteKey(CHANGES, key);
            }
        }
        else {
            this._notifyVirtualProperties();
            this[ERRORS] = {};
            // if on CHANGES hash, rollback those as well
            errorKeys.forEach(errKey => {
                this[CHANGES] = this._deleteKey(CHANGES, errKey);
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
    rollbackProperty(key) {
        // @tracked
        this[CHANGES] = this._deleteKey(CHANGES, key);
        // @tracked
        this[ERRORS] = this._deleteKey(ERRORS, key);
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
    validate(...validationKeys) {
        if (keys$1(this.validationMap).length === 0) {
            return Promise.resolve(null);
        }
        validationKeys =
            validationKeys.length > 0 ? validationKeys : keys$1(this.validationMap);
        let maybePromise = validationKeys.map(key => {
            return this._validateKey(key, this._valueFor(key));
        });
        return Promise.all(maybePromise);
    }
    /**
     * Manually add an error to the changeset. If there is an existing
     * error or change for `key`, it will be overwritten.
     *
     * @method addError
     */
    addError(key, error) {
        // Construct new `Err` instance.
        let newError;
        const isIErr = (error) => isObject(error) && !Array.isArray(error);
        if (isIErr(error)) {
            assert('Error must have value.', error.hasOwnProperty('value'));
            assert('Error must have validation.', error.hasOwnProperty('validation'));
            newError = new Err(error.value, error.validation);
        }
        else {
            let value = this[key];
            newError = new Err(value, error);
        }
        // Add `key` to errors map.
        let errors = this[ERRORS];
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
    pushErrors(key, ...newErrors) {
        let errors = this[ERRORS];
        let existingError = this.getDeep(errors, key) || new Err(null, []);
        let validation = existingError.validation;
        let value = this[key];
        if (!Array.isArray(validation) && Boolean(validation)) {
            existingError.validation = [validation];
        }
        let v = existingError.validation;
        validation = [...v, ...newErrors];
        let newError = new Err(value, validation);
        // @tracked
        this[ERRORS] = this.setDeep(errors, key, newError);
        return { value, validation };
    }
    /**
     * Creates a snapshot of the changeset's errors and changes.
     *
     * @method snapshot
     */
    snapshot() {
        let changes = this[CHANGES];
        let errors = this[ERRORS];
        return {
            changes: keys$1(changes).reduce((newObj, key) => {
                newObj[key] = changes[key].value;
                return newObj;
            }, {}),
            errors: keys$1(errors).reduce((newObj, key) => {
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
    restore({ changes, errors }) {
        let newChanges = keys$1(changes).reduce((newObj, key) => {
            newObj[key] = new Change(changes[key]);
            return newObj;
        }, {});
        let newErrors = keys$1(errors).reduce((newObj, key) => {
            let e = errors[key];
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
    cast(allowed = []) {
        let changes = this[CHANGES];
        if (Array.isArray(allowed) && allowed.length === 0) {
            return this;
        }
        let changeKeys = keys$1(changes);
        let validKeys = changeKeys.filter((key) => allowed.includes(key));
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
    isValidating(key) {
        let runningValidations = this[RUNNING_VALIDATIONS];
        let ks = keys$1(runningValidations);
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
    _validateKey(key, value) {
        let content = this[CONTENT];
        let oldValue = this.safeGet(content, key);
        let validation = this._validate(key, value, oldValue);
        this.trigger(BEFORE_VALIDATION_EVENT, key);
        // TODO: Address case when Promise is rejected.
        if (isPromise(validation)) {
            this._setIsValidating(key, true);
            return validation.then((resolvedValidation) => {
                this._setIsValidating(key, false);
                this.trigger(AFTER_VALIDATION_EVENT, key);
                return this._handleValidation(resolvedValidation, { key, value });
            });
        }
        let result = this._handleValidation(validation, { key, value });
        this.trigger(AFTER_VALIDATION_EVENT, key);
        return result;
    }
    /**
     * Takes resolved validation and adds an error or simply returns the value
     *
     * @method _handleValidation
     * @private
     */
    _handleValidation(validation, { key, value }) {
        const isValid = validation === true ||
            (Array.isArray(validation) && validation.length === 1 && validation[0] === true);
        // Happy path: remove `key` from error map.
        // @tracked
        this[ERRORS] = this._deleteKey(ERRORS, key);
        // Error case.
        if (!isValid) {
            return this.addError(key, { value, validation });
        }
        return value;
    }
    /**
     * runs the validator with the key and value
     *
     * @method _validate
     * @private
     */
    _validate(key, newValue, oldValue) {
        let validator = this[VALIDATOR];
        let content = this[CONTENT];
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
    _setProperty({ key, value, oldValue }) {
        let changes = this[CHANGES];
        // Happy path: update change map.
        if (oldValue !== value) {
            // @tracked
            this[CHANGES] = this.setDeep(changes, key, new Change(value));
        }
        else if (key in changes) {
            // @tracked
            this[CHANGES] = this._deleteKey(CHANGES, key);
        }
    }
    /**
     * Increment or decrement the number of running validations for a
     * given key.
     */
    _setIsValidating(key, value) {
        let running = this[RUNNING_VALIDATIONS];
        let count = running[key] || 0;
        if (!value && count === 1) {
            delete running[key];
            return;
        }
        this.setDeep(running, key, value ? count + 1 : count - 1);
    }
    /**
     * Value for change/error/content or the original value.
     */
    _valueFor(key) {
        let changes = this[CHANGES];
        let errors = this[ERRORS];
        let content = this[CONTENT];
        if (errors.hasOwnProperty(key)) {
            let e = errors[key];
            return e.value;
        }
        // 'person'
        if (Object.prototype.hasOwnProperty.apply(changes, [key])) {
            let result = changes[key];
            if (isObject(result)) {
                return normalizeObject(result);
            }
            return result.value;
        }
        // 'person.username'
        let [baseKey, ...remaining] = key.split('.');
        if (Object.prototype.hasOwnProperty.apply(changes, [baseKey])) {
            let c = changes[baseKey];
            let result = this.getDeep(normalizeObject(c), remaining.join('.'));
            // just b/c top level key exists doesn't mean it has the nested key we are looking for
            if (result) {
                return result;
            }
        }
        let original = this.getDeep(content, key);
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
    _notifyVirtualProperties(keys) {
        if (!keys) {
            keys = this._rollbackKeys();
        }
        return keys;
    }
    /**
     * Gets the changes and error keys.
     */
    _rollbackKeys() {
        let changes = this[CHANGES];
        let errors = this[ERRORS];
        return [...new Set([...keys$1(changes), ...keys$1(errors)])];
    }
    /**
     * Deletes a key off an object and notifies observers.
     */
    _deleteKey(objName, key = '') {
        let obj = this[objName];
        let keys = key.split('.');
        if (keys.length === 1 && obj.hasOwnProperty(key)) {
            delete obj[key];
        }
        else if (obj[keys[0]]) {
            let [base, ...remaining] = keys;
            let previousNode = obj;
            let currentNode = obj[base];
            let currentKey = base;
            // find leaf and delete from map
            while (isObject(currentNode) && currentKey) {
                let curr = currentNode;
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
    get(key) {
        // 'person'
        // 'person.username'
        let [baseKey, ...remaining] = key.split('.');
        if (Object.prototype.hasOwnProperty.call(this[CHANGES], baseKey)) {
            let changes = this[CHANGES];
            let result;
            if (remaining.length > 0) {
                let c = changes[baseKey];
                result = this.getDeep(normalizeObject(c), remaining.join('.'));
                if (result) {
                    return result;
                }
            }
            else {
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
        }
        else if (this[baseKey]) {
            const v = this[baseKey];
            if (isObject(v)) {
                const result = this.getDeep(v, remaining.join('.'));
                return result;
            }
        }
        // finally return on underlying object
        let content = this[CONTENT];
        const result = this.getDeep(content, key);
        return result;
    }
    set(key, value) {
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
function changeset(obj, validateFn, validationMap, options) {
    return new BufferedChangeset(obj, validateFn, validationMap, options);
}
class ValidatedChangeset {
    /**
     * Changeset factory
     *
     * @class ValidatedChangeset
     * @constructor
     */
    constructor(obj, validateFn, validationMap, options) {
        const c = changeset(obj, validateFn, validationMap, options);
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
}
function ChangesetFactory(obj, validateFn, validationMap, options) {
    const c = changeset(obj, validateFn, validationMap, options);
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

exports.BufferedChangeset = BufferedChangeset;
exports.ChangesetFactory = ChangesetFactory;
exports.changeset = changeset;
exports.default = ValidatedChangeset;
