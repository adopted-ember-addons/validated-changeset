import { buildOldValues } from '../../src/utils/build-old-values';
import getDeep from '../../src/utils/get-deep';

describe('Unit | Utility | build old values', () => {
  it('it returns k-v of old values', () => {
    const objA = { user: { firstName: 'Ivan' } };
    const changes = [
      { key: 'user.firstName', value: 'Michael' },
      { key: 'user.lastName', value: 'Bolton' }
    ];

    const contentValues = buildOldValues(objA, changes, getDeep);

    expect(contentValues).toEqual({ 'user.firstName': 'Ivan' });
  });

  it('it returns k-v of same values', () => {
    const objA = { user: { firstName: 'Ivan' } };
    const changes = [{ key: 'user.firstName', value: 'Ivan' }];

    const contentValues = buildOldValues(objA, changes, getDeep);

    expect(contentValues).toEqual({ 'user.firstName': 'Ivan' });
  });

  it('it returns k-v of old values at different depts', () => {
    const objA = { user: { firstName: 'Ivan', lastName: { nickname: 'CC' } } };
    const changes = [
      { key: 'user.firstName', value: 'Michael' },
      { key: 'user.lastName.nickname', value: 'Bolt' }
    ];

    const contentValues = buildOldValues(objA, changes, getDeep);

    expect(contentValues).toEqual({ 'user.firstName': 'Ivan', 'user.lastName.nickname': 'CC' });
  });
});
