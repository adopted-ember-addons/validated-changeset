import { ObjectTreeNode } from './object-tree-node';

export function unwrap<Value = Record<string, any>>(
  valueNode?: ObjectTreeNode | Value
): Value | null | undefined {
  if (!valueNode) {
    return valueNode;
  }

  if (typeof valueNode === 'object') {
    if ('unwrap' in valueNode) {
      return valueNode.unwrap() as Value;
    }
  }

  return valueNode;
}
