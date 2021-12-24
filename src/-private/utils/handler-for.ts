import { TContent } from '../../types';
import ChangesetArrayProxyHandler from '../changesets/proxy/changeset-array-proxy-handler';
import ChangesetObjectProxyHandler from '../changesets/proxy/changeset-object-proxy-handler';
import IChangesetProxyHandler from '../changesets/proxy/changeset-proxy-handler-interface';
import ProxyOptions from '../changesets/proxy/proxy-options';

export default function handlerFor<T extends TContent>(
  value: T,
  options: ProxyOptions
): IChangesetProxyHandler<T> {
  if (Array.isArray(value)) {
    return new ChangesetArrayProxyHandler(value, options);
  }
  return new ChangesetObjectProxyHandler(value, options);
}
