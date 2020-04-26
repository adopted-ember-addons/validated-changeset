import { Changeset, ValidatedChangeset } from '../src';
import get from '../src/utils/get-deep';
import set from '../src/utils/set-deep';
import lookupValidator from '../src/utils/validator-lookup';

let dummyModel: any;
const exampleArray: Array<any> = [];
const dummyValidations: Record<string, any> = {
  name(_k: string, value: any) {
    return (!!value && value.length > 3) || 'too short';
  },
  email(_k: string, value: any) {
    const errors = [];
    if (value && value.length < 5) {
      errors.push('too short');
    }
    if (value && !value.includes('@')) {
      errors.push('not an email');
    }

    if (errors.length < 1) {
      return;
    }
    return errors.length > 1 ? errors : errors[0];
  },
  password(_k: string, value: unknown) {
    return value || ['foo', 'bar'];
  },
  passwordConfirmation(
    _k: string,
    newValue: unknown,
    _oldValue: unknown,
    { password: changedPassword }: { password: string },
    { password }: { password: string }
  ) {
    return (
      (!!newValue && (changedPassword === newValue || password === newValue)) ||
      "password doesn't match"
    );
  },
  async(_k: string, value: unknown) {
    return Promise.resolve(value);
  },
  options(_k: string, value: unknown) {
    return !!value;
  },
  org: {
    isCompliant(_k: string, value: unknown) {
      return !!value;
    },
    usa: {
      ny: [
        (_k: string, value: unknown) => {
          return !!value || 'must be present';
        },
        (_k: string, value: string) => {
          return /[A-z]/.test(value) ? true : 'only letters work';
        }
      ]
    }
  }
};

function dummyValidator({
  key,
  newValue,
  oldValue,
  changes,
  content
}: {
  key: string;
  newValue: unknown;
  oldValue: unknown;
  changes: any;
  content: any;
}) {
  const validatorFn = get(dummyValidations, key);

  if (typeof validatorFn === 'function') {
    return validatorFn(newValue, oldValue, changes, content);
  }
}

