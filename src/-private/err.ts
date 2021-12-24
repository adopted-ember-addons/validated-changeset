import { IErr, ValidationErr } from '../types';

export default class Err implements IErr<any> {
  value: any;
  validation: ValidationErr[];

  constructor(value: any, ...validation: ValidationErr[]) {
    this.value = value;
    this.validation = validation;
  }
}
