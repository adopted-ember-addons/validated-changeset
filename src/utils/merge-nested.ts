import setDeep from './set-deep';

const { keys } = Object;

/**
 * Given an array of objects, merge their keys into a new object and
 * return the new object.
 */
export default function mergeNested<T>(...objects: Array<{ [key: string]: T }>): {
  [key: string]: T;
} {
  let finalObj = {};

  objects.forEach((obj) => keys(obj).forEach((key) => setDeep(finalObj, key, obj[key])));

  return finalObj;
}
