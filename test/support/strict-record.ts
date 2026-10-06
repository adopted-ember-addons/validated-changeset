// Like a WarpDrive schema record: reading a string key outside its schema
// throws, while symbol reads and `in` answer without throwing.
export default function strictRecord(fields: Record<string, unknown>) {
  return new Proxy(fields, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop in target) {
        return Reflect.get(target, prop);
      }
      throw new Error(`No field named ${String(prop)} on page`);
    }
  });
}
