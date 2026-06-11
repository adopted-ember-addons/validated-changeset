import { getChangeValue, isChange } from '../-private/change';
import normalizeObject from './normalize-object';
import { isArrayObject, objectToArray, arrayToObject } from './array-object';

interface Options {
  safeGet: any;
  safeSet: any;
  propertyIsUnsafe?: any;
  getKeys?: (record: Record<string, unknown>) => string[];
}

function isNonNullObject(value: any): boolean {
  return !!value && typeof value === 'object';
}

function isSpecial(value: any): boolean {
  let stringValue = Object.prototype.toString.call(value);

  return (
    stringValue === '[object RegExp]' ||
    stringValue === '[object Date]' ||
    stringValue === '[object File]'
  );
}

function isMergeableObject(value: any): boolean {
  return isNonNullObject(value) && !isSpecial(value);
}

function getEnumerableOwnPropertySymbols(target: any): any {
  return Object.getOwnPropertySymbols
    ? Object.getOwnPropertySymbols(target).filter((symbol) => {
        return target.propertyIsEnumerable(symbol);
      })
    : [];
}

function getKeys(target: any) {
  return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
}

function propertyIsOnObject(object: any, property: any) {
  try {
    return property in object;
  } catch (_) {
    return false;
  }
}

// Protects from prototype poisoning and unexpected merging up the prototype chain.
export function propertyIsUnsafe(target: any, key: string): boolean {
  return (
    propertyIsOnObject(target, key) && // Properties are safe to merge if they don't exist in the target yet,
    // unsafe if they exist up the prototype chain and also unsafe if they're nonenumerable.
    !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key))
  );
}

/**
 * DFS - traverse depth first until find object with `value`.  Then go back up tree and try on next key
 * Need to exhaust all possible avenues.
 *
 * @method buildPathToValue
 */
function buildPathToValue(
  source: any,
  options: Options,
  kv: Record<string, any>,
  possibleKeys: string[]
): Record<string, any> {
  Object.keys(source).forEach((key: string): void => {
    let possible = source[key];
    if (possible && isChange(possible)) {
      kv[[...possibleKeys, key].join('.')] = getChangeValue(possible);
      return;
    }

    if (possible && typeof possible === 'object') {
      buildPathToValue(possible, options, kv, [...possibleKeys, key]);
    }
  });

  return kv;
}

/**
 * `source` will always have a leaf key `value` with the property we want to set
 *
 * @method mergeTargetAndSource
 */
function mergeTargetAndSource(target: any, source: any, options: Required<Options>): any {
  options.getKeys(source).forEach((key) => {
    // proto poisoning.  So can set by nested key path 'person.name'
    if (options.propertyIsUnsafe(target, key)) {
      // if safeSet, we will find keys leading up to value and set
      if (options.safeSet) {
        const kv: Record<string, any> = buildPathToValue(source, options, {}, []);
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
    if (
      propertyIsOnObject(target, key) &&
      isMergeableObject(source[key]) &&
      !isChange(source[key])
    ) {
      options.safeSet(
        target,
        key,
        mergeDeep(options.safeGet(target, key), options.safeGet(source, key), options)
      );
    } else {
      let next = source[key];
      if (next && isChange(next)) {
        return options.safeSet(target, key, getChangeValue(next));
      }

      return options.safeSet(target, key, normalizeObject(next));
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
export default function mergeDeep(
  target: any,
  source: any,
  options: Options = {
    safeGet: undefined,
    safeSet: undefined,
    propertyIsUnsafe: undefined,
    getKeys: undefined
  }
): object | [any] {
  options.getKeys = options.getKeys || getKeys;
  options.propertyIsUnsafe = options.propertyIsUnsafe || propertyIsUnsafe;

  options.safeGet =
    options.safeGet ||
    function (obj: Record<string, any>, key: string): Record<string, any> {
      return obj[key];
    };
  options.safeSet =
    options.safeSet ||
    function (obj: any, key: string, value: unknown): any {
      return (obj[key] = value);
    };
  let sourceIsArray = Array.isArray(source);
  let targetIsArray = Array.isArray(target);
  let sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

  if (!sourceAndTargetTypesMatch) {
    let sourceIsArrayLike = isArrayObject(source);

    if (targetIsArray && sourceIsArrayLike) {
      return objectToArray(
        mergeTargetAndSource(arrayToObject(target), source, options as Required<Options>)
      );
    }

    return source;
  } else if (sourceIsArray) {
    return source;
  } else if (target === null || target === undefined) {
    /**
     * If the target was set to null or undefined, we always want to return the source.
     * There is nothing to merge.
     *
     * Without this explicit check, typeof null === typeof {any object-like thing}
     * which means that mergeTargetAndSource will be called, and you can't merge with null
     */
    return source;
  } else {
    return mergeTargetAndSource(target, source, options as Required<Options>);
  }
}
