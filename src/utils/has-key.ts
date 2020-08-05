import Change from '../-private/change';

export function hasKey(record: Record<string, any>, path: string, safeGet: Function): boolean {
  const keys = path.split('.');

  let obj = record;
  for (const key of keys) {
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }

    obj = safeGet(obj, key);
  }

  return true;
}

export function pathInChanges(
  record: Record<string, any>,
  path: string,
  safeGet: Function
): boolean {
  if (record instanceof Change) {
    return false;
  }

  const keys = path.split('.');

  let obj = record;
  for (const key of keys) {
    if (!obj) {
      return false;
    }

    if (keys[keys.length - 1] !== key && safeGet(obj, key) instanceof Change) {
      return true;
    }

    obj = safeGet(obj, key);
  }

  return false;
}
