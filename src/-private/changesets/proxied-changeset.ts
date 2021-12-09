import { Config, IPublicChangeset, ValidatorAction, ValidatorMap } from '../../types';
import handlerFor from '../utils/handler-for';
import ProxyOptions from './proxy/proxy-options';

export default function proxiedChangeset(
  obj: object,
  validateFn?: ValidatorAction,
  validationMap?: ValidatorMap | null | undefined,
  options?: Config
): IPublicChangeset {
  const handlerOptions: ProxyOptions = {
    changesetKeys: options?.changesetKeys,
    skipValidate: options?.skipValidate,
    getArrayStorage: undefined,
    getMap: undefined,
    validateFn,
    validationMap
  };
  return new Proxy(obj, handlerFor(obj, handlerOptions)) as IPublicChangeset;
}
