import { BufferedChangeset, changeset } from '.';
import { T20 } from './buffered-changeset';
import { ValidatorAction, ValidatorMap, Config } from './types';

export class ValidatedChangeset {
  /**
   * Changeset factory class if you need to extend
   *
   * @class ValidatedChangeset
   * @constructor
   */
  constructor(
    obj: object,
    validateFn?: ValidatorAction,
    validationMap?: ValidatorMap | null | undefined,
    options?: Config
  ) {
    const c: BufferedChangeset = changeset(obj, validateFn, validationMap, options);

    return new Proxy(c, {
      get(targetBuffer, key /*, receiver*/) {
        const res = targetBuffer.get(key.toString());
        return res;
      },

      set(targetBuffer, key, value /*, receiver*/) {
        targetBuffer.set(key.toString(), value);
        return true;
      }
    }) as T20;
  }
}
