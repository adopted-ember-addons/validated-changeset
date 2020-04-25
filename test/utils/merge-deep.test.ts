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

  it('it works with classes', () => {
    class Employee {
      names = [];
    }
    const objA = { company: { employees: ['Ivan', 'Jan'] } };
    const objB = { company: { employees: new Change(new Employee()) } };
    const value: Record<string, any> = mergeDeep(objA, objB);

    expect(value.company.employees instanceof Employee).toEqual(true);
  });

  it('it works with unsafe properties', () => {
    class A {
      _boo = 'bo';

      get boo() {
        return this._boo;
      }
      set boo(value) {
        this._boo = value;
      }

      foo = { baz: 'ba' };
    }

    class B extends A {
      other = 'Ivan';
    }

    const objA = new B();
    const objB = { boo: new Change('doo'), foo: { baz: new Change('bar') } };

    const value: Record<string, any> = mergeDeep(objA, objB);

    expect(value instanceof B).toBe(true);
    expect(value.boo).toBe('doo');
    expect(value.other).toBe('Ivan');
    expect(value.foo).toEqual({ baz: 'bar' });
  });
});
