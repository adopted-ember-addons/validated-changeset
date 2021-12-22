export const ChangesetIdentitySymbol = Symbol('validated_changeset_change_proxy_identity');
export const ChangesetIdentityKey = Symbol.keyFor(ChangesetIdentitySymbol);

export function isChangeset(obj: any) {
  if (obj[ChangesetIdentitySymbol] === true) {
    return true;
  }
  return false;
}
