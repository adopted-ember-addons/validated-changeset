import Change from '../../src/-private/change';
import Empty from '../../src/-private/empty';
import { markUndefinedLeafKeys } from '../../src/utils/mark-undefined-leaf-keys';
import isObject from '../../src/utils/is-object';

const safeGet = function(obj: Record<string, any>, key: string) {
  return obj[key];
};

describe('Unit | Utility | normalize object', () => {
  it('it does nothing if no Change instance', () => {
    const changes = { value: 'Ivan' };
    const content = { value: 'Ivan', other: 'value' };
    const value = markUndefinedLeafKeys(changes, content, { safeGet, isObject });

    expect(value).toEqual({ value: 'Ivan' });
  });

  it('it set EMPTY for missing key', () => {
    const changes = { name: new Change({ nickname: 'foo' }) };
    const content = { name: { nickname: 'bar', other: 'value' } };
    const value = markUndefinedLeafKeys(changes, content, { safeGet, isObject });

    expect(value).toEqual({ name: new Change({ nickname: 'foo', other: new Empty() }) });
  });

  it('it set EMPTY for missing key with an array', () => {
    const changes = { name: new Change({ nickname: ['foo'] }) };
    const content = { name: { nickname: ['foo'], other: 'value' } };
    const value = markUndefinedLeafKeys(changes, content, { safeGet, isObject });

    expect(value).toEqual({ name: new Change({ nickname: ['foo'], other: new Empty() }) });
  });

  it('it set EMPTY for missing nested with sibling keys', () => {
    const changes = { org: new Change({ usa: { name: 'USA' } }) };
    const content = { org: { usa: { name: 'usa' }, au: { name: 'au' } } };
    const value = markUndefinedLeafKeys(changes, content, { safeGet, isObject });

    expect(value).toEqual({ org: new Change({ usa: { name: 'USA' }, au: new Empty() }) });
  });

  it('it set EMPTY for missing nested', () => {
    const changes = { org: new Change({ usa: { name: 'USA' } }) };
    const content = { org: { usa: { name: 'usa', foo: 'other' } } };
    const value = markUndefinedLeafKeys(changes, content, { safeGet, isObject });

    expect(value).toEqual({ org: new Change({ usa: { name: 'USA', foo: new Empty() } }) });
  });
});
