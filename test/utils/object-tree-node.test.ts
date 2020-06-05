import { ObjectTreeNode } from '../../src/utils/object-tree-node';
import Change from '../../src/-private/change';
import isObject from '../../src/utils/is-object';

describe('Unit | Utility | object tree node', () => {
  it('it returns changes', () => {
    const result = new ObjectTreeNode({ name: 'z' }, { name: 'c' }, isObject);

    expect(result.changes).toEqual({ name: 'z' });
    expect(result.proxy.name).toBe('z');
    expect(result.content).toEqual({ name: 'c' });
  });

  it('it returns nested children', () => {
    const initialVal = { details: { name: 'z' } };
    const result = new ObjectTreeNode(initialVal, { details: { name: 'c' } }, isObject);

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
    const result = new ObjectTreeNode(initialVal, { details: { name: 'c' } }, isObject);

    result.proxy.details['name'] = 'bla bla';
    expect(result.proxy.details.name).toBe('bla bla');
    expect(result.proxy.details.email).toBe('@');
    expect(result.changes.details.name).toEqual({ value: 'bla bla' });
    expect(result.content.details.name).toBe('c');
  });

  it('it works with arrays', () => {
    const initialVal = { users: ['user1', 'user2'] };
    const result = new ObjectTreeNode(initialVal, {}, isObject);

    expect(result.proxy.users).toEqual(['user1', 'user2']);
    expect(result.proxy.users.length).toEqual(2);
  });

  it('unwrap merges sibling keys', () => {
    const result = new ObjectTreeNode(
      { name: new Change('z') },
      { name: 'c', email: '@email' },
      isObject
    );

    expect(result.unwrap()).toEqual({ name: 'z', email: '@email' });
  });
});
