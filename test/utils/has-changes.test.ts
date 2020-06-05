import { hasChanges } from '../../src/utils/has-changes';
import Change from '../../src/-private/change';
import isObject from '../../src/utils/is-object';

describe('Unit | Utility | has changes', () => {
  it('it returns false', () => {
    const objA = new Change({ value: 'Ivan' });
    const value = hasChanges(objA, isObject);

    expect(value).toBe(false);
  });

  it('it returns true', () => {
    const objA = { name: new Change({ value: 'Ivan' }) };
    const value = hasChanges(objA, isObject);

    expect(value).toEqual(true);
  });

  it('it returns multiple values from nested', () => {
    const objA = { name: { value: 'Ivan' }, foo: new Change({ value: 'bar' }) };
    const value = hasChanges(objA, isObject);

    expect(value).toEqual(true);
  });

  it('it returns for deep nested', () => {
    const objA = { details: { name: new Change({ value: 'Ivan' }) } };
    const value = hasChanges(objA, isObject);

    expect(value).toEqual(true);
  });

  it('it returns false for no changes', () => {
    const objA = { details: { name: { value: 'Ivan' } } };
    const value = hasChanges(objA, isObject);

    expect(value).toEqual(false);
  });
});
