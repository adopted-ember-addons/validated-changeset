import { ProxyHandler, Content } from '../types';
import isObject from './is-object';

const objectProxyHandler = {
  get(node: ProxyHandler, key: string) {
    let childValue = node.safeGet(node.value as object, key);
    if (isObject(childValue)) {
      let childNode: ProxyHandler | undefined = node.children[key];
      let childChanges = node.safeGet(node.changes, key);
      let childContent = node.safeGet(node.content, key);

      if (childNode === undefined) {
        childNode = node.children[key] = new ObjectTreeNode(
          childValue,
          childChanges,
          childContent,
          { safeGet: node.safeGet }
        );
      }

      return childNode ? childNode.proxy : undefined;
    }

    return childValue;
  }
};

class ObjectTreeNode implements ProxyHandler {
  value: unknown;
  changes: any;
  content: Content;
  proxy: any;
  children: any;
  safeGet: Function;

  constructor(
    value: unknown,
    changes: object | undefined,
    content: Content,
    { safeGet }: { safeGet: Function }
  ) {
    this.value = value;
    this.changes = changes;
    this.content = content;
    this.proxy = new Proxy(this, objectProxyHandler);
    this.children = Object.create(null);
    this.safeGet = safeGet;
  }
}

export { ObjectTreeNode };
