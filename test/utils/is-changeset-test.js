import Changeset from 'validated-changeset';
import isChangeset from 'validated-changeset/utils/is-changeset';

describe('Unit | Utility | is changeset', function() {
  it('it correctly identifies changesets', async function(assert) {
    const dummy = new Changeset({});
    assert.ok(isChangeset(dummy), 'should be true');
  });

  it('it correctly identifies non-changesets', async function(assert) {
    assert.notOk(isChangeset({}), 'should be false');
  });
});
