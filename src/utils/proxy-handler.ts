interface Buffer {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
}

// Symbol keys belong to the changeset object itself. Turning them into strings
// would look up keys like "Symbol(PROXY_CONTENT)" on the content, and record
// them as changes on set.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared by every changeset class
const proxyHandler: ProxyHandler<any> = {
  get(targetBuffer: Buffer, key, receiver) {
    if (typeof key === 'symbol') {
      return Reflect.get(targetBuffer, key, receiver);
    }
    return targetBuffer.get(key);
  },

  set(targetBuffer: Buffer, key, value, receiver) {
    if (typeof key === 'symbol') {
      return Reflect.set(targetBuffer, key, value, receiver);
    }
    targetBuffer.set(key, value);
    return true;
  }
};

export default proxyHandler;
