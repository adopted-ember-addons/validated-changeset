export default function safeSet(obj: any, key: string, value: unknown) {
  return (obj[key] = value);
}
