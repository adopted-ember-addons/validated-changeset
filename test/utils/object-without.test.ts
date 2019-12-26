import objectWithout from '@validated-changeset/utils/object-without';

describe('Unit | Utility | object without', () => {
  it('it excludes the given keys from all merged objects', () => {
    const objA = { name: 'Ivan' };
    const objB = { name: 'John' };
    const objC = { age: 27 };
    const objD = objectWithout(['age'], objA, objB, objC);

    expect(objD).toEqual({ name: 'John' });
    expect(objA.name).toEqual('Ivan');
    expect(objC.age).toEqual(27);
  });
});
