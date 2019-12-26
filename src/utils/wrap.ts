/**
 * Wraps a value in an Array.
 *
 * @public
 * @param  {Any} value
 */
export default function wrapInArray<T>(value: T | T[]): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return [value as T];
}
