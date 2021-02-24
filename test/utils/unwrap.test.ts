import { Changeset, unwrap } from '../../src';

describe('Unit | Utility | unwrap', () => {
  describe('with no changes', () => {
    it('gets the original value', () => {
      let changeset = Changeset({ obj: { emails: ['foo@a.com'] } });
      let actual = unwrap(changeset.get('obj.emails'));

      expect(actual).toEqual(['foo@a.com']);
    });
  });

  describe('with changes to the leaf data', () => {
    it('gets a preview of the value', () => {
      let changeset = Changeset({ obj: { emails: ['foo@a.com'] } });

      changeset.set('obj.emails.0', 'bar@b.com');

      let actual = unwrap(changeset.get('obj.emails'));

      expect(actual).toEqual(['bar@b.com']);
    });
  });
});
