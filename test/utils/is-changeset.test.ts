import { Changeset } from '../../src';
import isChangeset, { CHANGESET } from '../../src/utils/is-changeset';
import strictRecord from '../support/strict-record';

describe('Unit | Utility | is changeset', function () {
  it('it correctly identifies changesets', () => {
    const dummy = Changeset({});
    expect(isChangeset(dummy)).toBeTruthy();
  });

  it('it correctly identifies non-changesets', () => {
    expect(isChangeset({})).toBeFalsy();
  });

  it('does not read unknown properties off the object', () => {
    expect(isChangeset(strictRecord({ title: 'About' }))).toBeFalsy();
  });

  it('identifies a changeset wrapping a strict record', () => {
    expect(isChangeset(Changeset(strictRecord({ title: 'About' })))).toBeTruthy();
  });

  it('identifies a function marked as a changeset', () => {
    expect(isChangeset(Object.assign(function () {}, { __changeset__: CHANGESET }))).toBeTruthy();
  });

  it('treats primitives as non-changesets', () => {
    expect(isChangeset('page')).toBeFalsy();
    expect(isChangeset(1)).toBeFalsy();
    expect(isChangeset(null)).toBeFalsy();
    expect(isChangeset(undefined)).toBeFalsy();
  });
});
