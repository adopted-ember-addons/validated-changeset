import handleMultipleValidations from './handle-multiple-validations';
import isPromise from './is-promise';
import { ValidatorAction, ValidatorMapFunc, ValidationResult, ValidatorMap } from '../types';
import get from './get-deep';

/**
 * returns a closure to lookup and validate k/v pairs set on a changeset
 *
 * @method lookupValidator
 * @param validationMap
 */
export default function lookupValidator(validationMap: ValidatorMap): ValidatorAction {
  return ({ key, newValue, oldValue, changes, content }) => {
    const validations = validationMap || {};
    let validator: ValidatorMapFunc | ValidatorMapFunc[] = get(validations, key);

    if (!validator || typeof validator !== 'function') {
      return true;
    }

    if (Array.isArray(validator)) {
      return handleMultipleValidations(validator as ValidatorMapFunc[], {
        key,
        newValue,
        oldValue,
        changes,
        content
      });
    }

    let validation: ValidationResult | Promise<ValidationResult> = (validator as ValidatorMapFunc)(
      key,
      newValue,
      oldValue,
      changes,
      content
    );

    return isPromise(validation)
      ? (validation as Promise<ValidationResult>).then(result => {
          if (Array.isArray(result) && result.length > 0) {
            return result[0];
          }
          return result;
        })
      : validation;
  };
}
