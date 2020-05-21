import { ProxyHandler, Content } from '../types';
import isObject from './is-object';
import Change from '../-private/change';

const objectProxyHandler = {
  /**
   * Priority of access - changes, content, then check node
   * @property get
   */
  get(node: Record<string, any>, key: string) {
    let childValue;

    if (node.changes.hasOwnProperty(key)) {
      childValue = node.safeGet(node.changes, key);
    }

    if (childValue instanceof Change) {
      return childValue.value;
    }

    if (isObject(childValue)) {
      let childNode: ProxyHandler | undefined = node.children[key];

      if (childNode === undefined) {
        let childContent = node.safeGet(node.content, key);
        // cache it
        childNode = node.children[key] = new ObjectTreeNode(childValue, childContent, node.safeGet);
      }

      // return proxy if object so we can trap further access to changes or content
      return childNode ? childNode.proxy : undefined;
    }

    if (typeof childValue !== 'undefined') {
      // primitive
      return childValue;
    } else {
      if (node.content.hasOwnProperty(key) || typeof node.content[key] === 'function') {
        return node.safeGet(node.content, key);
      }
    }

    if (typeof node[key] === 'function' || node.hasOwnProperty(key)) {
      return node[key];
    }
  },

  ownKeys(node: Record<string, any>) {
    return Reflect.ownKeys(node.changes);
  },

  getOwnPropertyDescriptor(node: Record<string, any>, prop: string) {
    return Reflect.getOwnPropertyDescriptor(node.changes, prop);
  },

  has(node: Record<string, any>, prop: string) {
    return Reflect.has(node.changes, prop);
  },

  set() {
    return false;
  }
};

function defaultSafeGet(obj: Record<string, any>, key: string) {
  return obj[key];
}

class ObjectTreeNode implements ProxyHandler {
  changes: unknown;
  content: Content;
  proxy: any;
  children: Record<string, any>;

  constructor(
    changes: unknown = {},
    content: Content = {},
    public safeGet: Function = defaultSafeGet
  ) {
    this.changes = changes;
    this.content = content;
    this.proxy = new Proxy(this, objectProxyHandler);
    this.children = Object.create(null);
  }

  toObject() {
    return this.changes;
  }
}

export { ObjectTreeNode };
