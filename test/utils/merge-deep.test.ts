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

  it('works with arrays', () => {
    const objA = { employees: ['Ivan', 'Jan'] };
    const objB = { employees: { 0: new Change('Jull'), 1: new Change('Olafur') } };
    const value = mergeDeep(objA, objB);

    expect(value).toEqual({ employees: ['Jull', 'Olafur'] });
  });

  it('adds to arrays', () => {
    const objA = { employees: ['Ivan'] };
    const objB = { employees: { 1: new Change('Olafur') } };
    const value = mergeDeep(objA, objB);

    expect(value).toEqual({ employees: ['Ivan', 'Olafur'] });
  });

  it('removes from arrays', () => {
    const objA = { employees: ['Ivan'] };
    const objB = { employees: { 0: new Change(null) } };
    const value = mergeDeep(objA, objB);

    // this isn't really the same as removing, but it might be the best we can do?
    expect(value).toEqual({ employees: [null] });
  });

  it('removes from deep array data', () => {
    const objA = {
      employees: [{ email: 'a@email.com' }, { email: 'b@email.com' }, { email: 'c@email.com' }]
    };
    const objB = { employees: { 2: new Change(undefined) } };
    const value = mergeDeep(objA, objB);

    expect(value).toEqual({
      employees: [{ email: 'a@email.com' }, { email: 'b@email.com' }, undefined]
    });
  });

  it('overrides null', () => {
    const objB = { employees: ['Ivan'] };

    const value = mergeDeep(null, objB);

    expect(value).toEqual({ employees: ['Ivan'] });
  });

  it('overrides undefined', () => {
    const objB = { employees: ['Ivan'] };

    const value = mergeDeep(undefined, objB);

    expect(value).toEqual({ employees: ['Ivan'] });
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
      jam = new Change(['Jull', 'Olafur']);
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
    expect(value.jam).toEqual(new Change(['Jull', 'Olafur']));

    expect(objA.jam).toEqual(new Change(['Jull', 'Olafur']));
    expect(objA.foo).toEqual({ baz: 'bar' });
    expect(objA._boo).toEqual('doo');
    expect(objB.boo).toEqual(new Change('doo'));
    expect(objA.other).toEqual('Ivan');
    expect(objB.foo).toEqual({ baz: new Change('bar') });
    expect(objA.other).toEqual('Ivan');
  });
});
