import { getChangeValue, isChange } from '../-private/change';
import isObject from './is-object';
import Err from '../-private/err';
import type { PublicErrors } from '../types';

/**
 * traverse through target and return leaf nodes with `value` property and key as 'person.name'
 * Only detects key paths with Changes
 *
 * @method getKeyValues
 * @return {Array} [{ 'person.name': value }]
 */
export function getKeyValues<T extends Record<string, any>>(
  obj: T,
  keysUpToValue: Array<string> = []
): Record<string, any>[] {
  const map = [];

  for (let key in obj) {
    if (obj[key] && isObject(obj[key])) {
      if (isChange(obj[key])) {
        map.push({ key: [...keysUpToValue, key].join('.'), value: getChangeValue(obj[key]) });
      } else {
        map.push(...getKeyValues(obj[key], [...keysUpToValue, key]));
      }
    }
  }

  return map;
}

/**
 * traverse through target and return leaf nodes with `value` property and key as 'person.name'
 *
 * @method getKeyErrorValues
 * @return {Array} [{ key: 'person.name', validation: '', value: '' }]
 */
export function getKeyErrorValues<T extends Record<string, any>>(
  obj: T,
  keysUpToValue: Array<string> = []
): PublicErrors {
  let map = [];

  for (let key in obj) {
    if (obj[key] && isObject(obj[key])) {
      if (
        Object.prototype.hasOwnProperty.call(obj[key], 'value') &&
        (obj[key] as any) instanceof Err
      ) {
        map.push({
          key: [...keysUpToValue, key].join('.'),
          validation: obj[key].validation,
          value: obj[key].value
        });
      } else if (key !== 'value') {
        map.push(...getKeyErrorValues(obj[key], [...keysUpToValue, key]));
      }
    }
  }

  return map;
}
