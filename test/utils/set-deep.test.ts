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

  it('handles null case', () => {
    const objA = { name: { other: 'Ivan', nick: null } };
    const value = setDeep(objA, 'name.other', null);

    expect(value).toEqual({ name: { other: null, nick: null } });
  });

  it('handles function case', () => {
    const objA = { name: { other: 'Ivan' } };
    const anon = () => {};
    const value = setDeep(objA, 'name.other', anon);

    expect(value).toEqual({ name: { other: anon } });
  });

  it('it handles nested key', () => {
    const objA = { name: { other: 'Ivan' } };
    const value = setDeep(objA, 'name.other', 'foo');

    expect(value).toEqual({ name: { other: 'foo' } });
  });

  it('handles existing arrays', () => {
    const objA = { entries: [{ prop: 'foo' }] };
    const value = setDeep(objA, 'entries.0.prop', 'bar');

    expect(value).toEqual({ entries: [{ prop: 'bar' }] });
  });

  it('inserts data into existing arrays', () => {
    const objA = { entries: [{ prop: 'foo' }] };
    const value = setDeep(objA, 'entries.1.prop', 'bar');

    expect(value).toEqual({ entries: [{ prop: 'foo' }, { prop: 'bar' }] });
  });

  it('inserts data into empty arrays', () => {
    const objA = { entries: [] };
    const value = setDeep(objA, 'entries.0.prop', 'bar');

    expect(value).toEqual({ entries: [{ prop: 'bar' }] });
  });

  it('does not allow inserting into arrays at negative values', () => {
    const objA = { entries: [] };

    expect(() => {
      setDeep(objA, 'entries.-1.prop', 'bar');
    }).toThrow(
      'Negative indices are not allowed as arrays do not serialize values at negative indices'
    );
  });

  it('inserts primitive types into existing arrays', () => {
    const objA = { entries: ['foo'] };
    const value = setDeep(objA, 'entries.1', 'bar');

    expect(value).toEqual({ entries: ['foo', 'bar'] });
  });

  it('inserts primitive types into empty arrays', () => {
    const objA = { entries: [] };
    const value = setDeep(objA, 'entries.0', 'bar');

    expect(value).toEqual({ entries: ['bar'] });
  });

  it('it does not lose sibling keys', () => {
    const objA = {
      name: {
        other: 'Ivan',
        koala: 'bear',
        location: {
          state: 'MN',
          zip: '45554'
        }
      },
      star: 'wars'
    };

    let value = setDeep(objA, 'name.other', 'foo');
    value = setDeep(objA, 'name.location.state', 'CO');

    const expected = {
      name: {
        other: 'foo',
        koala: 'bear',
        location: {
          state: 'CO',
          zip: '45554'
        }
      },
      star: 'wars'
    };
    expect(value).toEqual(expected);
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

  it('it works with nested Changes null', () => {
    const objA = {
      top: new Change({ name: 'jimmy', foo: { other: null } })
    };
    let value = setDeep(objA, 'top.name', new Change(null));
    value = setDeep(objA, 'top.foo', new Change(null));

    expect(value).toEqual({
      top: new Change({
        foo: null,
        name: null
      })
    });
  });

  it('it works with nested Changes with different order', () => {
    const objA = {
      top: new Change({ foo: { other: 'bar' }, name: 'jimmy' })
    };
    const value = setDeep(objA, 'top.name', new Change('zoo'));

    expect(value).toEqual({
      top: new Change({
        foo: { other: 'bar' },
        name: 'zoo' // value is not a Change instance
      })
    });
  });

  it('it works with nested Changes with different order', () => {
    const objA = {
      top: new Change({ foo: { other: 'bar' }, name: 'jimmy' })
    };
    const value = setDeep(objA, 'top.name', new Change('zoo'));

    expect(value).toEqual({
      top: new Change({
        foo: { other: 'bar' },
        name: 'zoo' // value is not a Change instance
      })
    });
  });

  it('set on nested Changes', () => {
    const objA = {
      top: new Change({ foo: { other: 'bar' }, name: 'jimmy' })
    };
    let value = setDeep(objA, 'top.name', new Change('zoo'));

    expect(value).toEqual({
      top: new Change({
        foo: { other: 'bar' },
        name: 'zoo' // value is not a Change instance
      })
    });

    value = setDeep(value, 'top.foo.other', new Change('baz'));

    expect(value).toEqual({
      top: new Change({
        foo: { other: 'baz' },
        name: 'zoo'
      })
    });
  });

  it('set on nested properties within an empty object', () => {
    const objA = {
      top: {}
    };
    let value = setDeep(objA, 'top.name', new Change('zoo'));

    expect(value).toEqual({
      top: {
        name: new Change('zoo')
      }
    });

    value = setDeep(value, 'top.foo.other', new Change('baz'));

    expect(value).toEqual({
      top: {
        name: new Change('zoo'),
        foo: {
          other: new Change('baz')
        }
      }
    });
  });

  describe('arrays at various nestings within an object', () => {
    describe('array nested one level deep', () => {
      it('sets when teh array is initially empty', () => {
        const objA = {
          top: []
        };
        let value = setDeep(objA, 'top.0.name', new Change('zoo'));

        expect(value).toEqual({
          top: [{ name: new Change('zoo') }]
        });

        value = setDeep(value, 'top.0.foo.other', new Change('baz'));

        expect(value).toEqual({
          top: [
            {
              name: new Change('zoo'),
              foo: {
                other: new Change('baz')
              }
            }
          ]
        });
      });

      it('sets with existing changes', () => {
        const objA = {
          top: [new Change({ foo: { other: 'bar' }, name: 'jimmy' })]
        };
        let value = setDeep(objA, 'top.0.name', new Change('zoo'));

        expect(value).toEqual({
          top: [
            new Change({
              foo: { other: 'bar' },
              name: 'zoo' // value is not a Change instance
            })
          ]
        });

        value = setDeep(value, 'top.0.foo.other', new Change('baz'));

        expect(value).toEqual({
          top: [
            new Change({
              foo: { other: 'baz' },
              name: 'zoo'
            })
          ]
        });
      });
    });
  });

  describe('faux arrays at various nestings within an object', () => {
    describe('faux array deeply nested', () => {
      it('works with existing changes', () => {
        const objA = {
          contact: {
            emails: {
              1: new Change({ funEmail: 'fun@email.com', primary: 'primary@email.com' })
            }
          }
        };

        let value = setDeep(objA, 'contact.emails.1.primary', new Change('primary2@email.com'));

        expect(value).toEqual({
          contact: {
            emails: {
              1: new Change({
                funEmail: 'fun@email.com',
                primary: 'primary2@email.com'
              })
            }
          }
        });
      });
    });
  });

  it('set with class instances', () => {
    class Person {
      name = 'baz';
    }
    const objA = {
      top: new Change({ foo: { other: 'bar' }, name: 'jimmy' })
    };
    let value = setDeep(objA, 'top.name', new Change(new Person()));

    expect(value).toEqual({
      top: new Change({
        foo: { other: 'bar' },
        name: new Person()
      })
    });

    class Foo {
      other = 'baz';
    }
    value = setDeep(value, 'top.foo', new Change(new Foo()));

    expect(value).toEqual({
      top: new Change({
        foo: new Foo(),
        name: new Person()
      })
    });
  });

  it('super deep set does not lose siblings', () => {
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

    setDeep(resource, 'styles.colors.main.sync', false);

    const value = resource.styles.colors.main;

    expect(value).toEqual({
      sync: false,
      color: '#3D3D3D',
      contrastColor: '#FFFFFF',
      syncedColor: '#575757',
      syncedContrastColor: '#FFFFFF'
    });
  });
});
