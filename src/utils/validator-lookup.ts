import handleMultipleValidations from './handle-multiple-validations';
import isPromise from './is-promise';
import isObject from './is-object';
import type {
  ValidatorAction,
  ValidatorMapFunc,
  ValidatorClass,
  ValidationResult,
  ValidatorMap
} from '../types';
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
    let validator:
      | ValidatorMapFunc
      | ValidatorMapFunc[]
      | ValidatorClass
      | ValidatorClass[]
      | Array<ValidatorMapFunc | ValidatorClass> = get(validations, key);
    const isValidatorClass = (maybeClass: unknown): maybeClass is ValidatorClass =>
      !!(maybeClass as Record<string, any>).validate;
    if (validator && isValidatorClass(validator)) {
      validator = validator.validate.bind(validator);
    }

    if (!validator || isObject(validator)) {
      return true;
    }

    let validation: ValidationResult | Promise<ValidationResult>;
    if (Array.isArray(validator)) {
      validation = handleMultipleValidations(validator, {
        key,
        newValue,
        oldValue,
        changes,
        content
      });
    } else {
      validation = (validator as ValidatorMapFunc)(key, newValue, oldValue, changes, content);
    }

    return isPromise(validation)
      ? (validation as Promise<ValidationResult>).then(result => {
          return result;
        })
      : validation;
  };
}
