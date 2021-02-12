export function isArrayObject(obj: Record<string, any>) {
  let maybeIndicies = Object.keys(obj);

  return maybeIndicies.every(key => Number.isInteger(parseInt(key, 10)));
}

export function arrayToObject(array: any[]): Record<string, any> {
  return array.reduce((obj, item, index) => {
    obj[index] = item;
    return obj;
  }, {} as Record<string, any>);
}

export function objectToArray(obj: Record<string, any>): any[] {
  let result: any[] = [];

  for (let [index, value] of Object.entries(obj)) {
    result[parseInt(index, 10)] = value;
  }

  return result;
}
