import mergeDeep from 'validated-changeset/utils/merge-deep';
import Change from 'validated-changeset/-private/change';

describe('Unit | Utility | merge deep', () => {
  it('it returns merged objects', async function(assert) {
    const objA = { other: 'Ivan' };
    const objB = { foo: new Change('bar'), zoo: 'doo' };
    const value = mergeDeep(objA, objB);

    assert.deepEqual(value, { other: 'Ivan', foo: 'bar', zoo: 'doo' }, 'merges both values');
  });

  it('it unsets', async function(assert) {
    const objA = { other: 'Ivan' };
    const objB = { other: new Change(null) };
    const value = mergeDeep(objA, objB);

    assert.deepEqual(value, { other: null }, 'unsets value');
  });

  it('it works with deeper nested objects', async function(assert) {
    const objA = { company: { employees: ['Ivan', 'Jan'] } };
    const objB = { company: { employees: new Change(['Jull', 'Olafur']) } };
    const value = mergeDeep(objA, objB);

    assert.deepEqual(value, { company: { employees: ['Jull', 'Olafur'] } }, 'has right employees');
  });
});
