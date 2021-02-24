import { Changeset, unwrap } from '../../src';

describe('Unit | Utility | unwrap', () => {
  describe('with no changes', () => {
    it('gets the original value', () => {
      let changeset = Changeset({ obj: { emails: ['foo@a.com'] } });

      expect(unwrap(changeset.get('obj.emails'))).toEqual(['foo@a.com']);
    });
  });

  describe('with changes to the leaf data', () => {
    const data = Object.freeze({
      obj: { emails: ['foo@a.com'] },
      nested: { data: { value: 'bar' } }
    });

    it('gets a preview of the value', () => {
      let changeset = Changeset(data);

      changeset.set('obj.emails.0', 'bar@b.com');
      changeset.set('nested.data.value', 'bar2');

      expect(unwrap(changeset.get('obj.emails.0'))).toEqual('bar@b.com');
      expect(unwrap(changeset.get('nested.data.value'))).toEqual('bar2');
    });

    it('handles deletions', () => {
      let changeset = Changeset(data);

      changeset.set('obj.emails.0', null);
      changeset.set('nested.data.value', null);

      expect(unwrap(changeset.get('obj.emails.0'))).toEqual(null);
      expect(unwrap(changeset.get('nested.data.value'))).toEqual(null);
    });
  });
});
