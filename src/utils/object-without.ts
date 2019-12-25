const { keys } = Object;

/**
 * Merges all sources together, excluding keys in excludedKeys.
 *
 * @param  {string[]}    excludedKeys
 * @param  {...object}        sources
 *
 * @return {object}
 */
export default function objectWithout<T>(excludedKeys: string[], ...sources: T[]): object {
  return sources.reduce((acc: Record<string, any>, source: any): object => {
    keys(source)
      .filter(key => excludedKeys.indexOf(key) === -1 || !source.hasOwnProperty(key))
      .forEach(key => (acc[key] = source[key]));
    return acc;
  }, {});
}
