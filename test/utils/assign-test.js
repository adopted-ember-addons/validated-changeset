import pureAssign from 'validated-changeset/utils/assign';

describe('Unit | Utility | assign', function() {
  it('it does not mutate destination or source objects', async function(assert) {
    const foo = { name: 'foo' };
    const bar = { name: 'bar' };
    const result = pureAssign(foo, bar, { test: 1 });

    assert.deepEqual(result, { name: 'bar', test: 1 }, 'should assign object');
    assert.deepEqual(foo, { name: 'foo' }, 'should not mutate destination');
    assert.deepEqual(bar, { name: 'bar' }, 'should not mutate source');
  });

  it('it keeps setter', async function(assert) {
    class Foo {
      name = 'foo';
      get nick() {
        return this._nick;
      }

      set nick(val) {
        this._nick = val;
      }
    }
    const foo = new Foo();
    const bar = { name: 'bar' };
    const result = pureAssign(foo, bar, { test: 1 });

    assert.deepEqual(result, { name: 'bar', test: 1 }, 'should assign object');
    assert.deepEqual(foo.name, 'foo', 'should not mutate destination');
    assert.deepEqual(bar, { name: 'bar' }, 'should not mutate source');

    result.nick = 'dood';

    assert.equal(result.nick, 'dood', 'should not mutate source');
  });
});
