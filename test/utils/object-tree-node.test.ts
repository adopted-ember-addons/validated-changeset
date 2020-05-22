import { ObjectTreeNode } from '../../src/utils/object-tree-node';

describe('Unit | Utility | object tree node', () => {
  it('it returns changes', () => {
    const result = new ObjectTreeNode({ name: 'z' }, { name: 'c' });

    expect(result.changes).toEqual({ name: 'z' });
    expect(result.proxy.name).toBe('z');
    expect(result.content).toEqual({ name: 'c' });
  });

  it('it returns nested children', () => {
    const initialVal = { details: { name: 'z' } };
    const result = new ObjectTreeNode(initialVal, { details: { name: 'c' } });

    expect(result.changes).toEqual({ details: { name: 'z' } });
    expect(result.proxy.details.toObject() === initialVal.details).toBe(true);
    const details = result.proxy.details;
    expect(details.name).toBe('z');
    expect(result.proxy.details.name).toBe('z');
    expect(result.content).toEqual({ details: { name: 'c' } });
  });

  it('can set nested value on returned proxy', () => {
    const initialVal = { details: { name: 'z' } };
    const result = new ObjectTreeNode(initialVal, { details: { name: 'c' } });

    result.proxy.details['name'] = 'bla bla';
    expect(result.proxy.details.name).toBe('bla bla');
  });
});
