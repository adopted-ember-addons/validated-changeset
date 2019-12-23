import setDeep from 'validated-changeset/utils/set-deep';

describe('Unit | Utility | set deep', () => {
  it('it sets value', async function(assert) {
    const objA = { other: 'Ivan' };
    const value = setDeep(objA, 'foo', 'bar');

    assert.deepEqual(value, { other: 'Ivan', foo: 'bar' }, 'it sets value');
  });

  it('it sets deeper', async function(assert) {
    const objA = { other: 'Ivan' };
    const value = setDeep(objA, 'other.nick', 'bar');

    assert.deepEqual(value, { other: { nick: 'bar' } }, 'sets deeper');
  });

  it('it overrides leaf key', async function(assert) {
    const objA = { name: { other: 'Ivan' } };
    const value = setDeep(objA, 'name', 'foo');

    assert.deepEqual(value, { name: 'foo' }, 'result has value');
  });

  it('it handles nested key', async function(assert) {
    const objA = { name: { other: 'Ivan' } };
    const value = setDeep(objA, 'name.other', 'foo');

    assert.deepEqual(value, { name: { other: 'foo' } }, 'result has value');
  });

  it('it handles sibling keys', async function(assert) {
    const objA = { name: { other: 'Ivan', koala: 'bear' }, star: 'wars' };
    const value = setDeep(objA, 'name.other', 'foo');

    assert.deepEqual(value, { name: { other: 'foo', koala: 'bear' }, star: 'wars' }, 'keeps sibling key');
  });

  it('it works with multiple values', async function(assert) {
    const objA = { name: { other: 'Ivan' }, foo: { other: 'bar' } };
    const value = setDeep(objA, 'name', 'zoo');

    assert.deepEqual(value, { foo: { other: 'bar' }, name: 'zoo' }, 'result has value');
  });
});
