import { Changeset, ValidatedChangeset, ValidationChangesetFactory } from '../src';
import strictRecord from './support/strict-record';

const PROXY_CONTENT = Symbol('PROXY_CONTENT');

const factories = {
  Changeset: (obj: object) => Changeset(obj),
  ValidatedChangeset: (obj: object) => new ValidatedChangeset(obj),
  ValidationChangesetFactory: (obj: object) => ValidationChangesetFactory(obj)
};

describe('Unit | symbol keys', () => {
  Object.entries(factories).forEach(([name, create]) => {
    describe(name, () => {
      it('reads a symbol key without looking it up on the content', () => {
        const dummy: any = create(strictRecord({ title: 'About' }));

        expect(dummy[PROXY_CONTENT]).toBeUndefined();
        expect(dummy.title).toBe('About');
      });

      it('stores a symbol key on the changeset, not as a change', () => {
        const dummy: any = create({ title: 'About' });

        dummy[PROXY_CONTENT] = 'marker';

        expect(dummy[PROXY_CONTENT]).toBe('marker');
        expect(dummy.isDirty).toBe(false);
      });
    });
  });
});
