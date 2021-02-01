import { getChangeValue, isChange } from '../-private/change';
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
export default function normalizeObject<T extends { [key: string]: any }>(
  target: T,
  isObj: Function = isObject
): T {
  if (!target || !isObj(target)) {
    return target;
  }

  if (isChange(target)) {
    return getChangeValue(target);
  }

  let obj = { ...target };

  for (let key in obj) {
    const next: any = obj[key];
    if (next && isObj(next)) {
      if (isChange(next)) {
        obj[key] = getChangeValue(next);
      } else {
        try {
          JSON.stringify(next);
        } catch (e) {
          break;
        }
        obj[key] = normalizeObject(next);
      }
    }
  }

  return obj;
}
