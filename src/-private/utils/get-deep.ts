import { getChangeValue, isChange } from '../change';

/**
 * Handles both single key or nested string keys ('person.name')
 *
 * @method getDeep
 */
export default function getDeep<T extends Record<string, any>>(
  root: T,
  path: string | string[]
): any {
  let obj: T = root;

  if (path.indexOf('.') === -1) {
    return obj[path as string];
  }
  const parts: string[] = typeof path === 'string' ? path.split('.') : path;

  for (let i = 0; i < parts.length; i++) {
    if (obj === undefined || obj === null) {
      return undefined;
    }

    // next iteration has next level
    obj = obj[parts[i]];
  }

  return obj;
}

/**
 * Returns subObject while skipping `Change` instances
 *
 * @method getSubObject
 */
export function getSubObject<T extends Record<string, any>>(root: T, path: string | string[]): any {
  let obj: T = root;

  if (path.indexOf('.') === -1) {
    return obj[path as string];
  }

  const parts: string[] = typeof path === 'string' ? path.split('.') : path;

  for (let i = 0; i < parts.length; i++) {
    if (obj === undefined || obj === null) {
      return undefined;
    }

    if (isChange(obj[parts[i]])) {
      obj = getChangeValue(obj[parts[i]]);
    } else {
      obj = obj[parts[i]];
    }
  }

  return obj;
}
