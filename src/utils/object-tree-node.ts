import { ProxyHandler, Content } from '../types';
import isObject from './is-object';
import Change from '../-private/change';

const objectProxyHandler = {
  get(node: Record<string, any>, key: string) {
    if (typeof node[key] === 'function' || node.hasOwnProperty(key)) {
      return node[key];
    }

    let childValue = node.safeGet(node.value, key);

    if (childValue instanceof Change) {
      return childValue.value;
    }

    if (isObject(childValue)) {
      let childNode: ProxyHandler | undefined = node.children[key];
      let childChanges = node.safeGet(node.changes, key);
      let childContent = node.safeGet(node.content, key);

      if (childNode === undefined) {
        childNode = node.children[key] = new ObjectTreeNode(
          childValue,
          childChanges,
          childContent,
          node.safeGet
        );
      }

      return childNode ? childNode.proxy : undefined;
    }

    if (childValue) {
      return childValue;
    } else {
      if (node.content && node.safeGet(node.content, key)) {
        return node.safeGet(node.content, key);
      }
    }
  },

  ownKeys(node: Record<string, any>) {
    return Reflect.ownKeys(node.value);
  },

  getOwnPropertyDescriptor(node: Record<string, any>, prop: string) {
    return Reflect.getOwnPropertyDescriptor(node.value, prop);
  },

  has(node: Record<string, any>, prop: string) {
    return Reflect.has(node.value, prop);
  },

  set() {
    return false;
  }
};

function defaultSafeGet(obj: Record<string, any>, key: string) {
  return obj[key];
}

class ObjectTreeNode implements ProxyHandler {
  value: unknown;
  changes: any;
  content: Content;
  proxy: any;
  children: Record<string, any>;

  constructor(
    value: unknown = {},
    changes: object | undefined,
    content: Content,
    public safeGet: Function = defaultSafeGet
  ) {
    this.value = value;
    this.changes = changes;
    this.content = content;
    this.proxy = new Proxy(this, objectProxyHandler);
    this.children = Object.create(null);
  }

  toObject() {
    return this.value;
  }
}

export { ObjectTreeNode };
