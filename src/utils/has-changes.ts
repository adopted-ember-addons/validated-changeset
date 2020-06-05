import Change from '../-private/change';

export function hasChanges(changes: Record<string, any>, isObject: Function): boolean {
  for (let key in changes) {
    if (changes[key] instanceof Change) {
      return true;
    }

    if (isObject(changes[key])) {
      const isTruthy = hasChanges(changes[key], isObject);
      if (isTruthy) {
        return isTruthy;
      }
    }
  }

  return false;
}
