import { ValidatorMap } from '../types';
import isObject from './is-object';

function flatten(
  validatorMap: Record<string, any>,
  obj: Record<string, any>,
  keys: string[],
  keysUpToFunction: Array<string> = []
): object {
  for (let key of keys) {
    const value: any = validatorMap[key];
    if (isObject(value)) {
      flatten(value, obj, Object.keys(value), [...keysUpToFunction, key]);
    } else if (typeof value === 'function') {
      const dotSeparatedKeys = [...keysUpToFunction, key].join('.');
      obj[dotSeparatedKeys] = value;
    } else if (Array.isArray(value)) {
      const isAllFuncs: boolean = value.every(item => typeof item === 'function');
      if (isAllFuncs) {
        const dotSeparatedKeys = [...keysUpToFunction, key].join('.');
        obj[dotSeparatedKeys] = value;
      }
    }
  }

  return obj;
}

export function flattenValidations(validatorMap: Record<string, any>): object {
  if (!validatorMap) {
    return {};
  }

  let obj: Record<string, any> = {};
  return flatten(validatorMap, obj, Object.keys(validatorMap));
}
