import isObject from '@validated-changeset/utils/is-object';

describe('Unit | Utility | is object', function() {
  const testData = [
    {
      label: 'POJOs',
      value: { foo: 'bar' },
      expected: true
    },
    {
      label: 'EmberObjects',
      value: Object.create({ foo: 'bar' }),
      expected: true
    },
    {
      label: 'ObjectProxies',
      value: new Proxy({ content: Object.create({ foo: 'bar' }) }, {}),
      expected: true
    }
  ];

  testData.forEach(({ label, value, expected }) => {
    it(`it works with ${label}`, () => {
      const result = isObject(value);
      expect(result).toEqual(expected);
    });
  });
});
