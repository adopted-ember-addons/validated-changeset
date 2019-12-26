import take from '@validated-changeset/utils/take';

describe('Unit | Utility | take', function() {
  it('it returns an object with only the specified keys', () => {
    const employee = {
      name: 'Milton Waddams',
      stapler: 'Red',
      deskLocation: 'basement'
    };
    const expectedResult = { name: 'Milton Waddams', deskLocation: 'basement' };
    const result = take(employee, ['name', 'deskLocation']);

    expect(result).toEqual(expectedResult);
  });
});
