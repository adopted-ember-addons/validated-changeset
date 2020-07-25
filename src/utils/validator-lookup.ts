import handleMultipleValidations from './handle-multiple-validations';
import isPromise from './is-promise';
import isObject from './is-object';
import { ValidatorAction, ValidatorMapFunc, ValidatorClass, ValidationResult, ValidatorMap } from '../types';
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
    let validator: ValidatorMapFunc | ValidatorMapFunc[] | ValidatorClass = get(validations, key);
    const isValidatorClass = (maybeClass: unknown): maybeClass is ValidatorClass => !!(maybeClass as Record<string, any>).validate;
    if (validator && isValidatorClass(validator)) {
      validator = validator.validate;
    }

    if (!validator || isObject(validator)) {
      return true;
    }

    if (Array.isArray(validator) && validator.some(v => typeof v !== 'function')) {
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
          return result;
        })
      : validation;
  };
}
