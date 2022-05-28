import { getChangeValue, isChange } from '../-private/change';

export function hasKey(
  record: Record<string, any>,
  path: string,
  safeGet: (obj: Record<string, any>, key: string) => any
): boolean {
  const keys = path.split('.');

  let obj = record;
  for (const key of keys) {
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }

    obj = safeGet(obj, key);
    if (isChange(obj)) {
      obj = getChangeValue(obj);
    }
  }

  return true;
}

export function pathInChanges(
  record: Record<string, any>,
  path: string,
  safeGet: (obj: Record<string, any>, key: string) => any
): boolean {
  if (isChange(record)) {
    return false;
  }

  const keys = path.split('.');

  let obj = record;
  for (const key of keys) {
    if (!obj) {
      return false;
    }

    if (keys[keys.length - 1] !== key && isChange(safeGet(obj, key))) {
      return true;
    }

    obj = safeGet(obj, key);
  }

  return false;
}
