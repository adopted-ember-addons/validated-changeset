import Change from '../../src/-private/change';
import normalizeObject from '../../src/utils/normalize-object';

describe('Unit | Utility | normalize object', () => {
  it('it returns value', () => {
    const objA = new Change('Ivan');
    const value = normalizeObject(objA);

    expect(value).toBe('Ivan');
  });

  it('it returns value object without Change', () => {
    const objA = { value: 'Ivan' };
    const value = normalizeObject(objA);

    expect(value).toEqual({ value: 'Ivan' });
  });

  it('it returns value from nested', () => {
    const objA = { name: new Change('Ivan') };
    const value = normalizeObject(objA);

    expect(value).toEqual({ name: 'Ivan' });
  });

  it('it returns multiple values from nested', () => {
    const objA = { name: new Change('Ivan'), foo: new Change('bar') };
    const value = normalizeObject(objA);

    expect(value).toEqual({ name: 'Ivan', foo: 'bar' });
  });

  it('it returns for deep nested', () => {
    const objA = { details: { name: new Change('Ivan') } };
    const value = normalizeObject(objA);

    expect(value).toEqual({ details: { name: 'Ivan' } });
  });

  it('it handles cyclical structures', () => {
    let cyclical = { key: { cyclical: {}, name: 'not scoot' } };
    cyclical.key = { cyclical, name: 'scoot' };
    let obj = { cyclical };
    const value = normalizeObject(obj);

    expect(value.cyclical.key.name).toEqual('scoot');
  });
});
