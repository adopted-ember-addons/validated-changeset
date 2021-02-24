import { ObjectTreeNode } from './object-tree-node';

export function unwrap<Value = Record<string, any>>(valueNode: ObjectTreeNode | Value): Value {
  if ('unwrap' in valueNode) {
    return valueNode.unwrap() as Value;
  }

  return valueNode;
}
