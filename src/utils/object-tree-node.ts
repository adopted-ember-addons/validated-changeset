import { ProxyHandler, Content } from '../types';
import isObject from './is-object';
import setDeep from './set-deep';
import Change, { getChangeValue, isChange } from '../-private/change';
import normalizeObject from './normalize-object';
import { objectToArray, arrayToObject } from './array-object';
import mergeDeep from './merge-deep';

const objectProxyHandler = {
  /**
   * Priority of access - changes, content, then check node
   * @property get
   */
  get(node: ProxyHandler, key: string): any {
    if (typeof key === 'symbol') {
      return;
    }

    let childValue = node.safeGet(node.changesCache, key);

    if (isChange(childValue)) {
      return getChangeValue(childValue);
    }

    if (isObject(childValue)) {
      let childNode: ProxyHandler | undefined = node.children[key];

      if (childNode === undefined && node.content) {
        let childContent = node.safeGet(node.content, key);
        // cache it
        childNode = node.children[key] = new ObjectTreeNode(childValue, childContent, node.safeGet);
      }

      // return proxy if object so we can trap further access to changes or content
      if (childNode) {
        return childNode.proxy;
      }
    }

    if (typeof childValue !== 'undefined') {
      // primitive
      return childValue;
    } else if (node.content) {
      const nodeContent = node.content;
      if (node.safeGet(nodeContent, key)) {
        return node.safeGet(nodeContent, key);
      }
    }

    if (typeof node[key] === 'function' || node.hasOwnProperty(key)) {
      return node[key];
    }
  },

  ownKeys(node: ProxyHandler): any {
    return Reflect.ownKeys(node.changesCache);
  },

  getOwnPropertyDescriptor(node: ProxyHandler, prop: string): any {
    return Reflect.getOwnPropertyDescriptor(node.changesCache, prop);
  },

  has(node: ProxyHandler, prop: string): any {
    return Reflect.has(node.changesCache, prop);
  },

  set(node: ProxyHandler, key: string, value: unknown): any {
    // dont want to set private properties on changes (usually found on outside actors)
    if (key.startsWith('_')) {
      return Reflect.set(node, key, value);
    }
    return Reflect.set(node.changesCache, key, new Change(value));
  }
};

function defaultSafeGet(obj: Record<string, any>, key: string) {
  return obj[key];
}

class ObjectTreeNode implements ProxyHandler {
  changes: Record<string, any>;
  changesCache: Record<string, any>;
  content: Content;
  proxy: any;
  children: Record<string, any>;

  constructor(
    changes: Record<string, any> = {},
    content: Content = {},
    public safeGet: Function = defaultSafeGet,
    public isObject: Function = isObject,
    changesCache: Record<string, any> = changes
  ) {
    this.changes = changes;
    this.content = content;
    this.proxy = new Proxy(this, objectProxyHandler);
    this.children = Object.create(null);
    this.changesCache = changesCache
  }

  get(key: string) {
    return this.safeGet(this.changesCache, key);
  }

  set(key: string, value: unknown) {
    return setDeep(this.changesCache, key, value);
  }

  unwrap(): Record<string, any> {
    let changes = this.changesCache;

    if (isObject(changes)) {
      changes = normalizeObject(changes, this.isObject);

      const content = this.content;
      if (isObject(content)) {
        changes = normalizeObject(changes, this.isObject);
        return { ...content, ...changes };
      } else if (Array.isArray(content)) {
        changes = normalizeObject(changes, this.isObject);

        return objectToArray(mergeDeep(arrayToObject(content), changes));
      }
    }

    return changes;
  }
}

export { ObjectTreeNode };
