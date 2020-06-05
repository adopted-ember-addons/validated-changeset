import { Content } from '../types';
import isObject from './is-object';
import Change from '../-private/change';

interface Options {
  safeGet: any;
}

function markEmpty(changesNode: Record<string, any>, contentNode: unknown, options: Options) {
  if (isObject(changesNode) && isObject(contentNode)) {
    // first iterate changes and see if content has keys that aren't in there
    for (const key in changesNode) {
      const subChanges = changesNode[key];
      const nodeInContent = options.safeGet(contentNode, key);
      if (isObject(nodeInContent)) {
        for (let contentKey in nodeInContent) {
          if (isObject(subChanges) && !subChanges[contentKey]) {
            // mark empty if exists on content but not on changes
            subChanges[contentKey] = undefined;
          }
        }
      }

      if (isObject(subChanges)) {
        markEmpty(subChanges, options.safeGet(contentNode, key), options);
      }
    }

    // also want to iterate content and see if something is missing from changes
    for (const key in contentNode as Record<string, any>) {
      if (!changesNode[key]) {
        changesNode[key] = undefined;
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
