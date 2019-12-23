import normalizeObject from 'validated-changeset/utils/normalize-object';

describe('Unit | Utility | normalize object', () => {
  it('it returns value', async function(assert) {
    const objA = { value: 'Ivan' };
    const value = normalizeObject(objA);

    assert.equal(value, 'Ivan', 'result has value');
  });

  it('it returns value from nested', async function(assert) {
    const objA = { name: { value: 'Ivan' } };
    const value = normalizeObject(objA);

    assert.deepEqual(value, { name: 'Ivan' }, 'result has value');
  });

  it('it returns multiple values from nested', async function(assert) {
    const objA = { name: { value: 'Ivan' }, foo: { value: 'bar' } };
    const value = normalizeObject(objA);

    assert.deepEqual(value, { name: 'Ivan', foo: 'bar' }, 'result has value');
  });
});
