import { ProxyHandler, Content } from '../types';
import isObject from './is-object';

const objectProxyHandler = {
  get(node: Record<string, any>, key: string) {
    let childValue = node.safeGet(node.value, key);
    let childChanges = node.safeGet(node.changes, key);
    let childContent = node.safeGet(node.content, key);

    if (isObject(childValue)) {
      let childNode: ProxyHandler | undefined = node.children[key];

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

    return childValue;
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
    value: unknown,
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
}

export { ObjectTreeNode };
