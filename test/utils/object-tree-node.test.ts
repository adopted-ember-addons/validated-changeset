import { ObjectTreeNode } from '../../src/utils/object-tree-node';
import Change, { VALUE } from '../../src/-private/change';

describe('Unit | Utility | object tree node', () => {
  it('it returns changes', () => {
    const result = new ObjectTreeNode({ name: 'z' }, { name: 'c' });

    expect(result.changes).toEqual({ name: 'z' });
    expect(result.proxy.name).toBe('z');
    expect(result.content).toEqual({ name: 'c' });
  });

  it('can pass custom isObject', () => {
    function isObject() {
      return true;
    }
    const result = new ObjectTreeNode({ name: 'z' }, { name: 'c' }, undefined, isObject);

    expect(result.changes).toEqual({ name: 'z' });
    expect(result.proxy.name).toBe('z');
    expect(result.content).toEqual({ name: 'c' });
    expect(result.unwrap()).toEqual({ name: 'z' });
  });

  it('it returns nested children', () => {
    const initialVal = { details: { name: 'z' } };
    const result = new ObjectTreeNode(initialVal, { details: { name: 'c' } });

    expect(result.changes).toEqual({ details: { name: 'z' } });
    expect(result.unwrap()).toEqual({ details: { name: 'z' } });
    expect(result.proxy.details.unwrap()).toEqual({ name: 'z' });
    const details = result.proxy.details;
    expect(details.name).toBe('z');
    expect(result.proxy.details.name).toBe('z');
    expect(result.content).toEqual({ details: { name: 'c' } });
  });

  it('can set nested value on returned proxy', () => {
    const initialVal = { details: { name: 'z', email: '@' } };
    const result = new ObjectTreeNode(initialVal, { details: { name: 'c' } });

    result.proxy.details['name'] = 'bla bla';
    expect(result.proxy.details.name).toBe('bla bla');
    expect(result.proxy.details.email).toBe('@');
    expect(result.changes.details.name).toEqual({ [VALUE]: 'bla bla' });
    expect(result.content.details.name).toBe('c');
  });

  it('it works with arrays', () => {
    const initialVal = { users: ['user1', 'user2'] };
    const result = new ObjectTreeNode(initialVal);

    expect(result.proxy.users).toEqual(['user1', 'user2']);
    expect(result.proxy.users.length).toEqual(2);
  });

  it('unwrap merges sibling keys', () => {
    const result = new ObjectTreeNode({ name: new Change('z') }, { name: 'c', email: '@email' });

    expect(result.unwrap()).toEqual({ name: 'z', email: '@email' });
  });
});
