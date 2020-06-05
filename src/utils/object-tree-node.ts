import { ProxyHandler, Content } from '../types';
import isObject from './is-object';
import Change from '../-private/change';
import normalizeObject from './normalize-object';

const objectProxyHandler = {
  /**
   * Priority of access - changes, content, then check node
   * @property get
   */
  get(node: ProxyHandler, key: string): any {
    if (typeof key === 'symbol') {
      return;
    }

    let childValue;

    if (node.changes.hasOwnProperty && node.changes.hasOwnProperty(key)) {
      childValue = node.safeGet(node.changes, key);
      if (typeof childValue === 'undefined') {
        return;
      }
    }

    if (childValue instanceof Change) {
      return childValue.value;
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
      if (node.safeGet(nodeContent, key) || typeof node.safeGet(nodeContent, key) === 'function') {
        return node.safeGet(nodeContent, key);
      }
    }

    if (typeof node[key] === 'function' || node.hasOwnProperty(key)) {
      return node[key];
    }
  },

  ownKeys(node: ProxyHandler): any {
    return Reflect.ownKeys(node.changes);
  },

  getOwnPropertyDescriptor(node: ProxyHandler, prop: string): any {
    return Reflect.getOwnPropertyDescriptor(node.changes, prop);
  },

  has(node: ProxyHandler, prop: string): any {
    return Reflect.has(node.changes, prop);
  },

  set(node: ProxyHandler, key: string, value: unknown): any {
    // dont want to set private properties on changes (usually found on outside actors)
    if (key.startsWith('_')) {
      return Reflect.set(node, key, value);
    }
    return Reflect.set(node.changes, key, new Change(value));
  }
};

function defaultSafeGet(obj: Record<string, any>, key: string) {
  return obj[key];
}

class ObjectTreeNode implements ProxyHandler {
  changes: Record<string, any>;
  content: Content;
  proxy: any;
  children: Record<string, any>;

  constructor(
    changes: Record<string, any> = {},
    content: Content = {},
    public safeGet: Function = defaultSafeGet
  ) {
    this.changes = changes;
    this.content = content;
    this.proxy = new Proxy(this, objectProxyHandler);
    this.children = Object.create(null);
  }

  unwrap(): Record<string, any> {
    let changes = this.changes;

    if (isObject(changes)) {
      changes = normalizeObject(changes);

      const content = this.content;
      if (isObject(content)) {
        changes = normalizeObject(changes);
        return { ...content, ...changes };
      }
    }

    return changes;
  }
}

export { ObjectTreeNode };
