import { ObjectTreeNode } from '../../src/utils/object-tree-node';

describe('Unit | Utility | object tree node', () => {
  it('it returns value', () => {
    const result = new ObjectTreeNode({ name: 'z' }, { name: 'c' });

    expect(result.value).toEqual({ name: 'z' });
    expect(result.proxy.name).toBe('z');
    expect(result.content).toEqual({ name: 'c' });
  });

  it('it returns nested children', () => {
    const initialVal = { details: { name: 'z' } };
    const result = new ObjectTreeNode(initialVal, { details: { name: 'c' } });

    expect(result.value).toEqual({ details: { name: 'z' } });
    expect(result.proxy.details.toObject() === initialVal.details).toBe(true);
    const details = result.proxy.details;
    expect(details.name).toBe('z');
    expect(result.proxy.details.name).toBe('z');
    expect(result.content).toEqual({ details: { name: 'c' } });
  });
});
