import { getKeyValues } from '../../src/utils/get-key-values';

describe('Unit | Utility | getKeyValues', function() {
  it('it works with single level values', () => {
    const result = getKeyValues({ test: { value: 1 } });

    expect(result).toEqual([{ key: 'test', value: 1 }]);
  });

  it('it works with nested keys', () => {
    const result = getKeyValues({
      user: {
        firstName: { value: 'Michael' },
        lastName: { value: 'Bolton' },
        address: {
          city: { value: 'NYC' },
          state: { value: 'New York' }
        }
      }
    });

    expect(result).toEqual([
      { key: 'user.firstName', value: 'Michael' },
      { key: 'user.lastName', value: 'Bolton' },
      { key: 'user.address.city', value: 'NYC' },
      { key: 'user.address.state', value: 'New York' }
    ]);
  });
});
