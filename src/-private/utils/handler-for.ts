import ChangesetArrayProxyHandler from '../changesets/proxy/changeset-array-proxy-handler';
import ChangesetObjectProxyHandler from '../changesets/proxy/changeset-object-proxy-handler';

export default function handlerFor(value: {}): any {
  if (Array.isArray(value)) {
    return new ChangesetArrayProxyHandler(value);
  }
  return new ChangesetObjectProxyHandler(value);
}
