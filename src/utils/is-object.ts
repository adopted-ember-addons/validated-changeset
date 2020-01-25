export default function isObject<T>(val: T): boolean {
  return val !== null && typeof val === 'object';
}
