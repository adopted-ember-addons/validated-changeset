import { Changeset } from '../src';

let dummyModel: any;

/// ****************************************
/// Test that each method of access works ok
/// ****************************************
describe('Unit | Utility | changeset | access', () => {
  beforeEach(() => {
    dummyModel = {
      save() {
        return Promise.resolve(this);
      },
      name: 'Bryan',
      person: {
        name: 'Steve',
        age: 42
      },
      primes: [5, 7, 11]
    };
  });

  afterEach(() => {
    dummyModel = {};
  });

  /**
   * #toString
   */

  it('content can be read by direct property access', () => {
    const dummyChangeset = Changeset(dummyModel);

    expect(dummyChangeset.name).toEqual('Bryan');
    expect(dummyChangeset.person.age).toEqual(42);
    expect(dummyChangeset.primes[2]).toEqual(11);
    expect(dummyChangeset.primes.length).toEqual(3);
    let keys = Object.keys(dummyChangeset.person);
    expect(keys).toContain('age');
    expect(keys).toContain('name');
  });

  it('content can be written by direct property access', () => {
    const dummyChangeset = Changeset(dummyModel);

    dummyChangeset.person.name = 'Susan';
    expect(dummyModel.person.name).toEqual('Steve');
    dummyChangeset.save();
    expect(dummyModel.person.name).toEqual('Susan');

    dummyChangeset.primes[2] = 17;
    expect(dummyModel.primes[2]).toEqual(11);
    dummyChangeset.save();
    expect(dummyModel.primes[2]).toEqual(17);

    dummyChangeset.primes[2]++;
    expect(dummyModel.primes[2]).toEqual(17);
    dummyChangeset.save();
    expect(dummyModel.primes[2]).toEqual(18);
  });

  it('content can be read by changeset.get', () => {
    const dummyChangeset = Changeset(dummyModel);

    expect(dummyChangeset.content.name).toEqual('Bryan');
    expect(dummyChangeset.content.person.age).toEqual(42);
    expect(dummyChangeset.content.person.get('age')).toEqual(42);
    expect(dummyChangeset.content.primes.2).toEqual(11);
    expect(dummyChangeset.content.primes[2]).toEqual(11);
    expect(dummyChangeset.content.primes.length).toEqual(3);
    expect(dummyChangeset.content.primes.length).toEqual(3);
    let keys = Object.keys(dummyChangeset.content.person);
    expect(keys).toContain('age');
    expect(keys).toContain('name');
  });

  it('content can be written by changeset.set', () => {
    const dummyChangeset = Changeset(dummyModel);

    dummyChangeset.content.person.name =  'Susan';
    expect(dummyModel.person.name).toEqual('Steve');
    dummyChangeset.save();
    expect(dummyModel.person.name).toEqual('Susan');

    dummyChangeset.content.primes[2] =  17;
    expect(dummyModel.primes[2]).toEqual(11);
    dummyChangeset.save();
    expect(dummyModel.primes[2]).toEqual(17);

    dummyChangeset.content.primes[2] =  dummyChangeset.content.primes[2]+ 1;
    expect(dummyModel.primes[2]).toEqual(17);
    dummyChangeset.save();
    expect(dummyModel.primes[2]).toEqual(18);
  });
});
