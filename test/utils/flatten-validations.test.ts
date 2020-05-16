import { flattenValidations } from '../../src/utils/flatten-validations';

describe('Unit | Utility | flattenValidations', function() {
  it('it works with single level values', () => {
    const testFunc = () => {};
    const input = { testFunc };
    const result: Record<string, any> = flattenValidations(input);

    expect(result.testFunc).toEqual(testFunc);
  });

  it('it works with nested keys', () => {
    const nyFunc = () => {};
    const input = {
      usa: {
        ny: nyFunc
      }
    };
    const result: Record<string, any> = flattenValidations(input);

    expect(result['usa.ny']).toEqual(nyFunc);
  });

  it('it works with nested keys', () => {
    const nyFunc = () => {};
    const mnFunc = () => {};
    const paulFunc = () => {};
    const groveFunc = () => {};
    const input = {
      usa: {
        ny: [nyFunc, mnFunc],
        mn: {
          stpaul: paulFunc,
          grove: groveFunc
        }
      }
    };
    const result: Record<string, any> = flattenValidations(input);

    expect(result.usa).toBeUndefined();
    expect(result['usa.ny']).toEqual([nyFunc, mnFunc]);
    expect(result['usa.mn.stpaul']).toEqual(paulFunc);
    expect(result['usa.mn.grove']).toEqual(groveFunc);
  });

  it('it works with mix of functions and nested keys', () => {
    const nyFunc = () => {};
    const mnFunc = () => {};
    const paulFunc = () => {};
    const villageFunc = () => {};
    const input = {
      usa: {
        ny: [nyFunc, mnFunc],
        mn: {
          stpaul: [paulFunc],
          grove: {
            village: villageFunc
          }
        }
      }
    };
    const result: Record<string, any> = flattenValidations(input);

    expect(result.usa).toBeUndefined();
    expect(result['usa.ny']).toEqual([nyFunc, mnFunc]);
    expect(result['usa.mn.stpaul']).toEqual([paulFunc]);
    expect(result['usa.mn.grove.village']).toEqual(villageFunc);
  });
});
