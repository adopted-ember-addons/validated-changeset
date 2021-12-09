import { Config, ValidatorAction, ValidatorMap } from '../../../types';

export interface ArrayWrapperFn {
  (source: any[]): any[];
}

export interface MapConstructorFn {
  (): Map<string | number, any>;
}

export default interface ProxyOptions extends Config {
  getArrayStorage?: ArrayWrapperFn;
  getMap?: MapConstructorFn;
  validateFn?: ValidatorAction;
  validationMap?: ValidatorMap | null;
}
