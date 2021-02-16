import Change, { getChangeValue, isChange } from '../-private/change';
import isObject from './is-object';

interface Options {
  safeSet: any;
}

function split(path: string): string[] {
  const keys = path.split('.');

  return keys;
}

function findSiblings(target: any, keys: string[]) {
  const [leafKey] = keys.slice(-1);
  const remaining = Object.keys(target)
    .filter(k => k !== leafKey)
    .reduce((acc, key) => {
      acc[key] = target[key];
      return acc;
    }, Object.create(null));

  return { ...remaining };
}

function isValidKey(key: unknown) {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/**
 * TODO: consider
 * https://github.com/emberjs/ember.js/blob/822452c4432620fc67a777aba3b150098fd6812d/packages/%40ember/-internals/metal/lib/property_set.ts
 *
 * Handles both single path or nested string paths ('person.name')
 *
 * @method setDeep
 */
export default function setDeep(
  target: any,
  path: string,
  value: unknown,
  options: Options = { safeSet: undefined }
): any {
  const keys = split(path).filter(isValidKey);
  // We will mutate target and through complex reference, we will mutate the orig
  let orig = target;

  options.safeSet =
    options.safeSet ||
    function(obj: any, key: string, value: unknown): any {
      return (obj[key] = value);
    };

  if (keys.length === 1) {
    options.safeSet(target, path, value);
    return target;
  }

  for (let i = 0; i < keys.length; i++) {
    let prop = keys[i];

    if (Array.isArray(target) && parseInt(prop, 10) < 0) {
      throw new Error(
        'Negative indices are not allowed as arrays do not serialize values at negative indices'
      );
    }

    const isObj = isObject(target[prop]);
    const isArray = Array.isArray(target[prop]);
    const isComplex = isObj || isArray;

    if (!isComplex) {
      options.safeSet(target, prop, {});
    } else if (isComplex && isChange(target[prop])) {
      let changeValue = getChangeValue(target[prop]);

      if (isObject(changeValue)) {
        // if an object, we don't want to lose sibling keys
        const siblings = findSiblings(changeValue, keys);

        const resolvedValue = isChange(value) ? getChangeValue(value) : value;
        target[prop] = new Change(
          setDeep(siblings, keys.slice(1, keys.length).join('.'), resolvedValue, options)
        );

        // since we are done with the `path`, we can terminate the for loop and return control
        break;
      } else {
        // we don't want to merge new changes with a Change instance higher up in the obj tree
        // thus we nullify the current Change instance to
        options.safeSet(target, prop, {});
      }
    }

    // last iteration, set and return control
    if (i === keys.length - 1) {
      options.safeSet(target, prop, value);

      break;
    }

    // assign next level of object for next loop
    target = target[prop];
  }

  return orig;
}
