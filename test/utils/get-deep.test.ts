import Change from '../../src/-private/change';
import getDeep, { getSubObject } from '../../src/-private/utils/get-deep';

describe('Unit | Utility | get deep', () => {
  it('it returns value', () => {
    const objA = { other: 'Ivan' };
    const value = getDeep(objA, 'foo');

    expect(value).toBeUndefined();
  });

  it('it returns value from nested', () => {
    const objA = { name: { other: 'Ivan' } };
    const value = getDeep(objA, 'name');

    expect(value).toEqual({ other: 'Ivan' });
  });

  it('it returns value from deep nested', () => {
    const objA = { name: { other: 'Ivan' } };
    const value = getDeep(objA, 'name.other');

    expect(value).toBe('Ivan');
  });

  it('it returns multiple values from nested', () => {
    const objA = { name: { other: 'Ivan' }, foo: { other: 'bar' } };
    const value = getDeep(objA, 'name');

    expect(value).toEqual({ other: 'Ivan' });
  });

  it('it returns Change', () => {
    const objA = { name: new Change({ other: 'Ivan' }), foo: { other: 'bar' } };

    let value = getDeep(objA, 'name');
    expect(value).toEqual(new Change({ other: 'Ivan' }));

    value = getDeep(objA, 'name.other');
    expect(value).toEqual(undefined);
  });
});

describe('Unit | Utility | get sub object', () => {
  it('it returns value', () => {
    const objA = { other: 'Ivan' };
    const value = getSubObject(objA, 'foo');

    expect(value).toBeUndefined();
  });

  it('it returns value from nested', () => {
    const objA = { name: { other: 'Ivan' } };
    const value = getSubObject(objA, 'name');

    expect(value).toEqual({ other: 'Ivan' });
  });

  it('it returns value from deep nested', () => {
    const objA = { name: { other: 'Ivan' } };
    const value = getSubObject(objA, 'name.other');

    expect(value).toBe('Ivan');
  });

  it('it returns multiple values from nested', () => {
    const objA = { name: { other: 'Ivan' }, foo: { other: 'bar' } };
    const value = getSubObject(objA, 'name');

    expect(value).toEqual({ other: 'Ivan' });
  });

  it('it returns object inside Change', () => {
    const objA = { name: new Change({ other: 'Ivan' }), foo: { other: 'bar' } };

    let value = getSubObject(objA, 'name');
    expect(value).toEqual(objA.name);

    value = getSubObject(objA, 'foo');
    expect(value).toEqual(objA.foo);

    value = getSubObject(objA, 'name.other');
    expect(value).toEqual('Ivan');
  });
});
