import isObject from './is-object';
import Change from '../-private/change';

export function hasChanges(changes: Record<string, any>): boolean {
  for (let key in changes) {
    if (changes[key] instanceof Change) {
      return true;
    }

    if (isObject(changes[key])) {
      const isTruthy = hasChanges(changes[key]);
      if (isTruthy) {
        return isTruthy;
      }
    }
  }

  return false;
}
