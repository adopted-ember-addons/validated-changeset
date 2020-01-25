import keyInObject from '../../src/utils/key-in-object';

describe('Unit | Utility | key in object', function() {
  it('it works with empty key', () => {
    let result = keyInObject({}, '');
    expect(result).toBe(false);
  });

  it('it works', () => {
    let result = keyInObject({ b: 'a' }, 'b');
    expect(result).toBe(true);

    result = keyInObject({ b: 'a' }, 'a');
    expect(result).toBe(false);
  });

  it('it works with nested', () => {
    let result = keyInObject({ b: { a: 'c' } }, 'b.a');
    expect(result).toBe(true);

    result = keyInObject({ b: { a: 'c' } }, 'b.c');
    expect(result).toBe(false);
  });

  it('it works with nested key and only partially found', () => {
    let result = keyInObject({ b: true }, 'b.a');
    expect(result).toBe(false);
  });
});
