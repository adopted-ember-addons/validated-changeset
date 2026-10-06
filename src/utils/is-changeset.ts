export const CHANGESET = '__CHANGESET__';

export default function isChangeset(changeset: any): boolean {
  // Check with `in` before reading: some objects throw on reading a property
  // they do not define, such as WarpDrive schema records.
  return (
    changeset !== null &&
    (typeof changeset === 'object' || typeof changeset === 'function') &&
    '__changeset__' in changeset &&
    changeset['__changeset__'] === CHANGESET
  );
}
