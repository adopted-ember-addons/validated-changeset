import pureAssign from '../../src/utils/assign';

describe('Unit | Utility | assign', function() {
  it('it does not mutate destination or source objects', () => {
    const foo = { name: 'foo' };
    const bar = { name: 'bar' };
    const result = pureAssign(foo, bar, { test: 1 });

    expect(result).toEqual({ name: 'bar', test: 1 });
    expect(foo).toEqual({ name: 'foo' });
    expect(bar).toEqual({ name: 'bar' });
  });

  it('it keeps setter', () => {
    class Foo {
      name = 'foo';
      _nick: string | undefined | null;

      constructor() {
        this._nick;
      }

      get nick() {
        return this._nick;
      }

      set nick(val) {
        this._nick = val;
      }
    }
    const foo = new Foo();
    const bar = { name: 'bar' };
    const result: any = pureAssign(foo, bar, { test: 1 });

    expect(result).toEqual({ name: 'bar', test: 1 });
    expect(foo.name).toBe('foo');
    expect(bar).toEqual({ name: 'bar' });

    result.nick = 'dood';

    expect(result.nick).toBe('dood');
  });

  it('it works with proxy objects', () => {
    const foo = { name: 'foo' };
    const obj = { name: 'bar' };
    const bar = new Proxy(obj, {
      get(target: any, prop: any) {
        return target[prop];
      }
    });
    const result = pureAssign(foo, bar);

    expect(result).toEqual({ name: 'bar' });
  });
});
