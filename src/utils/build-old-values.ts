export function buildOldValues(
  content: any,
  changes: Record<string, any>[],
  getDeep: Function
): object {
  const obj = Object.create(null);

  for (let change of changes) {
    obj[change.key] = getDeep(content, change.key);
  }

  return obj;
}
