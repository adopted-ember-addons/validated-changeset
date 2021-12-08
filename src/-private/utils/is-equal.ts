// determine if two values are equal
export default function isEqual(v1: unknown, v2: unknown) {
  if (v1 instanceof Date && v2 instanceof Date) {
    return v1.getTime() === v2.getTime();
  }

  return v1 === v2;
}
