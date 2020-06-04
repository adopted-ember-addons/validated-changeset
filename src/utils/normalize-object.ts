import Change from '../-private/change';
import Empty from '../-private/empty';
import isObject from './is-object';

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
 * @param {Object} target
 * @return {Object}
 */
export default function normalizeObject<T extends { [key: string]: any }>(target: T): T {
  if (!target || !isObject(target)) {
    return target;
  }

  if (target instanceof Change) {
    return target.value;
  }

  let obj = { ...target };

  for (let key in obj) {
    if (key === 'value') {
      return obj[key];
    }

    const next: any = obj[key];
    if (next && isObject(next)) {
      if (Object.prototype.hasOwnProperty.call(next, 'value') && next instanceof Change) {
        obj[key] = next.value;
      } else {
        obj[key] = normalizeObject(next);
      }
    }
  }

  return obj;
}

/**
 * traverse through target and unset `value` from leaf key so can access normally
 * {
 *  name: Empty {
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
 * @method normalizeEmptyObject
 * @param {Object} target
 * @return {Object | string}
 */
export function normalizeEmptyObject<T extends { [key: string]: any }>(target: T): T | undefined {
  if (!target || !isObject(target)) {
    return target;
  }

  if (target instanceof Empty) {
    return undefined;
  }

  let obj = Object.assign(Object.create(Object.getPrototypeOf(target)), target);

  for (let key in obj) {
    if (key === 'value') {
      return normalizeEmptyObject(obj[key]);
    }

    const next: any = obj[key];
    if (next && isObject(next)) {
      if (Object.prototype.hasOwnProperty.call(next, 'value') && next instanceof Empty) {
        obj[key] = undefined;
      } else {
        obj[key] = normalizeEmptyObject(next);
      }
    }
  }

  return obj;
}
