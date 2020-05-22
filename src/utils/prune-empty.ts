import isObject from './is-object';

export const EMPTY_SIGIL = '~EMPTY~';

/**
 * This utility is meant to traverse depth first, deleleting nodes with an EMPTY sigil
 * This allows us to accurately track isDirty state
 * @method pruneEmptySigil
 */
export function pruneEmptySigil(changes: Record<string, any>) {
  for (let key in changes) {
    if (isObject(changes[key])) {
      const subKeys = Object.keys(changes[key]);
      if (subKeys.length === 1 && subKeys[0] === EMPTY_SIGIL) {
        delete changes[key];
      } else {
        pruneEmptySigil(changes[key]);
      }
    }
  }

  // after deleted keys, check if dangling EMPTY_SIGIL key
  if (changes && changes[EMPTY_SIGIL]) {
    pruneEmptySigil(changes);
  }

  return changes;
}
