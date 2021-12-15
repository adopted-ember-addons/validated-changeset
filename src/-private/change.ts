/* import { IChange } from '../types'; */
import isObject from './utils/is-object';

export const VALUE = Symbol('__value__');

export default class Change {
  [VALUE]: unknown;

  constructor(value: unknown) {
    this[VALUE] = value;
  }
}

// TODO: not sure why this function type guard isn't working
export const isChange = (maybeChange: unknown): maybeChange is Change =>
  isObject(maybeChange) && VALUE in (maybeChange as any);

export function getChangeValue(maybeChange: Change | unknown): any {
  if (isChange(maybeChange)) {
    return maybeChange[VALUE];
  }
}
