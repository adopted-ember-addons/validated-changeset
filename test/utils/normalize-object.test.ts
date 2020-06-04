import Change from '../../src/-private/change';
import Empty from '../../src/-private/empty';
import normalizeObject, { normalizeEmptyObject } from '../../src/utils/normalize-object';

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
});

describe('Unit | Utility | normalize empty object', () => {
  it('it returns value', () => {
    const objA = new Empty();
    const value = normalizeEmptyObject(objA);

    expect(value).toBeUndefined();
  });

  it('it returns value object without Empty', () => {
    const objA = { value: 'Ivan' };
    const value = normalizeEmptyObject(objA);

    expect(value).toEqual({ value: 'Ivan' });
  });

  it('it returns value from nested', () => {
    const objA = { name: new Empty() };
    const value = normalizeEmptyObject(objA);

    expect(value).toEqual({ name: undefined });
  });

  it('it returns multiple values from nested', () => {
    const objA = { name: new Empty(), foo: new Empty() };
    const value = normalizeEmptyObject(objA);

    expect(value).toEqual({ name: undefined, foo: undefined });
  });

  it('it returns for deep nested', () => {
    const objA = { details: { name: new Empty() } };
    const value = normalizeEmptyObject(objA);

    expect(value).toEqual({ details: { name: undefined } });
  });
});
