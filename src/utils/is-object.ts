export default function isObject<T>(val: T): boolean {
  return typeof val === 'object';
}
