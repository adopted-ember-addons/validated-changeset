import setDeep from '../../src/utils/set-deep';
import Change from '../../src/-private/change';

describe('Unit | Utility | set deep', () => {
  it('it sets value', () => {
    const objA = { other: 'Ivan' };
    const value = setDeep(objA, 'foo', 'bar');

    expect(value).toEqual({ other: 'Ivan', foo: 'bar' });
  });

  it('it sets deeper', () => {
    const objA = { other: 'Ivan' };
    const value = setDeep(objA, 'other.nick', 'bar');

    expect(value).toEqual({ other: { nick: 'bar' } });
  });

  it('it overrides leaf key', () => {
    const objA = { name: { other: 'Ivan' } };
    const value = setDeep(objA, 'name', 'foo');

    expect(value).toEqual({ name: 'foo' });
  });

  it('it handles nested key', () => {
    const objA = { name: { other: 'Ivan' } };
    const value = setDeep(objA, 'name.other', 'foo');

    expect(value).toEqual({ name: { other: 'foo' } });
  });

  it('it handles sibling keys', () => {
    const objA = { name: { other: 'Ivan', koala: 'bear' }, star: 'wars' };
    const value = setDeep(objA, 'name.other', 'foo');

    expect(value).toEqual({ name: { other: 'foo', koala: 'bear' }, star: 'wars' });
  });

  it('it works with multiple values', () => {
    const objA = { name: { other: 'Ivan' }, foo: { other: 'bar' } };
    const value = setDeep(objA, 'name', 'zoo');

    expect(value).toEqual({ foo: { other: 'bar' }, name: 'zoo' });
  });

  it('it works with nested multiple values', () => {
    const objA = { top: { name: 'jimmy', foo: { other: 'bar' } } };
    const value = setDeep(objA, 'top.name', 'zoo');

    expect(value).toEqual({ top: { foo: { other: 'bar' }, name: 'zoo' } });
  });

  it('it works with nested multiple values with Changes', () => {
    const objA = {
      top: new Change({ name: 'jimmy', foo: { other: 'bar' } })
    };
    const value = setDeep(objA, 'top.name', 'zoo');

    expect(value).toEqual({
      top: new Change({
        foo: { other: 'bar' },
        name: 'zoo'
      })
    });
  });

  it('it works with nested Changes', () => {
    const objA = {
      top: new Change({ name: 'jimmy', foo: { other: 'bar' } })
    };
    const value = setDeep(objA, 'top.name', new Change('zoo'));

    expect(value).toEqual({
      top: new Change({
        foo: { other: 'bar' },
        name: 'zoo' // value is not a Change instance
      })
    });
  });
});
