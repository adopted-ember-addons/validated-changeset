import ChangesetArrayProxyHandler from '../changesets/proxy/changeset-array-proxy-handler';
import ChangesetObjectProxyHandler from '../changesets/proxy/changeset-object-proxy-handler';
import ProxyOptions from '../changesets/proxy/proxy-options';

export default function handlerFor(value: {}, options: ProxyOptions): any {
  if (Array.isArray(value)) {
    return new ChangesetArrayProxyHandler(value, options);
  }
  return new ChangesetObjectProxyHandler(value, options);
}
