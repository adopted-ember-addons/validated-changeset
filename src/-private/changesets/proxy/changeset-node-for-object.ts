import { ChangeRecord, IErr, INotifier, IPublicChangeset, PrepareChangesFn, PublicErrors, Snapshot, ValidationErr, ValidationResult } from '../../../types';
import ChangesetNode from './changeset-node';

export default class ChangeSetNodeForObject extends ChangesetNode implements IPublicChangeset {
}
