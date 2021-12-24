export default function isObject<T>(val: T): boolean {
  return (
    val !== null &&
    typeof val === 'object' &&
    !(val instanceof Date || val instanceof RegExp) &&
    !Array.isArray(val)
  );
}
