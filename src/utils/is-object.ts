export default function isObject<T>(val: T): boolean {
  return val !== null && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val);
}
