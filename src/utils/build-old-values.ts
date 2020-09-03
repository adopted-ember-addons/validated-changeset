export function buildOldValues(
  content: any,
  changes: Record<string, any>[],
  deepGet: Function
): object {
  const obj = Object.create(null);

  for (let change of changes) {
    obj[change.key] = deepGet(content, change.key);
  }

  return obj;
}
