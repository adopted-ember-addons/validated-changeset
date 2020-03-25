import { getKeyValues, getKeyErrorValues } from '../../src/utils/get-key-values';
import Err from '../../src/-private/err';

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

describe('Unit | Utility | getKeyErrorValues', function() {
  it('it works with single level values', () => {
    const result = getKeyErrorValues({
      test: new Err(1, 'foobar')
    });

    expect(result).toEqual([{ key: 'test', value: 1, validation: 'foobar' }]);
  });

  it('it works with nested keys', () => {
    const result = getKeyErrorValues({
      user: {
        firstName: new Err('Michael', 'Jordan'),
        lastName: { value: 'Bolton' },
        address: {
          city: new Err('NYC', 'dungeon'),
          state: new Err('New York', 'grassland')
        }
      }
    });

    expect(result).toEqual([
      { key: 'user.firstName', value: 'Michael', validation: 'Jordan' },
      { key: 'user.address.city', value: 'NYC', validation: 'dungeon' },
      { key: 'user.address.state', value: 'New York', validation: 'grassland' }
    ]);
  });
});
