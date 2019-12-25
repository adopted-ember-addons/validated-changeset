import mergeDeep from '../../src/utils/merge-deep';
import Change from '../../src/-private/change';

describe('Unit | Utility | merge deep', () => {
  it('it returns merged objects', () => {
    const objA = { other: 'Ivan' };
    const objB = { foo: new Change('bar'), zoo: 'doo' };
    const value = mergeDeep(objA, objB);

    expect(value).toEqual({ other: 'Ivan', foo: 'bar', zoo: 'doo' });
  });

  it('it unsets', () => {
    const objA = { other: 'Ivan' };
    const objB = { other: new Change(null) };
    const value = mergeDeep(objA, objB);

    expect(value).toEqual({ other: null });
  });

  it('it works with deeper nested objects', () => {
    const objA = { company: { employees: ['Ivan', 'Jan'] } };
    const objB = { company: { employees: new Change(['Jull', 'Olafur']) } };
    const value = mergeDeep(objA, objB);

    expect(value).toEqual({ company: { employees: ['Jull', 'Olafur'] } });
  });
});
