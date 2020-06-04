import { Content } from '../types';
import isObject from './is-object';
import Change from '../-private/change';
import Empty from '../-private/empty';

interface Options {
  safeGet: any;
}

function markEmpty(changesNode: Record<string, any>, contentNode: unknown, options: Options) {
  for (const key in changesNode) {
    if (isObject(contentNode)) {
      const nodeInContent = options.safeGet(contentNode, key);
      if (isObject(nodeInContent)) {
        for (let contentKey in nodeInContent) {
          if (isObject(changesNode[key]) && !changesNode[key][contentKey]) {
            changesNode[key][contentKey] = new Empty();
          }
        }
      }

      if (isObject(changesNode[key])) {
        markEmpty(changesNode[key], options.safeGet(contentNode, key), options);
      }
    }
  }

  return changesNode;
}

/**
 * Leaf keys need an explicit undefined value so that when BufferedChangeset.get
 * sees this key, we return undefined instead of the key in CONTENT.
 *
 * @fuction markUndefinedLeafKeys
 * @param  {Object} changes
 * @param  {Object} content
 * @return {Object}
 */
export function markUndefinedLeafKeys<T>(changes: T, content: Content, options: Options): T {
  for (let key in changes) {
    const changesNode = changes[key];
    if (isObject(changesNode) && isObject(content)) {
      if (changesNode instanceof Change) {
        // here we need to start checking for empty keys
        markEmpty(changesNode.value, options.safeGet(content, key), options);
      } else {
        markUndefinedLeafKeys(changesNode, options.safeGet(content, key), options);
      }
    }
  }

  return changes;
}
