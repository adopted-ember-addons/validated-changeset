export function hasKey(record: Record<string, any>, path: string): boolean {
  const keys = path.split('.');

  let obj = record;
  for (const key of keys) {
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }

    obj = obj[key];
  }

  return true;
}