describe('Unit | Utility | changeset', () => {
  beforeEach(() => {
    dummyModel = {
      save() {
        return Promise.resolve(this);
      },
      exampleArray
    };
  });

  afterEach(() => {
    dummyModel = {};
  });

  /**
   * #toString
   */

  it('content can be an empty hash', () => {
    expect.assertions(1);

    const emptyObject = {};
    const dummyChangeset = Changeset(emptyObject, lookupValidator(dummyValidations));

    expect(dummyChangeset.toString()).toEqual('changeset:[object Object]');
  });

  it('content can be an empty hash', () => {
    expect.assertions(1);

    const emptyObject = {};
    const dummyChangeset = new ValidatedChangeset(emptyObject, lookupValidator(dummyValidations));

    expect(dummyChangeset.toString()).toEqual('changeset:[object Object]');
  });

  /**
   * #error
   */

  it('#error returns the error object and keeps changes', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    const expectedResult = { name: { validation: 'too short', value: 'a' } };
    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.error).toEqual(expectedResult);
    expect(dummyChangeset.error.name).toEqual(expectedResult.name);
    expect(dummyChangeset.get('error.name')).toEqual(expectedResult.name);
    expect(dummyChangeset.change).toEqual({ name: 'a' });
    expect(dummyChangeset.change.name).toEqual('a');
    expect(dummyChangeset.get('change.name')).toEqual('a');
  });

  it('#error can use custom validator', () => {
    const dummyChangeset = Changeset(dummyModel, dummyValidator);
    const expectedResult = { name: { validation: 'too short', value: 'a' } };
    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.error).toEqual(expectedResult);
    expect(dummyChangeset.error.name).toEqual(expectedResult.name);
    expect(dummyChangeset.get('error.name')).toEqual(expectedResult.name);
    expect(dummyChangeset.change).toEqual({ name: 'a' });
    expect(dummyChangeset.change.name).toEqual('a');
    expect(dummyChangeset.get('change.name')).toEqual('a');
  });

  it('can get nested values in the error object', function() {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    const expectedResult = { validation: 'too short', value: 'a' };
    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.get('error.name')).toEqual(expectedResult);
  });

  it('can can work with an array of nested validations', function() {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    const expectedResult = { validation: ['too short', 'not an email'], value: 'a' };
    dummyChangeset.set('email', 'a');

    expect(dummyChangeset.get('error.email')).toEqual(expectedResult);
  });

  /**
   * #change
   */

  it('#change returns the changes object', () => {
    const dummyChangeset = Changeset(dummyModel);
    const expectedResult = { name: 'a' };
    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.change).toEqual(expectedResult);
  });

  it('#change supports `undefined`', () => {
    const model = { name: 'a' };
    const dummyChangeset = Changeset(model);
    const expectedResult = { name: undefined };
    dummyChangeset.set('name', undefined);

    expect(dummyChangeset.change).toEqual(expectedResult);
  });

  it('#change works with arrays', () => {
    const dummyChangeset = Changeset(dummyModel);
    const newArray = [...exampleArray, 'new'];
    const expectedResult = { exampleArray: newArray };
    dummyChangeset.set('exampleArray', newArray);

    expect(dummyChangeset.change).toEqual(expectedResult);
  });

  /**
   * #errors
   */
  it('#errors returns the error object and keeps changes', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedResult = [{ key: 'name', validation: 'too short', value: 'a' }];
    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.errors).toEqual(expectedResult);
    expect(dummyChangeset.get('errors')).toEqual(expectedResult);
  });

  it('can get nested values in the errors object', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('unknown', 'wat');
    dummyChangeset.set('org.usa.ny', '');
    dummyChangeset.set('name', '');

    let expectedErrors = [
      { key: 'org.usa.ny', validation: ['must be present', 'only letters work'], value: '' },
      { key: 'name', validation: 'too short', value: '' }
    ];
    expect(dummyChangeset.get('errors')).toEqual(expectedErrors);

    dummyChangeset.set('org.usa.ny', '1');
    expectedErrors = [
      { key: 'org.usa.ny', validation: ['only letters work'], value: '1' },
      { key: 'name', validation: 'too short', value: '' }
    ];
    expect(dummyChangeset.get('errors')).toEqual(expectedErrors);
  });

  /**
   * #changes
   */

  /**
   * #data
   */

  it('data reads the changeset CONTENT', () => {
    const dummyChangeset = Changeset(dummyModel);

    expect(dummyChangeset.data).toEqual(dummyModel);
  });

  /**
   * #isValid
   */

  /**
   * #isInvalid
   */

  /**
   * #isPristine
   */

  it("isPristine returns true if changes are equal to content's values", () => {
    dummyModel.name = 'Bobby';
    dummyModel.thing = 123;
    dummyModel.nothing = null;
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'Bobby');
    dummyChangeset.set('nothing', null);

    expect(dummyChangeset.get('isPristine')).toBeTruthy();
  });

  it("isPristine returns false if changes are not equal to content's values", () => {
    dummyModel.name = 'Bobby';
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'Bobby');
    dummyChangeset.set('thing', 123);

    expect(dummyChangeset.get('isPristine')).toBeFalsy();
  });

  it('isPristine works with `null` values', () => {
    dummyModel.name = null;
    dummyModel.age = 15;
    const dummyChangeset = Changeset(dummyModel);

    expect(dummyChangeset.get('isPristine')).toBeTruthy();

    dummyChangeset.set('name', 'Kenny');
    expect(dummyChangeset.get('isPristine')).toBeFalsy();

    dummyChangeset.set('name', null);
    expect(dummyChangeset.get('isPristine')).toBeTruthy();
  });

  /**
   * #isDirty
   */

  /**
   * #get
   */

  it('#get proxies to content', () => {
    dummyModel.name = 'Jim Bob';
    const dummyChangeset = Changeset(dummyModel);
    const result = dummyChangeset.name;

    expect(result).toBe('Jim Bob');
  });

  it('#get returns the content when the proxied content is a class', () => {
    class Moment {
      date: unknown;
      constructor(date: Date) {
        this.date = date;
      }
    }

    const d = new Date('2015');
    const momentInstance = new Moment(d);
    const c = Changeset({
      startDate: momentInstance
    });

    const newValue = c.get('startDate');
    expect(newValue).toEqual(momentInstance);
    expect(newValue instanceof Moment).toBeTruthy();
    expect(newValue.date).toBe(d);
  });

  it('#get returns change if present', () => {
    dummyModel.name = 'Jim Bob';
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = 'Milton Waddams';
    const result = dummyChangeset.name;

    expect(result).toBe('Milton Waddams');
  });

  it('#get returns change that is a blank value', () => {
    dummyModel.name = 'Jim Bob';
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = '';
    const result = dummyChangeset.name;

    expect(result).toBe('');
  });

  it('#get returns change that is has undefined as value', () => {
    dummyModel.name = 'Jim Bob';
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = undefined;
    const result = dummyChangeset.name;

    expect(result).toBeUndefined();
  });

  it('nested objects will return correct values', () => {
    dummyModel['org'] = {
      asia: { sg: '_initial' }, // for the sake of disambiguating nulls
      usa: {
        ca: null,
        ny: null,
        ma: { name: null }
      }
    };

    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    expect(dummyChangeset.get('org.asia.sg')).toBe('_initial');
    dummyChangeset.set('org.asia.sg', 'sg');
    expect(dummyChangeset.get('org.asia.sg')).toBe('sg');
  });

  it('nested objects can contain arrays', () => {
    expect.assertions(7);
    dummyModel.name = 'Bob';
    dummyModel.contact = {
      emails: ['bob@email.com', 'the_bob@email.com']
    };

    expect(get(dummyModel, 'contact.emails')).toEqual(['bob@email.com', 'the_bob@email.com']);
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    expect(dummyChangeset.get('name')).toBe('Bob');
    expect(dummyChangeset.get('contact.emails')).toEqual(['bob@email.com', 'the_bob@email.com']);

    dummyChangeset.set('contact.emails', ['fred@email.com', 'the_fred@email.com']);

    expect(dummyChangeset.get('contact.emails')).toEqual(['fred@email.com', 'the_fred@email.com']);

    dummyChangeset.rollback();
    expect(dummyChangeset.get('contact.emails')).toEqual(['bob@email.com', 'the_bob@email.com']);
    dummyChangeset.set('contact.emails', ['fred@email.com', 'the_fred@email.com']);
    expect(dummyChangeset.get('contact.emails')).toEqual(['fred@email.com', 'the_fred@email.com']);

    dummyChangeset.execute();
    expect(dummyModel.contact.emails).toEqual(['fred@email.com', 'the_fred@email.com']);
  });

  it('#getted Object proxies to underlying method', () => {
    class Dog {
      breed: string;
      constructor(b: string) {
        this.breed = b;
      }

      bark() {
        return `woof i'm a ${this.breed}`;
      }
    }

    const model: Record<string, any> = {
      foo: {
        bar: {
          dog: new Dog('shiba inu, wow')
        }
      }
    };

    {
      const c = Changeset(model);
      const actual = c.get('foo.bar.dog').bark();
      const expectedResult = "woof i'm a shiba inu, wow";
      expect(actual).toEqual(expectedResult);
    }

    {
      const c = Changeset(model);
      const actual = get(c, 'foo.bar.dog');
      const expectedResult = get(model, 'foo.bar.dog');
      expect(actual).toEqual(expectedResult);
    }

    {
      const c = Changeset(model);
      const actual = get(c, 'foo.bar.dog');
      const expectedResult = get(model, 'foo.bar.dog');
      expect(actual).toEqual(expectedResult);
    }
  });

  /**
   * #set
   */

  it('#set adds a change if valid', () => {
    const expectedChanges = [{ key: 'name', value: 'foo' }];
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('name', 'foo');
    const changes = dummyChangeset.changes;

    expect(dummyModel.name).toBeUndefined();
    expect(dummyChangeset.get('name')).toEqual('foo');

    expect(changes).toEqual(expectedChanges);
  });

  it('#set adds a date', () => {
    const d = new Date();
    const expectedChanges = [{ key: 'dateOfBirth', value: d }];
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('dateOfBirth', d);
    const changes = dummyChangeset.changes;

    expect(dummyModel.dateOfBirth).toBeUndefined();
    expect(dummyChangeset.get('dateOfBirth')).toEqual(d);

    expect(changes).toEqual(expectedChanges);
  });

  it('#set adds a date if already set on model', () => {
    const model = { dateOfBirth: new Date() };
    const dummyChangeset = Changeset(model);
    const d = new Date('March 25, 1990');
    dummyChangeset.set('dateOfBirth', d);
    const changes = dummyChangeset.changes;

    expect(dummyModel.dateOfBirth).toBeUndefined();
    expect(dummyChangeset.get('dateOfBirth')).toEqual(d);
    expect(dummyChangeset.dateOfBirth).toEqual(d);

    const expectedChanges = [{ key: 'dateOfBirth', value: d }];
    expect(changes).toEqual(expectedChanges);
  });

  it('#set Ember.set works', () => {
    const expectedChanges = [{ key: 'name', value: 'foo' }];
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = 'foo';

    expect(dummyModel.name).toBeUndefined();
    expect(dummyChangeset.get('name')).toBe('foo');

    const changes = dummyChangeset.changes;
    expect(changes).toEqual(expectedChanges);

    dummyChangeset.execute();

    expect(dummyModel.name).toBe('foo');
    expect(dummyChangeset.get('name')).toBe('foo');
  });

  it('#set works for nested', () => {
    const expectedChanges = [{ key: 'name', value: { short: 'foo' } }];
    dummyModel.name = {};
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = {
      short: 'foo'
    };

    expect(dummyChangeset.get('name.short')).toBe('foo');
    expect(dummyModel.name).toEqual({});

    const changes = dummyChangeset.changes;
    expect(changes).toEqual(expectedChanges);

    dummyChangeset.execute();

    expect(dummyModel.name.short).toBe('foo');
  });

  it('#set adds a change if the key is an object', () => {
    dummyModel['org'] = {
      usa: {
        mn: 'mn',
        ny: 'ny'
      }
    };

    const c = Changeset(dummyModel);
    c.set('org.usa.ny', 'NY');

    expect(dummyModel.org.usa.ny).toBe('ny');
    expect(c.get('org.usa.ny')).toBe('NY');
    expect(c.get('org.usa.mn')).toBe('mn');

    const expectedChanges = [{ key: 'org.usa.ny', value: 'NY' }];
    const changes = c.changes;

    expect(changes).toEqual(expectedChanges);
  });

  it('#set use native setters with nested doesnt work', () => {
    dummyModel['org'] = {
      usa: {
        ny: 'ny'
      }
    };

    const c = Changeset(dummyModel);
    set(c, 'org.usa.ny', 'foo');

    expect(dummyModel.org.usa.ny).toBe('foo');
    expect(c.get('org.usa.ny')).toBe('foo');

    const changes = c.changes;
    expect(changes).toEqual([]);
  });

  it('#set use native setters at single level', () => {
    dummyModel.org = 'ny';

    const c = Changeset(dummyModel);
    c.org = 'foo';

    expect(dummyModel.org).toBe('ny');
    expect(c.org).toBe('foo');

    const changes = c.changes;
    expect(changes).toEqual([{ key: 'org', value: 'foo' }]);
  });

  it('#set adds a change if value is an object', () => {
    class Moment {
      date: unknown;
      constructor(date: Date) {
        this.date = date;
      }
    }
    const c = Changeset(dummyModel);
    const d = new Date();
    const momentInstance = new Moment(d);
    c.set('startDate', momentInstance);

    const expectedChanges = [{ key: 'startDate', value: momentInstance }];
    const changes = c.changes;

    expect(changes).toEqual(expectedChanges);

    let newValue = c.get('startDate');
    expect(newValue).toEqual(momentInstance);
    expect(newValue instanceof Moment).toBeTruthy();
    expect(newValue.date).toEqual(d);

    newValue = c.startDate;
    expect(newValue).toEqual(momentInstance);
    expect(newValue instanceof Moment).toBeTruthy();
    expect(newValue.date).toEqual(d);
  });

  it('#set supports `undefined`', () => {
    const model = { name: 'foo' };
    const dummyChangeset = Changeset(model);

    dummyChangeset.set('name', undefined);
    expect(dummyChangeset.name).toBeUndefined();
    expect(dummyChangeset.changes).toEqual([{ key: 'name', value: undefined }]);
  });

  it('#set does not add a change if new value equals old value', () => {
    const model = { name: 'foo' };
    const dummyChangeset = Changeset(model);

    dummyChangeset.set('name', 'foo');
    expect(dummyChangeset.changes).toEqual([]);
  });

  it('#set does not add a change if new value equals old value and `skipValidate` is true', () => {
    const model = { name: 'foo' };
    const dummyChangeset = Changeset(model, null, null, { skipValidate: true });

    expect(dummyChangeset.isValid).toEqual(true);

    dummyChangeset.set('name', 'foo');

    expect(dummyChangeset.changes).toEqual([]);
    expect(dummyChangeset.isValid).toEqual(true);
  });

  it('#set removes a change if set back to original value', () => {
    const model = { name: 'foo' };
    const dummyChangeset = Changeset(model);

    dummyChangeset.set('name', 'bar');
    expect(dummyChangeset.changes).toEqual([{ key: 'name', value: 'bar' }]);

    dummyChangeset.set('name', 'foo');
    expect(dummyChangeset.changes).toEqual([]);
  });

  it('#set does add a change if invalid', () => {
    const expectedErrors = [
      { key: 'name', validation: 'too short', value: 'a' },
      { key: 'password', validation: ['foo', 'bar'], value: false }
    ];
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'a');
    dummyChangeset.set('password', false);
    const changes = dummyChangeset.changes;
    const errors = dummyChangeset.errors;
    const isValid = dummyChangeset.isValid;
    const isInvalid = dummyChangeset.isInvalid;

    const expectedChanges = [
      { key: 'name', value: 'a' },
      { key: 'password', value: false }
    ];
    expect(changes).toEqual(expectedChanges);
    expect(errors).toEqual(expectedErrors);
    expect(isValid).toEqual(false);
    expect(isInvalid).toBeTruthy();
  });

  it('#set adds the change without validation if `skipValidate` option is set', () => {
    const expectedChanges = [{ key: 'password', value: false }];

    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), null, {
      skipValidate: true
    });

    expect(dummyChangeset.isValid).toEqual(true);

    dummyChangeset.set('password', false);
    const changes = dummyChangeset.changes;

    expect(changes).toEqual(expectedChanges);
    expect(dummyChangeset.isValid).toEqual(true);
  });

  it('#set adds errors if undefined value', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedResult = [{ key: 'name', validation: 'too short', value: undefined }];
    dummyChangeset.set('name', undefined);

    expect(dummyChangeset.errors).toEqual(expectedResult);
    expect(dummyChangeset.get('errors')).toEqual(expectedResult);
  });

  it('#set if trigger null value', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedResult = [{ key: 'name', validation: 'too short', value: null }];
    dummyChangeset.set('name', null);

    expect(dummyChangeset.errors).toEqual(expectedResult);
    expect(dummyChangeset.get('errors')).toEqual(expectedResult);
  });

  it('#set if trigger empty string value', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedResult = [{ key: 'name', validation: 'too short', value: '' }];
    dummyChangeset.set('name', '');

    expect(dummyChangeset.errors).toEqual(expectedResult);
    expect(dummyChangeset.get('errors')).toEqual(expectedResult);
  });

  it('#set should remove nested changes when setting roots', () => {
    dummyModel['org'] = {
      usa: {
        ny: 'ny',
        ca: 'ca'
      }
    };

    const c = Changeset(dummyModel);
    c.set('org.usa.ny', 'foo');
    c.set('org.usa.ca', 'bar');
    c.set('org', 'no usa for you');

    const actual = c.changes;
    const expectedResult = [{ key: 'org', value: 'no usa for you' }];
    expect(actual).toEqual(expectedResult);
  });

  it('#set should handle bulk replace', () => {
    dummyModel['org'] = {
      usa: {
        ny: 'ny',
        ca: 'ca'
      }
    };

    const c = Changeset(dummyModel);
    c.set('org', {
      isCompliant: true,
      usa: {
        ca: 'il',
        ny: 'wi'
      }
    });

    let actual = c.changes;
    let expectedResult = [
      {
        key: 'org',
        value: {
          isCompliant: true,
          usa: {
            ca: 'il',
            ny: 'wi'
          }
        }
      }
    ];

    expect(actual).toEqual(expectedResult);

    c.set('org.isCompliant', false);

    actual = c.changes;
    expectedResult = [
      {
        key: 'org',
        value: {
          isCompliant: false,
          usa: {
            ca: 'il',
            ny: 'wi'
          }
        }
      }
    ];

    expect(actual).toEqual(expectedResult);
  });

  it('#set works after save', () => {
    dummyModel['org'] = {
      usa: {
        mn: 'mn',
        ny: 'ny'
      }
    };

    const c = Changeset(dummyModel);
    c.set('org.usa.ny', 'NY');
    c.set('org.usa.mn', 'MN');

    expect(c.get('org.usa.ny')).toBe('NY');
    expect(c.get('org.usa.mn')).toBe('MN');
    expect(dummyModel.org.usa.ny).toBe('ny');
    expect(dummyModel.org.usa.mn).toBe('mn');

    c.save();

    expect(c.get('org.usa.ny')).toBe('NY');
    expect(c.get('org.usa.mn')).toBe('MN');
    expect(dummyModel.org.usa.ny).toBe('NY');
    expect(dummyModel.org.usa.mn).toBe('MN');

    c.set('org.usa.ny', 'nil');

    expect(c.get('org.usa.ny')).toBe('nil');
    expect(c.get('org.usa.mn')).toBe('MN');
    expect(dummyModel.org.usa.ny).toBe('NY');
    expect(dummyModel.org.usa.mn).toBe('MN');

    c.save();

    expect(c.get('org.usa.ny')).toBe('nil');
    expect(c.get('org.usa.mn')).toBe('MN');
    expect(dummyModel.org.usa.ny).toBe('nil');
    expect(dummyModel.org.usa.mn).toBe('MN');

    c.set('org.usa.ny', 'nil2');
    c.set('org.usa.mn', 'undefined');

    expect(c.get('org.usa.ny')).toBe('nil2');
    expect(c.get('org.usa.mn')).toBe('undefined');
    expect(dummyModel.org.usa.ny).toBe('nil');
    expect(dummyModel.org.usa.mn).toBe('MN');

    c.save();

    expect(c.get('org.usa.ny')).toBe('nil2');
    expect(c.get('org.usa.mn')).toBe('undefined');
    expect(dummyModel.org.usa.ny).toBe('nil2');
    expect(dummyModel.org.usa.mn).toBe('undefined');
  });

  it('it accepts async validations', async () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    /* const dummyChangeset = Changeset(dummyModel, dummyValidator); */
    const expectedChanges = [{ key: 'async', value: true }];
    const expectedError = { async: { validation: 'is invalid', value: 'is invalid' } };

    await dummyChangeset.set('async', true);
    expect(dummyChangeset.changes).toEqual(expectedChanges);

    dummyChangeset.set('async', 'is invalid');
    await dummyChangeset.save();
    expect(dummyChangeset.error).toEqual(expectedError);
  });

  it('it clears errors when setting to original value', () => {
    dummyModel.name = 'Jim Bob';
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', '');

    expect(dummyChangeset.isInvalid).toEqual(true);
    expect(dummyChangeset.isValid).toEqual(false);
    dummyChangeset.set('name', 'Jim Bob');
    expect(dummyChangeset.isValid).toEqual(true);
    expect(dummyChangeset.isInvalid).toEqual(false);
  });

  it('it clears errors when setting to original value when nested', async () => {
    set(dummyModel, 'org', {
      usa: { ny: 'vaca' }
    });
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('org.usa.ny', '');

    expect(dummyChangeset.isInvalid).toEqual(true);
    dummyChangeset.set('org.usa.ny', 'vaca');
    expect(dummyChangeset.isValid).toBeTruthy();
    expect(dummyChangeset.isInvalid).toEqual(false);
  });

  test('it clears errors when setting to original value when nested Booleans', async () => {
    set(dummyModel, 'org', {
      isCompliant: true
    });
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('org.isCompliant', false);

    expect(dummyChangeset.isInvalid).toEqual(true);
    dummyChangeset.set('org.isCompliant', true);
    expect(dummyChangeset.isValid).toEqual(true);
    expect(dummyChangeset.isInvalid).toEqual(false);
  });

  it('#set should delete nested changes when equal', () => {
    dummyModel['org'] = {
      usa: { ny: 'i need a vacation' }
    };

    const c = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);
    c.set('org.usa.br', 'whoop');

    const actual = get(c, 'change.org.usa.ny');
    const expectedResult = undefined;
    expect(actual).toEqual(expectedResult);
  });

  it('#set works when replacing an Object with an primitive', () => {
    const model = { foo: { bar: { baz: 42 } } };

    const c = Changeset(model);
    expect(c.get('foo')).toEqual(model.foo);

    c.set('foo', 'not an object anymore');
    c.execute();
    expect(c.get('foo')).toEqual(model.foo);
  });

  /**
   * #prepare
   */

  it('#prepare provides callback to modify changes', () => {
    const date = new Date();
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('first_name', 'foo');
    dummyChangeset.set('date_of_birth', date);
    dummyChangeset.prepare(changes => {
      const modified: Record<string, any> = {};

      for (let key in changes) {
        modified[(key as string).replace(/_/g, '-')] = changes[key];
      }

      return modified;
    });
    const changeKeys = dummyChangeset.changes.map(change => get(change, 'key'));

    expect(changeKeys).toEqual(['first-name', 'date-of-birth']);
    dummyChangeset.execute();
    expect(dummyModel['first-name']).toEqual('foo');
    expect(dummyModel['date-of-birth']).toEqual(date);
  });

  it('#prepare throws if callback does not return object', () => {
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('first_name', 'foo');

    expect(() => dummyChangeset.prepare(() => null)).toThrow();
  });

  /**
   * #execute
   */

  it('#execute applies changes to content if valid', () => {
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('name', 'foo');

    expect(dummyModel.name).toBeUndefined();
    expect(dummyChangeset.isValid).toBeTruthy();
    dummyChangeset.execute();
    expect(dummyModel.name).toBe('foo');
  });

  it('#execute does not apply changes to content if invalid', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'a');

    expect(dummyModel.name).toBeUndefined();
    expect(dummyChangeset.isInvalid).toBeTruthy();
    dummyChangeset.execute();
    expect(dummyModel.name).toBeUndefined();
  });

  it('#execute keeps prototype of set object', function() {
    class DogTag {}

    const dog = new DogTag();
    const originalProto = Object.getPrototypeOf(dog);

    const c = Changeset({});
    c.set('dog', dog);

    c.execute();

    const condition = c.dog instanceof DogTag;
    expect(condition).toBeTruthy();
    expect(Object.getPrototypeOf(c.dog)).toEqual(originalProto);
  });

  it('#execute does not remove original nested objects', function() {
    class DogTag {}

    const dog: any = {};
    dog.info = new DogTag();
    dog.info.name = 'mishka';
    dog.info.breed = 'husky';

    const c = Changeset(dog);
    c.set('info.name', 'laika');

    c.execute();

    const condition = dog.info instanceof DogTag;
    expect(condition).toBeTruthy();
  });

  [
    {
      model: () => ({ org: { usa: { ny: '', ca: '' } } }),
      setCalls: [
        ['org.usa.ny', 'foo'],
        ['org.usa.ca', 'bar'],
        ['org', 'no usa for you']
      ],
      result: () => ({ org: 'no usa for you' })
    },
    {
      model: () => ({ org: { usa: { ny: '', ca: '' } } }),
      setCalls: [
        ['org.usa.ny', 'foo'],
        ['org', 'no usa for you'],
        ['org.usa.ca', 'bar']
      ],
      result: () => ({ org: { usa: { ca: 'bar', ny: '' } } })
    },
    {
      model: () => ({ org: { usa: { ny: '', ca: '' } } }),
      setCalls: [
        ['org', 'no usa for you'],
        ['org.usa.ny', 'foo'],
        ['org.usa.ca', 'bar']
      ],
      result: () => ({ org: { usa: { ny: 'foo', ca: 'bar' } } })
    }
  ].forEach(({ model, setCalls, result }, i) => {
    it(`#execute - table-driven test ${i + 1}`, () => {
      const m = model();
      const c = Changeset(m);

      setCalls.forEach(([k, v]) => c.set(k, v));
      c.execute();

      const actual = m;
      const expectedResult = result();
      expect(actual).toEqual(expectedResult);
    });
  });

  it('it works with nested keys', () => {
    const expectedResult = {
      org: {
        asia: { sg: 'sg' },
        usa: {
          ca: 'ca',
          ny: 'ny',
          ma: { name: 'Massachusetts' }
        }
      }
    };
    dummyModel['org'] = {
      asia: { sg: null },
      usa: {
        ca: null,
        ny: null,
        ma: { name: null }
      }
    };

    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('org.asia.sg', 'sg');
    dummyChangeset.set('org.usa.ca', 'ca');
    dummyChangeset.set('org.usa.ny', 'ny');
    dummyChangeset.set('org.usa.ma', { name: 'Massachusetts' });
    dummyChangeset.execute();
    expect(dummyChangeset.change).toEqual(expectedResult);
    expect(get(dummyChangeset, '_content.org')).toEqual(expectedResult.org);
    expect(dummyModel.org).toEqual(expectedResult.org);
  });

  it('#execute calls registered callbacked', function() {
    expect.assertions(1);

    const dog: any = {};

    const c = Changeset(dog);
    function callback() {
      expect(true).toBeTruthy();
    }

    c.on('execute', callback);
    c.on('execute-2', callback);

    c.execute();
  });

  /**
   * #save
   */

  it('#save proxies to content', done => {
    let result;
    let options;
    dummyModel['save'] = (dummyOptions: Record<string, any>) => {
      result = 'ok';
      options = dummyOptions;
      return Promise.resolve('saveResult');
    };
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('name', 'foo');

    expect(result).toBeUndefined();
    const promise = dummyChangeset.save({ foo: 'test options' });
    expect(result).toEqual('ok');
    expect(dummyChangeset.change).toEqual({ name: 'foo' });
    expect(options).toEqual({ foo: 'test options' });
    expect(!!promise && typeof promise.then === 'function').toBeTruthy();
    promise
      .then(saveResult => {
        expect(saveResult).toEqual('saveResult');
      })
      .finally(() => done());
  });

  it('#save handles non-promise proxy content', done => {
    let result;
    let options;
    dummyModel.save = (dummyOptions: Record<string, any>) => {
      result = 'ok';
      options = dummyOptions;
      return Promise.resolve('saveResult');
    };
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('name', 'foo');

    expect(result).toBe(undefined);
    const promise = dummyChangeset.save({ foo: 'test options' });
    expect(result).toBe('ok');
    expect(options).toEqual({ foo: 'test options' });
    expect(!!promise && typeof promise.then === 'function').toBeTruthy();
    promise
      .then(saveResult => {
        expect(saveResult).toBe('saveResult');
      })
      .finally(() => done());
  });

  it('#save handles rejected proxy content', done => {
    expect.assertions(1);

    const dummyChangeset = Changeset(dummyModel);

    dummyModel['save'] = () => {
      return Promise.reject(new Error('some ember data error'));
    };

    dummyChangeset
      .save()
      .then(() => {
        expect(false).toBeTruthy();
      })
      .catch(error => {
        expect(error.message).toEqual('some ember data error');
      })
      .finally(() => done());
  });

  it('#save proxies to content even if it does not implement #save', done => {
    const person = { name: 'Jim' };
    const dummyChangeset = Changeset(person);
    dummyChangeset.set('name', 'foo');

    return dummyChangeset.save().then(() => {
      expect(person.name).toBe('foo');
      done();
    });
  });

  /**
   * #merge
   */

  it('#merge merges 2 valid changesets', () => {
    const dummyChangesetA = Changeset(dummyModel);
    const dummyChangesetB = Changeset(dummyModel);
    dummyChangesetA.set('firstName', 'Jim');
    dummyChangesetB.set('lastName', 'Bob');
    const dummyChangesetC = dummyChangesetA.merge(dummyChangesetB);
    const expectedChanges = [
      { key: 'firstName', value: 'Jim' },
      { key: 'lastName', value: 'Bob' }
    ];

    expect(dummyChangesetC.changes).toEqual(expectedChanges);
    expect(dummyChangesetA.changes).toEqual([{ key: 'firstName', value: 'Jim' }]);
    expect(dummyChangesetB.changes).toEqual([{ key: 'lastName', value: 'Bob' }]);
  });

  it('#merge merges invalid changesets', () => {
    const dummyChangesetA = Changeset(dummyModel, lookupValidator(dummyValidations));
    const dummyChangesetB = Changeset(dummyModel, lookupValidator(dummyValidations));
    const dummyChangesetC = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangesetA.set('age', 21);
    dummyChangesetA.set('name', 'a');
    dummyChangesetB.set('name', 'Tony Stark');
    dummyChangesetC.set('name', 'b');

    let dummyChangesetD = dummyChangesetA.merge(dummyChangesetB);
    dummyChangesetD = dummyChangesetD.merge(dummyChangesetC);

    const expectedChanges = [
      { key: 'age', value: 21 },
      { key: 'name', value: 'b' }
    ];
    const expectedErrors = [{ key: 'name', validation: 'too short', value: 'b' }];

    expect(dummyChangesetA.isInvalid).toEqual(true);
    expect(dummyChangesetB.isValid).toEqual(true);
    expect(dummyChangesetC.isInvalid).toEqual(true);
    expect(dummyChangesetD.isInvalid).toEqual(true);
    expect(dummyChangesetD.changes).toEqual(expectedChanges);
    expect(dummyChangesetD.errors).toEqual(expectedErrors);
  });

  it('#merge does not merge a changeset with a non-changeset', () => {
    const dummyChangesetA = Changeset(dummyModel, lookupValidator(dummyValidations));
    const dummyChangesetB = Changeset({ _changes: { name: 'b' } });
    dummyChangesetA.set('name', 'a');

    expect(() => dummyChangesetA.merge(dummyChangesetB)).toThrow();
  });

  it('#merge does not merge a changeset with different content', () => {
    let dummyChangesetA = Changeset(dummyModel, lookupValidator(dummyValidations));
    let dummyChangesetB = Changeset({}, lookupValidator(dummyValidations));

    expect(() => dummyChangesetA.merge(dummyChangesetB)).toThrow();
  });

  it('#merge preserves content and validator of origin changeset', async () => {
    let dummyChangesetA = Changeset(dummyModel, lookupValidator(dummyValidations));
    let dummyChangesetB = Changeset(dummyModel);
    let dummyChangesetC = dummyChangesetA.merge(dummyChangesetB);
    let expectedErrors = [{ key: 'name', validation: 'too short', value: 'a' }];

    dummyChangesetC.set('name', 'a');
    expect(dummyChangesetC.get('errors')).toEqual(expectedErrors);

    dummyChangesetC.set('name', 'Jim Bob');
    await dummyChangesetC.save();

    expect(dummyModel.name).toBe('Jim Bob');
  });

  /**
   * #rollback
   */

  it('#rollback restores old values', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedChanges = [
      { key: 'firstName', value: 'foo' },
      { key: 'lastName', value: 'bar' },
      { key: 'name', value: '' }
    ];
    let expectedErrors = [{ key: 'name', validation: 'too short', value: '' }];
    dummyChangeset.set('firstName', 'foo');
    dummyChangeset.set('lastName', 'bar');
    dummyChangeset.set('name', '');

    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.errors).toEqual(expectedErrors);
    dummyChangeset.rollback();
    expect(dummyChangeset.changes).toEqual([]);
    expect(dummyChangeset.errors).toEqual([]);
  });

  it('#rollback resets valid state', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.isInvalid).toBeTruthy();
    dummyChangeset.rollback();
    expect(dummyChangeset.isValid).toBeTruthy();
  });

  it('#rollback twice works', () => {
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('name', 'abcde');

    let expectedChanges = [{ key: 'name', value: 'abcde' }];
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    dummyChangeset.rollback();
    expect(dummyChangeset.changes).toEqual([]);

    dummyChangeset.set('name', 'mnop');
    expectedChanges = [{ key: 'name', value: 'mnop' }];
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    dummyChangeset.rollback();
    expect(dummyChangeset.changes).toEqual([]);
  });

  it('#rollback twice with nested keys works', () => {
    dummyModel['org'] = {
      asia: { sg: null }
    };
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('org.asia.sg', 'sg');

    let expectedChanges = [{ key: 'org.asia.sg', value: 'sg' }];
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    dummyChangeset.rollback();
    expect(dummyChangeset.changes).toEqual([]);

    dummyChangeset.set('org.asia.sg', 'Singapore');
    expectedChanges = [{ key: 'org.asia.sg', value: 'Singapore' }];
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    dummyChangeset.rollback();
    expect(dummyChangeset.changes).toEqual([]);
  });

  it('#rollbackInvalid clears errors and keeps valid values', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedChanges = [
      { key: 'firstName', value: 'foo' },
      { key: 'lastName', value: 'bar' },
      { key: 'name', value: '' }
    ];
    let expectedErrors = [{ key: 'name', validation: 'too short', value: '' }];
    dummyChangeset.set('firstName', 'foo');
    dummyChangeset.set('lastName', 'bar');
    dummyChangeset.set('name', '');

    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.errors).toEqual(expectedErrors);
    dummyChangeset.rollbackInvalid();
    expectedChanges = [
      { key: 'firstName', value: 'foo' },
      { key: 'lastName', value: 'bar' }
    ];
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.errors).toEqual([]);
  });

  it('#rollbackInvalid a specific key clears key error and keeps valid values', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedChanges = [
      { key: 'firstName', value: 'foo' },
      { key: 'lastName', value: 'bar' },
      { key: 'password', value: false },
      { key: 'name', value: '' }
    ];
    let expectedErrors = [
      { key: 'password', validation: ['foo', 'bar'], value: false },
      { key: 'name', validation: 'too short', value: '' }
    ];
    dummyChangeset.set('firstName', 'foo');
    dummyChangeset.set('lastName', 'bar');
    dummyChangeset.set('password', false);
    dummyChangeset.set('name', '');

    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.errors).toEqual(expectedErrors);
    dummyChangeset.rollbackInvalid('name');
    expectedChanges = [
      { key: 'firstName', value: 'foo' },
      { key: 'lastName', value: 'bar' },
      { key: 'password', value: false }
    ];
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expectedErrors = [{ key: 'password', validation: ['foo', 'bar'], value: false }];
    expect(dummyChangeset.errors).toEqual(expectedErrors);
  });

  it('#rollbackInvalid resets valid state', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.isInvalid).toBeTruthy();
    dummyChangeset.rollbackInvalid();
    expect(dummyChangeset.isValid).toBeTruthy();
  });

  it('#rollbackInvalid will not remove changes that are valid', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'abcd');

    let expectedChanges = [{ key: 'name', value: 'abcd' }];
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.isValid).toBeTruthy();
    dummyChangeset.rollbackInvalid('name');
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.isValid).toBeTruthy();
  });

  it('#rollbackInvalid works for keys not on changeset', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedChanges = [
      { key: 'firstName', value: 'foo' },
      { key: 'lastName', value: 'bar' },
      { key: 'name', value: '' }
    ];
    let expectedErrors = [{ key: 'name', validation: 'too short', value: '' }];
    dummyChangeset.set('firstName', 'foo');
    dummyChangeset.set('lastName', 'bar');
    dummyChangeset.set('name', '');

    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.errors).toEqual(expectedErrors);
    dummyChangeset.rollbackInvalid('dowat?');
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.errors).toEqual(expectedErrors);
  });

  it('#rollbackProperty restores old value for specified property only', () => {
    dummyModel.firstName = 'Jim';
    dummyModel.lastName = 'Bob';
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedChanges = [{ key: 'lastName', value: 'bar' }];
    dummyChangeset.set('firstName', 'foo');
    dummyChangeset.set('lastName', 'bar');

    dummyChangeset.rollbackProperty('firstName');
    expect(dummyChangeset.changes).toEqual(expectedChanges);
  });

  it('#rollbackProperty clears errors for specified property', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    let expectedChanges = [
      { key: 'firstName', value: 'foo' },
      { key: 'lastName', value: 'bar' },
      { key: 'name', value: '' }
    ];
    let expectedErrors = [{ key: 'name', validation: 'too short', value: '' }];
    dummyChangeset.set('firstName', 'foo');
    dummyChangeset.set('lastName', 'bar');
    dummyChangeset.set('name', '');

    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.errors).toEqual(expectedErrors);
    dummyChangeset.rollbackProperty('name');
    expectedChanges = [
      { key: 'firstName', value: 'foo' },
      { key: 'lastName', value: 'bar' }
    ];
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.errors).toEqual([]);
  });

  it('#rollbackProperty resets valid state', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));

    expect(dummyChangeset.isInvalid).toEqual(false);
    expect(dummyChangeset.isValid).toEqual(true);

    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.isInvalid).toEqual(true);

    dummyChangeset.rollbackProperty('name');

    expect(dummyChangeset.isValid).toEqual(true);
  });

  it('can update nested keys after rollback changes.', () => {
    let expectedResult: any = {
      org: {
        asia: { sg: 'sg' },
        usa: {
          ny: 'ny',
          ma: { name: 'Massachusetts' }
        }
      }
    };
    dummyModel['org'] = {
      asia: { sg: null },
      usa: {
        ny: null,
        ma: { name: null }
      }
    };

    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('org.asia.sg', 'sg');
    dummyChangeset.set('org.usa.ny', 'ny');
    dummyChangeset.set('org.usa.ma', { name: 'Massachusetts' });
    dummyChangeset.execute();
    expect(dummyModel.org).toEqual(expectedResult.org);

    expectedResult.org.usa.or = 'or';
    dummyChangeset.rollback();
    dummyChangeset.set('org.usa.or', 'or');
    dummyChangeset.execute();
    expect(dummyModel.org).toEqual(expectedResult.org);
  });

  /**
   * #validate
   */

  it('#validate/0 validates all fields immediately', async () => {
    dummyModel.name = 'J';
    dummyModel.password = false;
    dummyModel.options = null;
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    await dummyChangeset.validate();
    expect(get(dummyChangeset, 'error.password')).toEqual({
      validation: ['foo', 'bar'],
      value: false
    });
    expect(dummyChangeset.changes).toEqual([]);
    expect(get(dummyChangeset, 'errors.length')).toBe(5);
  });

  it('#validate/1 validates a single field immediately', async () => {
    dummyModel.name = 'J';
    dummyModel.password = '123';
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    await dummyChangeset.validate('name');
    expect(get(dummyChangeset, 'error.name')).toEqual({ validation: 'too short', value: 'J' });
    expect(dummyChangeset.changes).toEqual([]);
    expect(get(dummyChangeset, 'errors.length')).toBe(1);
  });

  it('#validate validates a multiple field immediately', async () => {
    dummyModel.name = 'J';
    dummyModel.password = false;
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    await dummyChangeset.validate('name', 'password');
    expect(get(dummyChangeset, 'error.name')).toEqual({ validation: 'too short', value: 'J' });
    expect(get(dummyChangeset, 'error.password')).toEqual({
      validation: ['foo', 'bar'],
      value: false
    });
    expect(dummyChangeset.changes).toEqual([]);
    expect(get(dummyChangeset, 'errors.length')).toBe(2);
  });

  it('#validate works correctly with changeset values', async () => {
    dummyModel = {
      ...dummyModel,
      ...{
        name: undefined,
        email: undefined,
        password: false,
        async: true,
        passwordConfirmation: false,
        options: {}
      }
    };
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    dummyChangeset.set('name', 'Jim Bob');
    await dummyChangeset.validate();
    // expect(get(dummyChangeset, 'errors.length')).toBe(1);
    expect(get(dummyChangeset, 'errors')[0].key).toBe('password');
    expect(dummyChangeset.isInvalid).toEqual(true);

    dummyChangeset.set('passwordConfirmation', true);
    await dummyChangeset.validate();
    expect(get(dummyChangeset, 'errors.length')).toBe(2);
    expect(get(dummyChangeset, 'errors')[0].key).toBe('password');
    expect(get(dummyChangeset, 'errors.1.key')).toBe('passwordConfirmation');
    expect(dummyChangeset.isInvalid).toEqual(true);

    dummyChangeset.set('password', true);
    dummyChangeset.set('passwordConfirmation', true);
    dummyChangeset.set('email', 'scott.mail@gmail.com');

    await dummyChangeset.validate();

    expect(get(dummyChangeset, 'errors.length')).toBe(0);
    expect(dummyChangeset.isValid).toEqual(true);
  });

  it('#validate works correctly with complex values', () => {
    dummyModel = {};
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    dummyChangeset.set('options', { persist: true });
    dummyChangeset.validate();
    expect(dummyChangeset.changes[0]).toEqual({ key: 'options', value: { persist: true } });
  });

  it('#validate marks actual valid changes', async () => {
    dummyModel = {
      ...dummyModel,
      ...{ name: 'Jim Bob', password: true, passwordConfirmation: true, async: true }
    };
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    dummyChangeset.set('name', 'foo bar');
    dummyChangeset.set('password', false);

    await dummyChangeset.validate();
    expect(dummyChangeset.changes).toEqual([
      { key: 'name', value: 'foo bar' },
      { key: 'password', value: false }
    ]);
  });

  it('#validate does not mark changes when nothing has changed', async () => {
    let options = {
      persist: true,
      // test isEqual to ensure we're using Ember.isEqual for comparison
      isEqual(other: Record<string, any>) {
        return this.persist === other.persist;
      }
    };
    dummyModel = {
      ...dummyModel,
      ...{ name: 'Jim Bob', password: true, passwordConfirmation: true, async: true, options }
    };
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    dummyChangeset.set('options', options);

    await dummyChangeset.validate();
    expect(dummyChangeset.error).toEqual({});
    expect(dummyChangeset.changes).toEqual([]);
  });

  it('#validate/nested validates nested fields immediately', async () => {
    dummyModel['org'] = {
      usa: {
        ny: null
      }
    };

    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);
    await dummyChangeset.validate('org.usa.ny');
    expect(get(dummyChangeset, 'error.org.usa.ny')).toEqual({
      validation: ['must be present'],
      value: null
    });
    /* expect(dummyChangeset.changes).toEqual([]); */
    /* expect(dummyChangeset.errors.length).toBe(1); */
  });

  it('#validate marks actual valid changes', async () => {
    dummyModel = {
      ...dummyModel,
      ...{ name: 'Jim Bob', password: true, passwordConfirmation: true }
    };
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    dummyChangeset.set('name', 'foo bar');
    dummyChangeset.set('password', false);
    dummyChangeset.set('async', true);

    await dummyChangeset.validate();
    expect(dummyChangeset.changes).toEqual([
      { key: 'name', value: 'foo bar' },
      { key: 'password', value: false },
      { key: 'async', value: true }
    ]);
  });

  it('#isInvalid does not trigger validations without validate keys', async () => {
    const model = { name: 'o' };
    const dummyChangeset = Changeset(model, lookupValidator(dummyValidations));

    expect(dummyChangeset.isValid).toEqual(true);
    expect(dummyChangeset.isInvalid).toEqual(false);

    await dummyChangeset.validate();

    expect(dummyChangeset.isValid).toEqual(true);
    expect(dummyChangeset.isInvalid).toEqual(false);
  });

  it('#isInvalid does not trigger on init of changeset', async () => {
    const model = { name: 'o' };
    const dummyChangeset = Changeset(model, lookupValidator(dummyValidations));

    expect(dummyChangeset.isValid).toEqual(true);
    expect(dummyChangeset.isInvalid).toEqual(false);

    await dummyChangeset.validate('name');

    expect(dummyChangeset.isValid).toEqual(false);
    expect(dummyChangeset.isInvalid).toEqual(true);
  });

  /**
   * #addError
   */

  it('#addError adds an error to the changeset', () => {
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.addError('email', {
      value: 'jim@bob.com',
      validation: 'Email already taken'
    });

    expect(dummyChangeset.isInvalid).toEqual(true);
    expect(get(dummyChangeset, 'error.email.validation')).toBe('Email already taken');
    dummyChangeset.set('email', 'unique@email.com');
    expect(dummyChangeset.isValid).toEqual(true);
  });

  it('#addError adds an error to the changeset using the shortcut', function() {
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('email', 'jim@bob.com');
    dummyChangeset.addError('email', 'Email already taken');

    expect(dummyChangeset.isInvalid).toEqual(true);
    expect(get(dummyChangeset, 'error.email.validation')).toBe('Email already taken');
    expect(get(dummyChangeset, 'error.email.value')).toBe('jim@bob.com');
    expect(dummyChangeset.changes).toEqual([{ key: 'email', value: 'jim@bob.com' }]);
    dummyChangeset.set('email', 'unique@email.com');
    expect(dummyChangeset.isValid).toEqual(true);
    expect(dummyChangeset.changes[0]).toEqual({ key: 'email', value: 'unique@email.com' });
  });

  it('#addError adds an error to the changeset on a nested property', () => {
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.addError('email.localPart', 'Cannot contain +');

    expect(dummyChangeset.isInvalid).toEqual(true);
    expect(get(dummyChangeset, 'error.email.localPart.validation')).toBe('Cannot contain +');
    dummyChangeset.set('email.localPart', 'ok');
    expect(dummyChangeset.isValid).toEqual(true);
  });

  it('#addError adds an array of errors to the changeset', () => {
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.addError('email', ['jim@bob.com', 'Email already taken']);

    expect(dummyChangeset.isInvalid).toEqual(true);
    expect(get(dummyChangeset, 'error.email.validation')).toEqual([
      'jim@bob.com',
      'Email already taken'
    ]);
    dummyChangeset.set('email', 'unique@email.com');
    expect(dummyChangeset.isValid).toEqual(true);
  });

  /**
   * #pushErrors
   */

  it('#pushErrors pushes an error into an array of existing validations', function() {
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('email', 'jim@bob.com');
    dummyChangeset.addError('email', 'Email already taken');
    dummyChangeset.pushErrors('email', 'Invalid email format');

    expect(dummyChangeset.isInvalid).toEqual(true);
    expect(get(dummyChangeset, 'error.email.validation')).toEqual([
      'Email already taken',
      'Invalid email format'
    ]);
    expect(get(dummyChangeset, 'error.email.value')).toBe('jim@bob.com');
    expect(dummyChangeset.changes).toEqual([{ key: 'email', value: 'jim@bob.com' }]);
    dummyChangeset.set('email', 'unique@email.com');
    expect(dummyChangeset.isValid).toEqual(true);
    expect(dummyChangeset.changes[0]).toEqual({ key: 'email', value: 'unique@email.com' });
  });

  it('#pushErrors pushes an error if no existing validations are present', function() {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'J');
    dummyChangeset.pushErrors('name', 'cannot be J');

    expect(dummyChangeset.isInvalid).toEqual(true);
    expect(dummyChangeset.isValid).toEqual(false);
    expect(get(dummyChangeset, 'error.name.validation')).toEqual(['too short', 'cannot be J']);
    expect(get(dummyChangeset, 'error.name.value')).toBe('J');
    dummyChangeset.set('name', 'Good name');
    expect(dummyChangeset.isValid).toEqual(true);
    expect(dummyChangeset.isInvalid).toEqual(false);
  });

  it('#pushErrors adds an error to the changeset on a nested property', () => {
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.pushErrors('email.localPart', 'Cannot contain +');
    dummyChangeset.pushErrors('email.localPart', 'is too short');

    expect(dummyChangeset.isInvalid).toEqual(true);
    expect(get(dummyChangeset, 'error.email.localPart.validation')).toEqual([
      'Cannot contain +',
      'is too short'
    ]);
    dummyChangeset.set('email.localPart', 'ok');
    expect(dummyChangeset.isValid).toEqual(true);
  });

  /**
   * #snapshot
   */

  it('#snapshot creates a snapshot of the changeset', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'Pokemon Go');
    dummyChangeset.set('password', false);
    let snapshot = dummyChangeset.snapshot();
    let expectedResult = {
      changes: { name: 'Pokemon Go', password: false },
      errors: { password: { validation: ['foo', 'bar'], value: false } }
    };

    expect(snapshot).toEqual(expectedResult);
    dummyChangeset.set('name', "Gotta catch'em all");
    expect(snapshot).toEqual(expectedResult);
  });

  /**
   * #restore
   */

  it('#restore restores a snapshot of the changeset', () => {
    let dummyChangesetA = Changeset(dummyModel, lookupValidator(dummyValidations));
    let dummyChangesetB = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangesetA.set('name', 'Pokemon Go');
    dummyChangesetA.set('password', false);
    let snapshot = dummyChangesetA.snapshot();

    expect(dummyChangesetB.isValid).toEqual(true);
    dummyChangesetB.restore(snapshot);
    expect(dummyChangesetB.isInvalid).toEqual(true);
    expect(get(dummyChangesetB, 'change.name')).toBe('Pokemon Go');
    expect(get(dummyChangesetB, 'error.password')).toEqual({
      validation: ['foo', 'bar'],
      value: false
    });
  });

  /**
   * #cast
   */

  it('#cast allows only specified keys to exist on the changeset', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    const expectedResult = [
      { key: 'name', value: 'Pokemon Go' },
      { key: 'password', value: true }
    ];
    const allowed = ['name', 'password'];
    dummyChangeset.set('name', 'Pokemon Go');
    dummyChangeset.set('password', true);
    dummyChangeset.set('unwantedProp', 123);
    dummyChangeset.cast(allowed);

    expect(dummyChangeset.get('changes')).toEqual(expectedResult);
    expect(dummyChangeset.get('unwantedProp')).toBe(undefined);
  });

  it('#cast noops if no keys are passed', () => {
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    const expectedResult = [
      { key: 'name', value: 'Pokemon Go' },
      { key: 'password', value: true },
      { key: 'unwantedProp', value: 123 }
    ];
    dummyChangeset.set('name', 'Pokemon Go');
    dummyChangeset.set('password', true);
    dummyChangeset.set('unwantedProp', 123);
    dummyChangeset.cast();

    expect(dummyChangeset.get('changes')).toEqual(expectedResult);
  });

  /**
   * #isValidating
   */

  it('isValidating returns true when validations have not resolved', () => {
    let dummyChangeset;
    const _validator = () => Promise.resolve([]);
    const _validations = {
      reservations() {
        return _validator();
      }
    };

    dummyModel['reservations'] = 'ABC12345';
    dummyChangeset = Changeset(dummyModel, _validator, _validations);
    dummyChangeset['reservations'] = 'DCE12345';

    dummyChangeset.validate();
    // expect(dummyChangeset.change, { reservations: 'DCE12345' });

    expect(dummyChangeset.isValidating()).toBeTruthy();
    expect(dummyChangeset.isValidating('reservations')).toBeTruthy();
  });

  it('isValidating returns false when validations have resolved', () => {
    let dummyChangeset;
    const _validator = () => Promise.resolve(true);
    const _validations = {
      reservations() {
        return _validator();
      }
    };

    dummyModel['reservations'] = 'ABC12345';
    dummyChangeset = Changeset(dummyModel, _validator, _validations);

    dummyChangeset.validate();
    expect(dummyChangeset.isValidating()).toBeTruthy();
    expect(dummyChangeset.isValidating('reservations')).toBeTruthy();
  });

  /**
   * beforeValidation
   */

  it('beforeValidation event is fired before validation', () => {
    let dummyChangeset;
    const _validator = () => Promise.resolve([]);
    const _validations = {
      reservations() {
        return _validator();
      }
    };
    let hasFired = false;

    dummyModel['reservations'] = 'ABC12345';
    dummyChangeset = Changeset(dummyModel, _validator, _validations);
    dummyChangeset.on('beforeValidation', () => {
      hasFired = true;
    });

    dummyChangeset.validate();
    expect(hasFired).toBeTruthy();
  });

  it('beforeValidation event is triggered with the key', () => {
    let dummyChangeset;
    const _validator = () => Promise.resolve('');
    const _validations = {
      reservations() {
        return _validator();
      }
    };
    let hasFired = false;

    dummyModel['reservations'] = 'ABC12345';
    dummyChangeset = Changeset(dummyModel, _validator, _validations);
    dummyChangeset.on('beforeValidation', (key: string) => {
      if (key === 'reservations') {
        hasFired = true;
      }
    });

    dummyChangeset.validate();
    expect(hasFired).toBeTruthy();
  });

  /**
   * afterValidation
   */

  it('afterValidation event is fired after validation', async () => {
    let dummyChangeset;
    const _validator = () => Promise.resolve(true);
    const _validations = {
      reservations() {
        return _validator();
      }
    };
    let hasFired = false;

    dummyModel['reservations'] = 'ABC12345';
    dummyChangeset = Changeset(dummyModel, _validator, _validations);
    dummyChangeset.on('afterValidation', () => {
      hasFired = true;
    });

    await dummyChangeset.validate();
    expect(hasFired).toBeTruthy();
  });

  it('afterValidation event is triggered with the key', async () => {
    let dummyChangeset;
    const _validator = () => Promise.resolve(true);
    const _validations = {
      reservations() {
        return _validator();
      }
    };
    let hasFired = false;

    dummyModel['reservations'] = 'ABC12345';
    dummyChangeset = Changeset(dummyModel, _validator, _validations);
    dummyChangeset.on('afterValidation', (key: string) => {
      if (key === 'reservations') {
        hasFired = true;
      }
    });

    await dummyChangeset.validate();
    expect(hasFired).toBeTruthy();
  });

  /**
   * afterRollback
   */

  it('afterRollback event is fired after rollback', async () => {
    let dummyChangeset;
    const _validator = () => Promise.resolve(true);
    const _validations = {
      reservations() {
        return _validator();
      }
    };
    let hasFired = false;

    dummyModel['reservations'] = 'ABC12345';
    dummyChangeset = Changeset(dummyModel, _validator, _validations);
    dummyChangeset.on('afterRollback', () => {
      hasFired = true;
    });

    await dummyChangeset.rollback();
    expect(hasFired).toBeTruthy();
  });

  /**
   * Behavior.
   */

  it('can set nested keys after validate', async function(done) {
    expect.assertions(0);

    dummyModel.org = {
      usa: { ny: null }
    };

    const c = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);
    c.validate('org.usa.ny')
      .then(() => c.set('org.usa.ny', 'should not fail'))
      .finally(done());
  });
});
