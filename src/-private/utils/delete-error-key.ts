import isObject from '../utils/is-object';
import { InternalMap } from '../../types';
import { isChange } from '../change';

export default function deleteErrorKey(obj: InternalMap, key = ''): InternalMap {
  let keys = key.split('.');

  if (keys.length === 1 && obj.hasOwnProperty(key)) {
    delete obj[key];
  } else if (obj[keys[0]]) {
    let recurse = (parentNode: { [key: string]: any }, remainingKeys: string[]) => {
      let [childKey, ...remaining] = remainingKeys;
      let childNode: any = parentNode[childKey];

      // depth first
      if (remaining.length > 0) {
        recurse(childNode, remaining);
      }
      // delete leaf and empty branch from map
      if (isObject(childNode) && childKey) {
        let curr: { [key: string]: unknown } = childNode;
        if (
          isChange(curr) ||
          typeof curr.value !== 'undefined' ||
          curr.validation ||
          Object.keys(curr).length === 0
        ) {
          delete parentNode[childKey];
          return;
        }
      }
    };
    recurse(obj, keys);
  }

  return obj;
}
