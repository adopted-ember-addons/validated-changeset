import wrapInArray from './wrap';
import handleMultipleValidations from './handle-multiple-validations';
import isPromise from './is-promise';
import { ValidatorAction, ValidatorMapFunc, ValidationResult, ValidatorMap } from '../types';

/**
 * returns a closure to lookup and validate k/v pairs set on a changeset
 *
 * @method lookupValidator
 * @param validationMap
 */
export default function lookupValidator(validationMap: ValidatorMap): ValidatorAction {
  return ({ key, newValue, oldValue, changes, content }) => {
    let validator: ValidatorMapFunc | ValidatorMapFunc[] = validationMap[key];

    if (!validator || validator === {}) {
      return true;
    }

    if (Array.isArray(validator)) {
      return handleMultipleValidations(<ValidatorMapFunc[]>validator, { key, newValue, oldValue, changes, content });
    }

    let validation: ValidationResult | Promise<ValidationResult> = (<ValidatorMapFunc>validator)(key, newValue, oldValue, changes, content);

    return isPromise(validation) ? (<Promise<ValidationResult>>validation).then(wrapInArray) : [validation];
  };
}

