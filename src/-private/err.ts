import type { ValidationErr } from '../types';

export default class Err implements IErr<any> {
  value: any;
  validation: ValidationErr | ValidationErr[];

  constructor(value: any, validation: ValidationErr | ValidationErr[]) {
    this.value = value;
    this.validation = validation;
  }
}

export interface IErr<T> {
  value: T;
  validation: ValidationErr | ValidationErr[];
}

export type Errors<T> = {
  [s: string]: IErr<T>;
};

export type PublicErrors = {
  key: string;
  value: any;
  validation: ValidationErr | ValidationErr[];
}[];