import Change, { getChangeValue, isChange } from './-private/change';
import { getKeyValues } from './utils/get-key-values';
import lookupValidator from './utils/validator-lookup';
import Err from './-private/err';
import normalizeObject from './utils/normalize-object';
import pureAssign from './utils/assign';
import isChangeset, { CHANGESET } from './utils/is-changeset';
import isObject from './utils/is-object';
import isPromise from './utils/is-promise';
import keyInObject from './utils/key-in-object';
import mergeNested from './utils/merge-nested';
import { buildOldValues } from './utils/build-old-values';
import objectWithout from './utils/object-without';
import take from './utils/take';
import mergeDeep, { propertyIsUnsafe } from './utils/merge-deep';
import setDeep from './utils/set-deep';
import getDeep from './utils/get-deep';

import { Config, ValidatorAction, ValidatorMap } from './types';
import { BufferedChangeset } from './-private/changesets/buffered-changeset';
import { ValidatedChangeset } from './-private/changesets/validated-changeset';

export {
  BufferedChangeset,
  ValidatedChangeset,
  CHANGESET,
  Change,
  Err,
  buildOldValues,
  isChangeset,
  isObject,
  isChange,
  getChangeValue,
  isPromise,
  getKeyValues,
  keyInObject,
  lookupValidator,
  mergeNested,
  normalizeObject,
  objectWithout,
  pureAssign,
  take,
  mergeDeep,
  setDeep,
  getDeep,
  propertyIsUnsafe
};

/**
 * Creates new changesets.
 */
export function changeset(
  obj: object,
  validateFn?: ValidatorAction,
  validationMap?: ValidatorMap | null | undefined,
  options?: Config
): BufferedChangeset {
  return new BufferedChangeset(obj, validateFn, validationMap, options);
}

export function Changeset(
  obj: object,
  validateFn?: ValidatorAction,
  validationMap?: ValidatorMap | null | undefined,
  options?: Config
): BufferedChangeset {
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
  });
}
