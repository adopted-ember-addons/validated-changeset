import { Changeset } from '../../src';
import isChangeset from '@validated-changeset/utils/is-changeset';

describe('Unit | Utility | is changeset', function() {
  it('it correctly identifies changesets', () => {
    const dummy = Changeset({});
    expect(isChangeset(dummy)).toBeTruthy();
  });

  it('it correctly identifies non-changesets', () => {
    expect(isChangeset({})).toBeFalsy();
  });
});
