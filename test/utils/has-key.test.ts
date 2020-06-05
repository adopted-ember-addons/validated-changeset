import { hasKey, pathInChanges } from '../../src/utils/has-key';
import Change from '../../src/-private/change';

function safeGet(obj: any, key: string) {
  return obj[key];
}

describe('Unit | Utility | has key', () => {
  it('it returns true with Change class', () => {
    const objA = new Change({ value: 'Ivan' });
    const value = hasKey(objA, 'value', safeGet);

    expect(value).toBe(true);
  });

  it('it returns true', () => {
    const objA = { name: new Change({ value: 'Ivan' }) };
    const value = hasKey(objA, 'name', safeGet);

    expect(value).toEqual(true);
  });

  it('it returns multiple values from nested', () => {
    const objA = { name: { value: 'Ivan' }, foo: new Change({ value: 'bar' }) };
    const value = hasKey(objA, 'foo', safeGet);

    expect(value).toEqual(true);
  });

  it('it returns for deep nested', () => {
    const objA = { details: { name: new Change({ value: 'Ivan' }) } };
    const value = hasKey(objA, 'details.name', safeGet);

    expect(value).toEqual(true);
  });

  it('it returns true for 3 levels deep', () => {
    const objA = { details: { name: { value: 'Ivan' } } };
    const value = hasKey(objA, 'details.name.value', safeGet);

    expect(value).toEqual(true);
  });
});

describe('Unit | Utility | path in changes', () => {
  it('it returns true with Change class', () => {
    const objA = new Change({ value: 'Ivan' });
    const value = pathInChanges(objA, 'value', safeGet);

    expect(value).toBe(false);
  });

  it('it returns true', () => {
    const objA = { name: new Change({ value: 'Ivan' }) };
    const value = pathInChanges(objA, 'name.value', safeGet);

    expect(value).toEqual(true);
  });

  it('it returns multiple values from nested', () => {
    const objA = { name: { value: 'Ivan' }, foo: new Change({ value: 'bar' }) };
    const value = pathInChanges(objA, 'foo.value', safeGet);

    expect(value).toEqual(true);
  });

  it('it returns true for deep nested', () => {
    const objA = { details: { name: new Change({ value: 'Ivan' }) } };
    const value = pathInChanges(objA, 'details.name.value', safeGet);

    expect(value).toEqual(true);
  });

  it('it returns false for 3 levels deep', () => {
    const objA = { details: { name: { value: 'Ivan' } } };
    const value = pathInChanges(objA, 'details.name.value', safeGet);

    expect(value).toEqual(false);
  });
});
