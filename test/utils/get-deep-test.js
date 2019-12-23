import getDeep from 'validated-changeset/utils/get-deep';

describe('Unit | Utility | get deep', () => {
  it('it returns value', async function(assert) {
    const objA = { other: 'Ivan' };
    const value = getDeep(objA, 'foo');

    assert.equal(value, undefined, 'result has value');
  });

  it('it returns value from nested', async function(assert) {
    const objA = { name: { other: 'Ivan' } };
    const value = getDeep(objA, 'name');

    assert.deepEqual(value, { other: 'Ivan' }, 'result has value');
  });

  it('it returns value from deep nested', async function(assert) {
    const objA = { name: { other: 'Ivan' } };
    const value = getDeep(objA, 'name.other');

    assert.deepEqual(value, 'Ivan', 'result has value');
  });

  it('it returns multiple values from nested', async function(assert) {
    const objA = { name: { other: 'Ivan' }, foo: { other: 'bar' } };
    const value = getDeep(objA, 'name');

    assert.deepEqual(value, { other: 'Ivan' }, 'result has value');
  });
});
