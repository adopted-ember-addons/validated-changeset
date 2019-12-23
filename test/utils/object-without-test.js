import objectWithout from 'validated-changeset/utils/object-without';

describe('Unit | Utility | object without', function() {
  it('it exludes the given keys from all merged objects', async function(assert) {
    const objA = { name: 'Ivan' };
    const objB = { name: 'John' };
    const objC = { age: 27 };
    const objD = objectWithout(['age'], objA, objB, objC);

    assert.deepEqual(objD, { name: 'John' }, 'result only contains name');
    assert.deepEqual(objA.name, 'Ivan', 'does not mutate original object');
    assert.deepEqual(objC.age, 27, 'does not mutate original object');
  });
});
