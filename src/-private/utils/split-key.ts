export default function splitKey(key: string): [string, string | null] {
  if (!key.split) {
    // key isn't a string
    return [key, null];
  }
  let firstKeyPart = key.split('.', 1)[0];
  let subKey = null;
  if (key.length > firstKeyPart.length) {
    subKey = key.substring(firstKeyPart.length + 1, key.length);
  }
  if (firstKeyPart === '_content' && subKey) {
    //deprecate this - only here for backwards compatibility
    [firstKeyPart, subKey] = splitKey(subKey);
  }
  return [firstKeyPart, subKey];
}
