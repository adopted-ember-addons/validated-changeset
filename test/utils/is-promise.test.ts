import isPromise from '../../src/utils/is-promise';

describe('Unit | Utility | is promise', function() {
  const testData = [
    {
      value: Promise.resolve('foo'),
      expected: true
    },
    {
      value: new Promise(resolve => resolve('blah')),
      expected: true
    },
    {
      value: { then() {}, catch() {}, finally() {} },
      expected: true
    },
    {
      value: { then() {} },
      expected: false
    },
    {
      value: 'blah',
      expected: false
    },
    {
      value: 42,
      expected: false
    },
    {
      value: ['meow'],
      expected: false
    },
    {
      value: null,
      expected: false
    }
  ];

  testData.forEach(({ value, expected }) => {
    it('it checks if an object is an instance of an RSVP.Promise', () => {
      const result = isPromise(value);

      expect(result).toEqual(expected);
    });
  });
});
