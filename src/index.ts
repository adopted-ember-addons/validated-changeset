import Change, { getChangeValue, isChange } from './-private/change';
import { getKeyValues } from './utils/get-key-values';
import lookupValidator from './utils/validator-lookup';
import Err from './-private/err';
import normalizeObject from './utils/normalize-object';
import pureAssign from './utils/assign';
import isObject from './-private/utils/is-object';
import isPromise from './utils/is-promise';
import keyInObject from './utils/key-in-object';
import mergeNested from './utils/merge-nested';
import { buildOldValues } from './utils/build-old-values';
import objectWithout from './utils/object-without';
import take from './utils/take';
import mergeDeep, { propertyIsUnsafe } from './utils/merge-deep';

import { Config, IChangeset, ValidatorAction, ValidatorMap } from './types';
import Changeset from './-private/changesets/changeset';

export {
  Change,
  Err,
  IChangeset,
  buildOldValues,
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
  propertyIsUnsafe
};

/**
 * Creates new changesets.
 */
export function changeset<T extends TContent>(
  obj: T,
  validateFn?: ValidatorAction,
  validationMap?: ValidatorMap | null | undefined,
  options?: Config
): IChangeset<T> {
  return new Changeset<T>(obj, validateFn, validationMap, options);
}

export { Changeset };
