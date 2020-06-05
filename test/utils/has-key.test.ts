import { hasKey } from '../../src/utils/has-key';
import Change from '../../src/-private/change';

describe('Unit | Utility | has changes', () => {
  it('it returns true with Change class', () => {
    const objA = new Change({ value: 'Ivan' });
    const value = hasKey(objA, 'value');

    expect(value).toBe(true);
  });

  it('it returns true', () => {
    const objA = { name: new Change({ value: 'Ivan' }) };
    const value = hasKey(objA, 'name');

    expect(value).toEqual(true);
  });

  it('it returns multiple values from nested', () => {
    const objA = { name: { value: 'Ivan' }, foo: new Change({ value: 'bar' }) };
    const value = hasKey(objA, 'foo');

    expect(value).toEqual(true);
  });

  it('it returns for deep nested', () => {
    const objA = { details: { name: new Change({ value: 'Ivan' }) } };
    const value = hasKey(objA, 'details.name');

    expect(value).toEqual(true);
  });

  it('it returns true for 3 levels deep', () => {
    const objA = { details: { name: { value: 'Ivan' } } };
    const value = hasKey(objA, 'details.name.value');

    expect(value).toEqual(true);
  });
});
