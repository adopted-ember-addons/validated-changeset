import { Changeset } from '../src';
import get from '../src/utils/get-deep';
import set from '../src/utils/set-deep';
import lookupValidator from '../src/utils/validator-lookup';

let dummyModel: any;
const exampleArray: Array<any> = [];

const dummyValidations: Record<string, any> = {
  age(_k: string, value: any) {
    return !!value ? value < 120 || '' : true;
  },
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
      return true;
    }
    return errors.length > 1 ? errors : errors[0];
  },
  password(_k: string, value: unknown) {
    return !!value || ['foo', 'bar'];
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
    return Promise.resolve(value || '');
  },
  options(_k: string, value: unknown) {
    return !!value;
  },
  org: {
    isCompliant(_k: string, value: unknown) {
      return !!value || 'not provided';
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
  },
  size: {
    value(_k: string, value: unknown) {
      return typeof value === 'number' || 'not a valid size.value';
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

  it('isPristine returns true if changes not in user provided changesetKeys', () => {
    dummyModel.name = 'Bobby';
    dummyModel.thing = 123;
    dummyModel.nothing = null;
    const changesetKeys = ['name'];
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), null, {
      changesetKeys
    });
    dummyChangeset.set('nothing', 'something');

    expect(dummyChangeset.get('isPristine')).toBe(true);
    expect(dummyChangeset.get('isDirty')).toBe(false);
  });

  it('isPristine returns true if nested changes not in user provided changesetKeys', () => {
    dummyModel.obj = { name: 'Bobby' };
    const changesetKeys = ['name'];
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), null, {
      changesetKeys
    });
    dummyChangeset.set('obj.name', 'something');

    expect(dummyChangeset.get('isPristine')).toBe(true);
    expect(dummyChangeset.get('isDirty')).toBe(false);
  });

  it('isPristine returns false if set a key in changesetKeys', () => {
    dummyModel.name = 'Bobby';
    dummyModel.thing = 123;
    dummyModel.nothing = null;
    const changesetKeys = ['razataz'];
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), null, {
      changesetKeys
    });
    dummyChangeset.set('razataz', 'boom');

    expect(dummyChangeset.get('isPristine')).toBe(false);
    expect(dummyChangeset.get('isDirty')).toBe(true);
  });

  it('isPristine returns false if nested changes in user provided changesetKeys', () => {
    const changesetKeys = ['org'];
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), null, {
      changesetKeys
    });
    dummyChangeset.set('org.usa.ny', 'NYE');

    expect(dummyChangeset.get('isPristine')).toBe(false);
    expect(dummyChangeset.get('isDirty')).toBe(true);
  });

  it('isPristine returns true if nested path does not match at the deepest level', () => {
    const changesetKeys = ['org.usa.ny'];
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), null, {
      changesetKeys
    });
    dummyChangeset.set('org.usa', 'USA');

    expect(dummyChangeset.get('isPristine')).toBe(true);
    expect(dummyChangeset.get('isDirty')).toBe(false);
  });

  /**
   * #isDirty
   */

  it('#set dirties changeset', () => {
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('name', 'foo');

    expect(dummyChangeset.isDirty).toBe(true);
  });

  it('#isDirty after set', () => {
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('name', 'foo');

    expect(dummyChangeset.isDirty).toBe(true);
  });

  it('#isDirty reset after execute', () => {
    dummyModel.name = {};
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = {
      short: 'foo'
    };

    expect(dummyChangeset.get('isDirty')).toBe(true);

    dummyChangeset.execute();

    expect(dummyChangeset.get('isDirty')).toBe(false);
  });

  it('#isDirty reset after rollback', () => {
    dummyModel.name = {};
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = {
      short: 'foo'
    };

    expect(dummyChangeset.get('isDirty')).toBe(true);

    dummyChangeset.rollback();

    expect(dummyChangeset.get('isDirty')).toBe(false);
  });

  it('#isDirty is false when no set', () => {
    dummyModel['name'] = { nick: 'bar' };
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.name;

    expect(dummyChangeset.isDirty).toBe(false);
  });

  it('#isDirty is false when no set with deep values', () => {
    dummyModel['details'] = { name: { nick: 'bar' } };
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.get('details.name');

    expect(dummyChangeset.isDirty).toBe(false);
    expect(dummyChangeset.change).toEqual({});
  });

  it('#isDirty is true when set with deep values', () => {
    class Dog {
      value: any;
      constructor(value: any) {
        this.value = value;
      }
    }
    dummyModel['details'] = { name: {} };
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.get('details.name');
    const dogKlass = new Dog({ nickname: 'bar' });
    dummyChangeset['details'] = { name: dogKlass };

    expect(dummyChangeset.isDirty).toBe(true);
    expect(dummyChangeset.change).toEqual({ details: { name: dogKlass } });
  });

  it('#set does not dirty changeset with same date', () => {
    dummyModel.createTime = new Date('2013-05-01');
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('createTime', new Date('2013-05-01'));

    expect(dummyChangeset.isDirty).toBe(false);
  });

  /**
   * #get
   */

  it('#get proxies to content', () => {
    dummyModel.name = 'Jim Bob';
    const dummyChangeset = Changeset(dummyModel);
    const result = dummyChangeset.name;

    expect(result).toBe('Jim Bob');
  });

  it('#get proxies to content prototype', () => {
    class Dog {
      name?: string;
    }
    Dog.prototype.name = 'Jim Bob';
    const dummyChangeset = Changeset(new Dog());
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
    expect(newValue.date).toEqual(momentInstance.date);
    expect(newValue.content instanceof Moment).toBeTruthy();
    expect(newValue.date).toBe(d);
  });

  it('#get handles changes that are non primitives', () => {
    class Moment {
      _isUTC: any;
      date: unknown;
      constructor(date: Date) {
        this.date = date;
        this._isUTC = false;
      }
    }

    const d = new Date('2015');
    const momentInstance = new Moment(d);
    momentInstance._isUTC = true;
    const c = Changeset({
      startDate: momentInstance
    });

    let newValue = c.get('startDate');
    expect(newValue.date).toEqual(momentInstance.date);
    expect(newValue.content instanceof Moment).toBeTruthy();
    expect(newValue.date).toBe(d);
    expect(newValue._isUTC).toEqual(true);

    const newD = new Date('2020');
    const newMomentInstance = new Moment(newD);
    c.set('startDate', newMomentInstance);

    newValue = c.get('startDate');
    newMomentInstance._isUTC = undefined;
    expect(newValue).toEqual(newMomentInstance);
    expect(newValue instanceof Moment).toBeTruthy();
    expect(newValue.date).toBe(newD);
    expect(newValue._isUTC).toBeUndefined();
  });

  it('#get merges sibling keys from CONTENT with CHANGES', () => {
    class Moment {
      _isUTC: boolean;
      date: unknown;
      constructor(date: Date) {
        this.date = date;
        this._isUTC = false;
      }
    }

    const d = new Date('2015');
    const momentInstance = new Moment(d);
    momentInstance._isUTC = true;
    const c = Changeset({
      startDate: momentInstance
    });

    let newValue = c.get('startDate');
    expect(newValue.date).toEqual(momentInstance.date);
    expect(newValue.content instanceof Moment).toBeTruthy();
    expect(newValue.date).toBe(d);
    expect(newValue._isUTC).toEqual(true);

    const newD = new Date('2020');
    c.set('startDate.date', newD);

    newValue = c.get('startDate');
    expect(newValue.date).toEqual(newD);
    expect(newValue.content instanceof Moment).toBeTruthy();
    expect(newValue.date).toBe(newD);
    expect(newValue._isUTC).toBe(true);
  });

  it('#get returns change if present', () => {
    dummyModel.name = 'Jim Bob';
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = 'Milton Waddams';
    const result = dummyChangeset.name;

    expect(result).toBe('Milton Waddams');
  });

  it('#get handles change without Change value', () => {
    const shallowValidations = { ...dummyValidations };
    shallowValidations.profile = (_k: string, newValue: any) => {
      return typeof newValue === 'undefined' ? 'Cannot be blank' : true;
    };
    dummyModel.profile = {};
    const c = Changeset(dummyModel, lookupValidator(shallowValidations));

    c.profile;
    c.validate('profile');

    let result: any = c.error.profile;
    expect(result).toBe(undefined);

    c.set('profile', undefined);

    c.validate('profile');

    result = c.error.profile.validation;
    expect(result).toBe('Cannot be blank');
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

  it('#get nested objects can contain arrays', () => {
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
      const actual = c.get('foo.bar.dog');
      const expectedResult = "woof i'm a shiba inu, wow";
      expect(actual.bark()).toEqual(expectedResult);
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

  it('#get proxies to underlying array properties', () => {
    dummyModel.users = ['user1', 'user2'];
    const dummyChangeset = Changeset(dummyModel);

    expect((dummyChangeset.users as Array<string>).length).toBe(2);
  });

  it('#get works if content is undefined for nested key', () => {
    const model: Record<string, any> = {};

    const c = Changeset(model);
    c.set('foo.bar.cat', {
      color: 'red'
    });
    const cat = c.get('foo.bar.cat');
    expect(cat.color).toEqual('red');
  });

  it('#get works with toString override', () => {
    dummyModel.toString = function() {
      return 'mine';
    };
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = undefined;
    const result = dummyChangeset.toString();

    expect(result).toEqual('changeset:mine');
  });

  it('#get prioritizes own methods/getters', () => {
    dummyModel.trigger = function(arg: any) {
      expect(arg).toEqual('mine');
    };
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = undefined;
    dummyChangeset.trigger('mine');
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
    expect(dummyChangeset.isDirty).toBe(true);
    expect(dummyChangeset.change).toEqual({ name: 'foo' });
  });

  it('#set adds a change with plain assignment without existing values', () => {
    dummyModel['name'] = { nick: 'bar' };
    const dummyChangeset = Changeset(dummyModel);
    const proxy: any = dummyChangeset.name;
    proxy['nick'] = 'foo';
    expect(dummyChangeset.get('name.nick')).toEqual('foo');

    const expectedChanges = [{ key: 'name.nick', value: 'foo' }];
    const changes = dummyChangeset.changes;
    expect(changes).toEqual(expectedChanges);
  });

  it('#set adds a change with plain assignment', () => {
    dummyModel['name'] = 'bar';
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = 'foo';
    const changes = dummyChangeset.changes;

    expect(dummyModel.name).toBe('bar');
    expect(dummyChangeset.name).toEqual('foo');

    const expectedChanges = [{ key: 'name', value: 'foo' }];
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
    dummyModel.org = {};
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset['name'] = {
      short: 'foo'
    };

    expect(dummyChangeset.get('name.short')).toBe('foo');
    expect(dummyModel.name).toEqual({});

    const changes = dummyChangeset.changes;
    expect(changes).toEqual(expectedChanges);
    expect(dummyChangeset.name).toEqual({ short: 'foo' });
    expect(dummyChangeset.org).toEqual({});

    dummyChangeset.execute();

    expect(dummyModel.name.short).toBe('foo');
  });

  it('#set overrides', () => {
    const expectedChanges = [{ key: 'age', value: '90' }];
    let dummyChangeset = Changeset({ age: '10' });
    dummyChangeset.set('age', '80');
    dummyChangeset.set('age', '10');
    dummyChangeset.set('age', '90');

    const changes = dummyChangeset.changes;

    expect(dummyModel.age).toBeUndefined();
    expect(dummyChangeset.get('age')).toEqual('90');

    expect(changes).toEqual(expectedChanges);
    expect(dummyChangeset.isDirty).toBe(true);
    expect(dummyChangeset.change).toEqual({ age: '90' });
  });

  test('#set Ember.set with Object actually does work TWICE for nested', () => {
    set(dummyModel, 'name', {});
    let title1 = { id: 'Mr', description: 'Mister' };
    let title2 = { id: 'Mrs', description: 'Missus' };
    let dummyChangeset: any = Changeset(dummyModel);
    set(dummyChangeset, 'name.title', title1);

    expect(get(dummyModel, 'name.title.id')).toBeUndefined();
    expect(dummyChangeset.name.title.id).toEqual('Mr');
    expect(dummyChangeset.get('name.title.id')).toEqual('Mr');

    let changes = get(dummyChangeset, 'changes');
    expect(changes).toEqual([{ key: 'name.title', value: title1 }]);

    set(dummyChangeset, 'name.title', title2);

    expect(get(dummyModel, 'name.title.id')).toBeUndefined();
    expect(dummyChangeset.name.title.id).toEqual('Mrs');
    expect(dummyChangeset.get('name.title.id')).toEqual('Mrs');

    changes = get(dummyChangeset, 'changes');
    expect(changes).toEqual([{ key: 'name.title', value: title2 }]);

    dummyChangeset.execute();

    expect(dummyModel.name.title.id).toEqual('Mrs');
  });

  test('#set with Object should work TWICE for nested', () => {
    set(dummyModel, 'name', {});
    let title1 = { id: 'Mr', description: 'Mister' };
    let title2 = { id: 'Mrs', description: 'Missus' };
    let dummyChangeset: any = Changeset(dummyModel);
    dummyChangeset.set('name.title', title1);

    expect(get(dummyModel, 'name.title.id')).toBeUndefined();
    expect(dummyChangeset.name.title.id).toEqual('Mr');
    expect(dummyChangeset.get('name.title.id')).toEqual('Mr');

    let changes = dummyChangeset.changes;
    expect(changes).toEqual([{ key: 'name.title', value: title1 }]);

    dummyChangeset.set('name.title', title2);

    expect(get(dummyModel, 'name.title.id')).toBeUndefined();
    expect(dummyChangeset.name.title.id).toEqual('Mrs');
    expect(dummyChangeset.get('name.title.id')).toEqual('Mrs');

    changes = dummyChangeset.changes;
    expect(changes).toEqual([{ key: 'name.title', value: title2 }]);

    dummyChangeset.execute();

    expect(dummyModel.name.title.id).toEqual('Mrs');
  });

  describe('arrays within nested objects', () => {
    describe('#set', () => {
      let initialData: { contact: { emails?: string[] } } = { contact: { emails: [] } };

      beforeEach(() => {
        initialData = { contact: { emails: ['bob@email.com'] } };
      });

      it('works with boolean values', () => {
        let initialData = { contact: { emails: [{}, {}] } };

        const changeset = Changeset(initialData);

        changeset.set('contact.emails.2', { nested: false });
        expect(changeset.get('contact.emails.2')).toEqual({ nested: false });

        changeset.set('contact.emails.2.nested', true);
        expect(changeset.get('contact.emails.2')).toEqual({ nested: true });

        changeset.set('contact.emails.2.nested', false);
        expect(changeset.get('contact.emails.2')).toEqual({ nested: false });
      });

      it('nested objects cannot create arrays when we have no hints', () => {
        initialData.contact = {};

        const changeset = Changeset(initialData);
        expect(changeset.get('contact.emails')).toEqual(undefined);

        changeset.set('contact.emails.0', 'fred@email.com');
        expect(changeset.get('contact.emails.0')).toEqual('fred@email.com');
        expect(changeset.get('contact.emails')).toEqual({ '0': 'fred@email.com' });
      });

      it('works with validations', () => {
        const changeset = Changeset(
          initialData,
          lookupValidator({
            contact: {
              emails: [
                (_k: string, value: any) => {
                  if (value.includes('fred')) {
                    return 'Fred is banned';
                  }
                }
              ]
            }
          })
        );

        expect(changeset.isValid).toEqual(true);

        changeset.set('contact.emails.0', 'fred@email.com');

        expect(changeset.isValid).toEqual(false);
        expect(changeset.isDirty).toEqual(true);
        expect(changeset.errors).toEqual([
          { key: 'contact.emails.0', validation: 'Fred is banned', value: 'fred@email.com' }
        ]);
      });

      it('can be rolled back', () => {
        const changeset = Changeset(initialData);

        changeset.set('contact.emails.0', 'fred@email.com');

        expect(changeset.get('contact.emails.0')).toEqual('fred@email.com');
        expect(changeset.changes).toEqual([{ key: 'contact.emails.0', value: 'fred@email.com' }]);
        expect(changeset.get('contact.emails').unwrap()).toEqual(['fred@email.com']);

        changeset.rollback();

        expect(changeset.get('contact.emails.0')).toEqual('bob@email.com');
        expect(changeset.changes).toEqual([]);
        expect(changeset.get('contact.emails')).toEqual(['bob@email.com']);
      });

      it('can be saved', () => {
        const changeset = Changeset(initialData);

        changeset.set('contact.emails.0', 'fred@email.com');

        expect(changeset.get('contact.emails.0')).toEqual('fred@email.com');
        expect(changeset.changes).toEqual([{ key: 'contact.emails.0', value: 'fred@email.com' }]);

        changeset.save();

        expect(changeset.get('contact.emails.0')).toEqual('fred@email.com');
        expect(changeset.changes).toEqual([]);
      });

      it('can add items to the array', () => {
        const changeset = Changeset(initialData);

        changeset.set('contact.emails.1', 'fred@email.com');

        expect(changeset.get('contact.emails.1')).toEqual('fred@email.com');
        expect(changeset.get('contact.emails').unwrap()).toEqual([
          'bob@email.com',
          'fred@email.com'
        ]);
        expect(changeset.changes).toEqual([{ key: 'contact.emails.1', value: 'fred@email.com' }]);

        changeset.set('contact.emails.3', 'greg@email.com');

        expect(changeset.get('contact.emails.3')).toEqual('greg@email.com');
        expect(changeset.get('contact.emails').unwrap()).toEqual([
          'bob@email.com',
          'fred@email.com',
          undefined,
          'greg@email.com'
        ]);
        expect(changeset.changes).toEqual([
          { key: 'contact.emails.1', value: 'fred@email.com' },
          { key: 'contact.emails.3', value: 'greg@email.com' }
        ]);

        expect(changeset.change).toEqual({
          contact: { emails: { 1: 'fred@email.com', 3: 'greg@email.com' } }
        });
      });

      it('can remove items from the array', () => {
        const changeset = Changeset(initialData);

        changeset.set('contact.emails.1', 'fred@email.com');

        expect(changeset.get('contact.emails.1')).toEqual('fred@email.com');
        expect(changeset.get('contact.emails').unwrap()).toEqual([
          'bob@email.com',
          'fred@email.com'
        ]);
        expect(changeset.changes).toEqual([{ key: 'contact.emails.1', value: 'fred@email.com' }]);

        changeset.set('contact.emails.0', null);

        expect(changeset.get('contact.emails.0')).toEqual(null);
        expect(changeset.get('contact.emails').unwrap()).toEqual([null, 'fred@email.com']);
        expect(changeset.changes).toEqual([
          { key: 'contact.emails.0', value: null },
          { key: 'contact.emails.1', value: 'fred@email.com' }
        ]);

        changeset.set('contact.emails.1', null);

        expect(changeset.get('contact.emails').unwrap()).toEqual([null, null]);
        expect(changeset.changes).toEqual([
          { key: 'contact.emails.0', value: null },
          { key: 'contact.emails.1', value: null }
        ]);
      });

      it('can add an item to an index in an array where that item was previously removed', () => {
        const deepObj = (email: string) => ({
          emails: {
            primary: email
          }
        });
        const bob = deepObj('bob@email.com');
        const fred = deepObj('fred@email.com');
        const sanHolo = deepObj('sanholo@email.com');

        const changeset = Changeset({
          contacts: [bob, fred]
        });

        // "Delete" array element
        changeset.set('contacts.0', null);

        expect(changeset.isDirty).toBeTruthy();
        expect(changeset.get('contacts.0')).toEqual(null);
        expect(changeset.get('contacts')).toEqual([null, fred]);
        expect(changeset.changes).toEqual([{ key: 'contacts.0', value: null }]);

        // Set array element to entirely new object
        changeset.set('contacts.0', sanHolo);

        expect(changeset.isDirty).toBeTruthy();
        expect(changeset.get('contacts')).toEqual([sanHolo, fred]);
        expect(changeset.get('contacts.0.emails.primary')).toEqual('sanholo@email.com');
        expect(changeset.changes).toEqual([{ key: 'contacts.0', value: sanHolo }]);

        // "Delete" array element again
        changeset.set('contacts.0', null);

        expect(changeset.isDirty).toBeTruthy();
        expect(changeset.get('contacts.0')).toEqual(null);
        expect(changeset.get('contacts')).toEqual([null, fred]);
        expect(changeset.changes).toEqual([{ key: 'contacts.0', value: null }]);

        // Revert everything
        changeset.rollback();
        expect(changeset.isDirty).toBeFalsy();
        expect(changeset.changes).toEqual([]);
        expect(changeset.get('contacts')).toEqual([bob, fred]);
      });

      xit(`negative values are not allowed`, () => {
        // This test is currently disabled because setDeep doesn't have a reference to the
        // original array and setDeep is where we'd throw on invalid key values
        const changeset = Changeset(initialData);

        expect(changeset.get('contact.emails')).toEqual(['bob@email.com']);

        expect(() => {
          changeset.set('contact.emails.-1', 'fred@email.com');
        }).toThrow(
          'Negative indices are not allowed as arrays do not serialize values at negative indices'
        );
      });
    });
  });

  describe('arrays as values of top level objects', () => {
    let initialData: { emails: Record<string, string>[] } = { emails: [] };

    beforeEach(() => {
      initialData = { emails: [{ primary: 'bob@email.com' }] };
    });

    it('can modify properties on an entry', () => {
      const changeset = Changeset(initialData);

      changeset.set('emails.0.primary', 'fun@email.com');

      expect(changeset.get('emails.0.primary')).toEqual('fun@email.com');
      expect(changeset.get('emails')).toEqual([{ primary: 'fun@email.com' }]);
      expect(changeset.changes).toEqual([{ key: 'emails.0.primary', value: 'fun@email.com' }]);
    });

    it('can add properties to an entry', () => {
      const changeset = Changeset(initialData);

      changeset.set('emails.0.funEmail', 'fun@email.com');

      expect(changeset.get('emails.0.funEmail')).toEqual('fun@email.com');
      expect(changeset.changes).toEqual([{ key: 'emails.0.funEmail', value: 'fun@email.com' }]);
      expect(changeset.get('emails')).toEqual([
        { primary: 'bob@email.com', funEmail: 'fun@email.com' }
      ]);
    });

    it('can add new properties to new entries', () => {
      const changeset = Changeset(initialData);

      changeset.set('emails.1.funEmail', 'fun@email.com');
      changeset.set('emails.1.primary', 'primary@email.com');

      expect(changeset.get('emails.1.funEmail')).toEqual('fun@email.com');
      expect(changeset.get('emails.1.primary')).toEqual('primary@email.com');
      expect(changeset.get('emails')).toEqual([
        { primary: 'bob@email.com' },
        { primary: 'primary@email.com', funEmail: 'fun@email.com' }
      ]);
      expect(changeset.changes).toEqual([
        { key: 'emails.1.funEmail', value: 'fun@email.com' },
        { key: 'emails.1.primary', value: 'primary@email.com' }
      ]);
    });

    it('can add a new object all at once, and edit it', () => {
      const changeset = Changeset(initialData);

      changeset.set('emails.1', {
        funEmail: 'fun@email.com',
        primary: 'primary@email.com'
      });

      expect(changeset.get('emails.1.funEmail')).toEqual('fun@email.com');
      expect(changeset.get('emails.1.primary')).toEqual('primary@email.com');
      expect(changeset.get('emails')).toEqual([
        { primary: 'bob@email.com' },
        { primary: 'primary@email.com', funEmail: 'fun@email.com' }
      ]);
      expect(changeset.changes).toEqual([
        {
          key: 'emails.1',
          value: { funEmail: 'fun@email.com', primary: 'primary@email.com' }
        }
      ]);

      changeset.set('emails.1.primary', 'primary2@email.com');

      expect(changeset.get('emails.1.primary')).toEqual('primary2@email.com');
      expect(changeset.changes).toEqual([
        {
          key: 'emails.1',
          value: {
            primary: 'primary2@email.com',
            funEmail: 'fun@email.com'
          }
        }
      ]);
      expect(changeset.get('emails')).toEqual([
        { primary: 'bob@email.com' },
        { primary: 'primary2@email.com', funEmail: 'fun@email.com' }
      ]);
    });

    it('can edit a new object that was added after deleting an array entry', () => {
      const changeset = Changeset({
        emails: [
          {
            fun: 'fun0@email.com',
            primary: 'primary0@email.com'
          },
          {
            fun: 'fun1@email.com',
            primary: 'primary1@email.com'
          }
        ]
      });

      changeset.set('emails.1', null);

      expect(changeset.get('emails.0.fun')).toEqual('fun0@email.com');
      expect(changeset.get('emails.0.primary')).toEqual('primary0@email.com');
      expect(changeset.get('emails')).toEqual([
        {
          fun: 'fun0@email.com',
          primary: 'primary0@email.com'
        },
        null
      ]);
      expect(changeset.changes).toEqual([
        {
          key: 'emails.1',
          value: null
        }
      ]);

      changeset.set('emails.1', {
        fun: 'brandNew@email.com',
        primary: 'brandNewPrimary@email.com'
      });

      expect(changeset.get('emails')).toEqual([
        {
          fun: 'fun0@email.com',
          primary: 'primary0@email.com'
        },
        {
          fun: 'brandNew@email.com',
          primary: 'brandNewPrimary@email.com'
        }
      ]);
      expect(changeset.changes).toEqual([
        {
          key: 'emails.1',
          value: {
            fun: 'brandNew@email.com',
            primary: 'brandNewPrimary@email.com'
          }
        }
      ]);
    });

    it('can edit an object with a key of value after another array entry has been deleted', () => {
      const changeset = Changeset({
        emails: [
          {
            fun: 'fun0@email.com',
            primary: 'primary0@email.com',
            value: 'the value'
          },
          {
            fun: 'fun1@email.com',
            primary: 'primary1@email.com',
            value: 'some value'
          }
        ]
      });

      changeset.set('emails.1', null);

      expect(changeset.get('emails')).toEqual([
        {
          fun: 'fun0@email.com',
          primary: 'primary0@email.com',
          value: 'the value'
        },
        null
      ]);
      expect(changeset.changes).toEqual([
        {
          key: 'emails.1',
          value: null
        }
      ]);

      expect(changeset.get('emails.0.fun')).toEqual('fun0@email.com');
      expect(changeset.get('emails.0.primary')).toEqual('primary0@email.com');
      // does not need to be unwrapped
      expect(changeset.get('emails.0.value')).toEqual('the value');
    });
  });

  describe('arrays of objects within nested objects', () => {
    describe('#set', () => {
      let initialData: { contact: { emails: Record<string, string>[] } } = {
        contact: { emails: [] }
      };

      beforeEach(() => {
        initialData = { contact: { emails: [{ primary: 'bob@email.com' }] } };
      });

      it('can modify properties on an entry', () => {
        const changeset = Changeset(initialData);

        changeset.set('contact.emails.0.primary', 'fun@email.com');

        expect(changeset.get('contact.emails.0.primary')).toEqual('fun@email.com');
        expect(changeset.get('contact.emails').unwrap()).toEqual([{ primary: 'fun@email.com' }]);
        expect(changeset.changes).toEqual([
          { key: 'contact.emails.0.primary', value: 'fun@email.com' }
        ]);
      });

      it('can add properties to an entry', () => {
        const changeset = Changeset(initialData);

        changeset.set('contact.emails.0.funEmail', 'fun@email.com');

        expect(changeset.get('contact.emails.0.funEmail')).toEqual('fun@email.com');
        expect(changeset.changes).toEqual([
          { key: 'contact.emails.0.funEmail', value: 'fun@email.com' }
        ]);
        expect(changeset.get('contact.emails').unwrap()).toEqual([
          { primary: 'bob@email.com', funEmail: 'fun@email.com' }
        ]);
      });

      it('can add new properties to new entries', () => {
        const changeset = Changeset(initialData);

        changeset.set('contact.emails.1.funEmail', 'fun@email.com');
        changeset.set('contact.emails.1.primary', 'primary@email.com');

        expect(changeset.get('contact.emails.1.funEmail')).toEqual('fun@email.com');
        expect(changeset.get('contact.emails.1.primary')).toEqual('primary@email.com');
        expect(changeset.get('contact.emails').unwrap()).toEqual([
          { primary: 'bob@email.com' },
          { primary: 'primary@email.com', funEmail: 'fun@email.com' }
        ]);
        expect(changeset.changes).toEqual([
          { key: 'contact.emails.1.funEmail', value: 'fun@email.com' },
          { key: 'contact.emails.1.primary', value: 'primary@email.com' }
        ]);
      });

      it('can add a new object all at once, and edit it', () => {
        const changeset = Changeset(initialData);

        changeset.set('contact.emails.1', {
          funEmail: 'fun@email.com',
          primary: 'primary@email.com'
        });

        expect(changeset.get('contact.emails.1.funEmail')).toEqual('fun@email.com');
        expect(changeset.get('contact.emails.1.primary')).toEqual('primary@email.com');
        expect(changeset.get('contact.emails').unwrap()).toEqual([
          { primary: 'bob@email.com' },
          { primary: 'primary@email.com', funEmail: 'fun@email.com' }
        ]);
        expect(changeset.changes).toEqual([
          {
            key: 'contact.emails.1',
            value: { funEmail: 'fun@email.com', primary: 'primary@email.com' }
          }
        ]);

        changeset.set('contact.emails.1.primary', 'primary2@email.com');

        expect(changeset.get('contact.emails.1.primary')).toEqual('primary2@email.com');
        expect(changeset.changes).toEqual([
          {
            key: 'contact.emails.1',
            value: {
              primary: 'primary2@email.com',
              funEmail: 'fun@email.com'
            }
          }
        ]);
        expect(changeset.get('contact.emails').unwrap()).toEqual([
          { primary: 'bob@email.com' },
          { primary: 'primary2@email.com', funEmail: 'fun@email.com' }
        ]);
      });

      it('can edit a new object that was added after deleting an array entry', () => {
        const changeset = Changeset({
          contacts: {
            emails: [
              {
                fun: 'fun0@email.com',
                primary: 'primary0@email.com'
              },
              {
                fun: 'fun1@email.com',
                primary: 'primary1@email.com'
              }
            ]
          }
        });

        changeset.set('contacts.emails.1', null);

        expect(changeset.get('contacts.emails').unwrap()).toEqual([
          {
            fun: 'fun0@email.com',
            primary: 'primary0@email.com'
          },
          null
        ]);
      });
    });
  });

  it('#set works for nested when the root key is "value"', () => {
    dummyModel.value = {};
    dummyModel.org = {};
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('value.short', 'foo');

    expect(dummyChangeset.get('value.short')).toBe('foo');
    expect(dummyModel.value).toEqual({});

    const changes = dummyChangeset.changes;
    const expectedChanges = [{ key: 'value.short', value: 'foo' }];
    expect(changes).toEqual(expectedChanges);
    expect(dummyChangeset.value).toEqual({ short: 'foo' });
    expect(dummyChangeset.org).toEqual({});

    dummyChangeset.execute();

    expect(dummyModel.value.short).toBe('foo');
  });

  it('nested objects can be replaced with different ones without changing the nested return values', () => {
    dummyModel['org'] = { usa: { ny: 'ny' } };

    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('org', { usa: { ca: 'ca' } });

    expect(dummyChangeset.get('org')).toEqual({ usa: { ca: 'ca', ny: undefined } });
    expect(dummyChangeset.get('org.usa')).toEqual({ ca: 'ca', ny: undefined });
    expect(dummyChangeset.get('org.usa.ca')).toBe('ca');
    expect(dummyChangeset.get('org.usa.ny')).toBeUndefined();
  });

  it('nested objects can be replaced with different ones as classes', () => {
    class Country {
      details: object;
      constructor(details: object) {
        this.details = details;
      }
    }
    dummyModel['org'] = new Country({ usa: { ny: 'ny' } });

    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('org', new Country({ usa: { ca: 'ca' } }));

    expect(dummyChangeset.get('org')).toEqual(new Country({ usa: { ca: 'ca', ny: undefined } }));
    expect(dummyChangeset.get('org.details')).toEqual({ usa: { ca: 'ca', ny: undefined } });
    expect(dummyChangeset.get('org.details.usa')).toEqual({ ca: 'ca', ny: undefined });
    expect(dummyChangeset.get('org.details.usa.ca')).toBe('ca');
    expect(dummyChangeset.get('org.details.usa.ny')).toBeUndefined();
  });

  it('#set doesnt lose sibling keys', () => {
    dummyModel['org'] = {
      usa: {
        mn: 'mn',
        ny: 'ny',
        nz: 'nz'
      },
      landArea: 100
    };

    const c: Record<string, any> = Changeset(dummyModel);
    c.set('org.usa.ny', 'NY');

    expect(dummyModel.org.usa.ny).toBe('ny');
    expect(c.org.usa.ny).toBe('NY');
    expect(c.get('org.usa.ny')).toBe('NY');
    expect(c.get('org.usa.mn')).toBe('mn');
    expect(c.get('org.usa.nz')).toBe('nz');
    expect(c.get('org.landArea')).toBe(100);

    // set again
    c.set('org.usa.ny', 'nye');

    expect(dummyModel.org.usa.ny).toBe('ny');
    expect(c.org.usa.ny).toBe('nye');
    expect(c.get('org.usa.ny')).toBe('nye');
    expect(c.get('org.usa.mn')).toBe('mn');
    expect(c.get('org.usa.nz')).toBe('nz');
    expect(c.get('org.landArea')).toBe(100);
  });

  it('#set adds a change if the key is an object', () => {
    dummyModel['org'] = {
      usa: {
        mn: 'mn',
        ny: 'ny',
        nz: 'nz'
      },
      landArea: 100
    };

    const c: any = Changeset(dummyModel);
    c.set('org.usa.ny', 'NY');

    expect(dummyModel.org.usa.ny).toBe('ny');
    expect(c.org.usa.ny).toBe('NY');
    expect(c.get('org.usa.ny')).toBe('NY');
    expect(c.get('org.usa.mn')).toBe('mn');
    expect(c.get('org.usa.nz')).toBe('nz');
    expect(c.get('org.landArea')).toBe(100);

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
    expect(newValue.date).toEqual(momentInstance.date);
    expect(newValue instanceof Moment).toBeTruthy();
    expect(newValue.date).toEqual(d);

    newValue = c.startDate;
    expect(newValue.date).toEqual(momentInstance.date);
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

  it('#set removes a change if set back to original value in nested context', () => {
    const model = { name: { email: 'foo' } };
    const dummyChangeset = Changeset(model);
    dummyChangeset.safeGet = get;

    dummyChangeset.set('name.email', 'bar');
    expect(dummyChangeset.changes).toEqual([{ key: 'name.email', value: 'bar' }]);

    dummyChangeset.set('name.email', 'foo');
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
    delete dummyModel.save;

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

  it('#set works for deep set and access', async () => {
    const resource = {
      styles: {
        colors: {
          main: {
            sync: true,
            color: '#3D3D3D',
            contrastColor: '#FFFFFF',
            syncedColor: '#575757',
            syncedContrastColor: '#FFFFFF'
          },
          accent: {
            sync: true,
            color: '#967E6E',
            contrastColor: '#ffffff',
            syncedColor: '#967E6E',
            syncedContrastColor: '#ffffff'
          },
          ambient: {
            sync: true,
            color: '#FFFFFF',
            contrastColor: '#3D3D3D',
            syncedColor: '#FFFFFF',
            syncedContrastColor: '#575757'
          }
        }
      }
    };

    const changeset = Changeset(resource);

    changeset.set('styles.colors.main.sync', false);

    const result = changeset.get('styles.colors.main');
    expect(result.sync).toEqual(false);
  });

  it('#set nested objects at various level of tree will return correct values', () => {
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

    dummyChangeset.get('org.asia').set('sg', 'SG');
    expect(dummyChangeset.get('org.asia.sg')).toBe('SG');

    dummyChangeset.get('org').set('asia.sg', 'sg');
    expect(dummyChangeset.get('org.asia.sg')).toBe('sg');

    expect(dummyChangeset.get('org').get('asia.sg')).toBe('sg');
  });

  it('it accepts async validations', async () => {
    delete dummyModel.save;
    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    const expectedChanges = [{ key: 'async', value: true }];
    const expectedError = { async: { validation: 'is invalid', value: 'is invalid' } };

    dummyChangeset.set('async', true);
    expect(dummyChangeset.changes).toEqual(expectedChanges);

    dummyChangeset.set('async', 'is invalid');
    expect(dummyChangeset.error).toEqual({});

    await dummyChangeset.validate();
    expect(dummyChangeset.error).toEqual(expectedError);

    await dummyChangeset.save();
    // save clears errors
    expect(dummyChangeset.error).toEqual({});
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

    const c: any = Changeset(model);
    expect(c.foo.bar.baz).toEqual(model.foo.bar.baz);

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

  it('#prepare works with initial model containing an object property', () => {
    const dummyChangeset = Changeset({ obj: {} });

    dummyChangeset.get('obj').unwrap();
    dummyChangeset.prepare(function(changes) {
      return changes;
    });

    expect(dummyChangeset.isPristine).toEqual(true);
  });

  /**
   * #execute
   */

  it('#execute applies changes to content if valid', () => {
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('name', 'foo');

    expect(dummyModel.name).toBeUndefined();
    expect(dummyChangeset.isValid).toBeTruthy();
    expect(dummyChangeset.isDirty).toBe(true);
    dummyChangeset.execute();
    expect(dummyModel.name).toBe('foo');
    expect(dummyChangeset.isDirty).toBe(false);
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

    const model: Record<string, any> = {};
    const c = Changeset(model);
    c.set('dog', dog);

    const condition = c.dog instanceof DogTag;
    expect(condition).toBeTruthy();

    c.execute();

    const modelDog = model.dog instanceof DogTag;
    expect(modelDog).toBeTruthy();
    expect(Object.getPrototypeOf(model.dog)).toEqual(originalProto);
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
    expect(dog.info.name).toEqual('laika');
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

  it('#execute it works with nested keys', () => {
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
    expect(dummyChangeset.change).toEqual({});
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

  it('#execute works with an object with value key', () => {
    dummyModel.size = {
      value: 0
    };
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('size.value', 1001);
    dummyChangeset.set('size.power10', 10);

    expect(dummyModel.size.value).toEqual(0);
    expect(dummyModel.size.power10).toBeUndefined();

    dummyChangeset.execute();

    expect(dummyModel.size.value).toBe(1001);
    expect(dummyModel.size.power10).toBe(10);
  });

  it('#execute works if leaf property wasnt set before', () => {
    dummyModel.size = {};
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('size.value', 1001);

    expect(dummyModel.size).toEqual({});

    dummyChangeset.execute();

    expect(dummyModel.size.value).toBe(1001);
    expect(dummyModel.size.power10).toBeUndefined();
  });

  it('#execute works if root property wasnt set before', () => {
    const dummyChangeset = Changeset(dummyModel);
    dummyChangeset.set('size.value', 1001);

    expect(dummyModel.size).toBeUndefined();

    dummyChangeset.execute();

    expect(dummyModel.size.value).toBe(1001);
    expect(dummyModel.size.power10).toBeUndefined();
  });

  test('execute returns correct object after setting value on empty initial object', async function() {
    let c = Changeset({});

    c.set('country', 'usa');

    expect(c.execute().data).toEqual({
      country: 'usa'
    });

    c.set('org.usa.ny', 'any value');

    expect(c.execute().data).toEqual({
      country: 'usa',
      org: {
        usa: {
          ny: 'any value'
        }
      }
    });
    c.set('org.usa.il', '2nd value');

    expect(c.execute().data).toEqual({
      country: 'usa',
      org: {
        usa: {
          ny: 'any value',
          il: '2nd value'
        }
      }
    });
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

  it('#save restores values on content after rejected Promise if user calls unexecute', done => {
    expect.assertions(2);

    dummyModel.name = 'previous';
    const dummyChangeset = Changeset(dummyModel);

    dummyModel['save'] = () => {
      dummyModel.errors = [
        {
          message: 'oops I did it again'
        }
      ];
      return Promise.reject(new Error('some ember data error'));
    };

    dummyChangeset.set('name', 'new');

    dummyChangeset
      .save()
      .then(() => {
        expect(false).toBeTruthy();
      })
      .catch(() => {
        dummyChangeset.unexecute();
      })
      .finally(() => {
        expect(dummyModel.name).toEqual('previous');
        expect(dummyModel.errors).toEqual([
          {
            message: 'oops I did it again'
          }
        ]);
        done();
      });
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
    delete dummyModel.save;
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
    expect(dummyChangeset.isDirty).toBe(true);
    dummyChangeset.rollback();
    expect(dummyChangeset.changes).toEqual([]);
    expect(dummyChangeset.errors).toEqual([]);
    expect(dummyChangeset.isDirty).toBe(false);
  });

  it('#rollback resets valid state', () => {
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));
    dummyChangeset.set('name', 'a');

    expect(dummyChangeset.isInvalid).toBeTruthy();
    expect(dummyChangeset.isDirty).toBe(true);
    dummyChangeset.rollback();
    expect(dummyChangeset.isValid).toBeTruthy();
    expect(dummyChangeset.isDirty).toBe(false);
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
    expect(dummyChangeset.isDirty).toBe(true);
    dummyChangeset.rollback();
    expect(dummyChangeset.changes).toEqual([]);
    expect(dummyChangeset.isDirty).toBe(false);
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
    expect(get(dummyChangeset, 'errors.length')).toBe(8);
  });

  it('#validate/0 validates nested fields', async () => {
    dummyModel.org = { usa: { ny: 7 } };
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    await dummyChangeset.validate();
    expect(get(dummyChangeset, 'error.org.usa.ny')).toEqual({
      validation: ['only letters work'],
      value: 7
    });
    expect(dummyChangeset.changes).toEqual([]);
    expect(get(dummyChangeset, 'errors.length')).toBe(8);
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

  it('#validate/1 validates with an falsey string value for the validator message', async () => {
    dummyModel.age = 120;
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    await dummyChangeset.validate('age');
    expect(get(dummyChangeset, 'error.age')).toEqual({ validation: '', value: 120 });
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

  it('#validate/1 validates a property with no validation', async () => {
    dummyModel.org = {};
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    await dummyChangeset.validate('org');
    expect(get(dummyChangeset, 'error.org')).toEqual(undefined);
    expect(dummyChangeset.changes).toEqual([]);
    expect(get(dummyChangeset, 'errors.length')).toBe(0);
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
        options: {},
        org: {
          isCompliant: undefined,
          usa: {
            ny: undefined
          }
        },
        size: {
          value: undefined,
          power10: 10
        }
      }
    };
    let dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations), dummyValidations);

    expect(get(dummyChangeset, 'errors.length')).toBe(0);

    dummyChangeset.set('name', 'Jim Bob');

    await dummyChangeset.validate();

    expect(get(dummyChangeset, 'errors.length')).toBe(5);
    expect(get(dummyChangeset, 'errors')[0].key).toBe('password');
    expect(dummyChangeset.isInvalid).toEqual(true);

    dummyChangeset.set('passwordConfirmation', true);

    await dummyChangeset.validate();
    expect(get(dummyChangeset, 'errors.length')).toBe(5);
    expect(get(dummyChangeset, 'errors')[0].key).toBe('org.usa.ny');
    expect(get(dummyChangeset, 'errors')[1].key).toBe('org.isCompliant');
    expect(get(dummyChangeset, 'errors')[2].key).toBe('password');
    expect(get(dummyChangeset, 'errors')[3].key).toBe('passwordConfirmation');
    expect(dummyChangeset.isInvalid).toEqual(true);

    dummyChangeset.set('org.isCompliant', true);
    dummyChangeset.set('password', 'foobar');
    dummyChangeset.set('passwordConfirmation', 'foobar');
    dummyChangeset.set('email', 'scott.mail@gmail.com');
    dummyChangeset.set('org.usa.ny', 'NY');
    dummyChangeset.set('size.value', 1001);

    await dummyChangeset.validate();

    expect(get(dummyChangeset, 'errors.length')).toBe(0);
    expect(dummyChangeset.isValid).toEqual(true);
    expect((dummyChangeset.size as Record<string, any>).value).toEqual(1001);
    expect((dummyChangeset.size as Record<string, any>).power10).toEqual(10);
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
      ...{
        name: 'Jim Bob',
        email: 'jimmy@bob.com',
        password: true,
        passwordConfirmation: true,
        async: true,
        options,
        org: {
          isCompliant: true,
          usa: {
            ny: 'NY'
          }
        },
        size: {
          value: 1001,
          power10: 10
        }
      }
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

  it('#validate changeset getter', async () => {
    class MyModel {
      isOptionOne = false;
      isOptionTwo = false;
      isOptionThree = true;
    }

    const Validations = {
      isOptionSelected: (newValue: boolean) => {
        return newValue === true ? true : 'No options selected';
      }
    };

    function myValidator({
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
      let validatorFn = get(Validations, key);

      if (typeof validatorFn === 'function') {
        return validatorFn(newValue, oldValue, changes, content);
      }
    }

    const myObject = new MyModel();
    const myChangeset = Changeset(myObject, myValidator, Validations);

    Object.defineProperty(myChangeset, 'isOptionSelected', {
      get() {
        return this.get('isOptionOne') || this.get('isOptionTwo') || this.get('isOptionThree');
      }
    });

    await myChangeset.validate();
    expect(myChangeset.isInvalid).toEqual(false);

    myChangeset.set('isOptionThree', false);
    await myChangeset.validate();
    expect(myChangeset.isInvalid).toEqual(true);

    myChangeset.set('isOptionTwo', true);
    await myChangeset.validate();
    expect(myChangeset.isInvalid).toEqual(false);
  });

  it('#validate/0 works with a class', async () => {
    class PersonalValidator {
      _validate() {
        return 'oh no';
      }
      async validate(_key: string, _newValue: unknown) {
        return this._validate();
      }
    }
    const validationMap = {
      name: new PersonalValidator()
    };
    dummyModel.name = 'J';
    let dummyChangeset = Changeset(dummyModel, lookupValidator(validationMap), validationMap);
    dummyChangeset.name = null;

    await dummyChangeset.validate();

    expect(get(dummyChangeset, 'errors.length')).toBe(1);
    expect(get(dummyChangeset, 'error.name.validation')).toEqual('oh no');
    expect(dummyChangeset.changes).toEqual([
      {
        key: 'name',
        value: null
      }
    ]);
  });

  it('#validate/0 works with a class and multiple validators', async () => {
    function validatePresence(): Function {
      return (val: unknown) => !!val;
    }
    class PersonalValidator {
      _validate() {
        return 'oh no';
      }
      async validate(_key: string, _newValue: unknown) {
        return this._validate();
      }
    }
    const validationMap = {
      name: [validatePresence(), new PersonalValidator()]
    };
    dummyModel.name = 'J';
    let dummyChangeset = Changeset(dummyModel, lookupValidator(validationMap), validationMap);
    dummyChangeset.name = null;

    await dummyChangeset.validate();

    expect(get(dummyChangeset, 'errors.length')).toBe(1);
    expect(get(dummyChangeset, 'error.name.validation')).toEqual(['oh no']);
    expect(dummyChangeset.changes).toEqual([
      {
        key: 'name',
        value: null
      }
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

  it('#addError adds an error then validates', async () => {
    let dummyChangeset = Changeset(dummyModel);
    dummyChangeset.addError('email', {
      value: 'jim@bob.com',
      validation: 'Email already taken'
    });

    expect(dummyChangeset.isInvalid).toEqual(true);
    await dummyChangeset.validate();

    expect(get(dummyChangeset, 'error.email')).toEqual({
      validation: 'Email already taken',
      value: 'jim@bob.com'
    });
    expect(dummyChangeset.changes).toEqual([]);
    expect(get(dummyChangeset, 'errors.length')).toBe(1);
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

  async function delay(duration: number) {
    return new Promise(function(resolve: Function) {
      setTimeout(resolve, duration);
    });
  }

  it('it works with out of order async validations', async () => {
    let latestDelayedAsyncResolver: Function = () => {};

    dummyValidations.delayedAsync = () => {
      return new Promise(resolve => {
        latestDelayedAsyncResolver = resolve;
      });
    };

    const dummyChangeset = Changeset(dummyModel, lookupValidator(dummyValidations));

    dummyChangeset.set('delayedAsync', 'first');
    let firstResolver = latestDelayedAsyncResolver;
    dummyChangeset.set('delayedAsync', 'second');
    let secondResolver = latestDelayedAsyncResolver;

    // second one resolves first with false
    secondResolver(false);
    // then the first resolves first with true
    firstResolver(true);

    // allow promises to run
    await delay(1);

    // clean up before running expectations
    delete dummyValidations.delayedAsync;

    // current value state should be "second"
    // current error state should be invalid
    const expectedChanges = [{ key: 'delayedAsync', value: 'second' }];
    const expectedError = { delayedAsync: { validation: false, value: 'second' } };
    expect(dummyChangeset.changes).toEqual(expectedChanges);
    expect(dummyChangeset.error).toEqual(expectedError);
  });

  /**
   * #unexecute
   */
  it('#unexecute after #save on new ember-data model', async () => {
    const changeset = Changeset(dummyModel);
    try {
      changeset.unexecute();
      expect(true);
    } catch {
      expect(false);
    }
  });
});
