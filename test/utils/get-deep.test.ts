import getDeep from '../../src/utils/get-deep';

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
});
