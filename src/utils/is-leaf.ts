import getDeep from './get-deep';
import Change from '../-private/change';
import { Changes } from '../types';

export function isLeafInChanges(key: string, changes: Changes) {
  return getDeep(changes, key) && getDeep(changes, key) instanceof Change;
}
