import { Notifier } from '../..';
import {
  Errors,
  IChangeset,
  IErr,
  PrepareChangesFn,
  PublicErrors,
  RunningValidations,
  Snapshot,
  TContentArray,
  ValidationErr
} from '../../../types';
import handlerFor from '../../utils/handler-for';
import { ChangesetIdentityKey, isChangeset } from '../../utils/is-changeset';
import isUnchanged from '../../utils/is-unchanged';
import replaceArrayContent from '../../utils/replace-array-content';
import requiresProxying from '../../utils/requires-proxying';
import setDeep from '../../utils/set-deep';
import splitKey from '../../utils/split-key';
import { AFTER_ROLLBACK_EVENT } from '../../utils/strings';
import IChangesetProxyHandler, { Change } from './changeset-proxy-handler-interface';
import ProxyOptions from './proxy-options';
import { DeleteOnUndo } from './proxy-symbols';

type Input = any[];

const NoValidation = false;

interface EventedCallback {
  (args: any[]): void;
}

export default class ChangesetArrayProxyHandler<T extends TContentArray>
  implements IChangesetProxyHandler<T> {
  constructor(source: T, options: ProxyOptions) {
    this.options = options;
    this.__originalContent = source;
  }

  get originalContent(): T {
    return this.__originalContent;
  }

  applyTo(target?: T): this {
    this.execute(target);
    this.clearPending();
    return this;
  }

  pushErrors<T>(key: string, ...newErrors: (ValidationErr | IErr<T>)[]): IErr<any> {
    throw new Error('Method not implemented.');
  }
  restore(obj: Snapshot): this {
    throw new Error('Method not implemented.');
  }
  snapshot(): Snapshot {
    throw new Error('Method not implemented.');
  }

  public get(_target: T, key: string | symbol, receiver: any): any {
    // extra stuff
    console.log('get ' + key.toString());
    switch (key) {
      case 'copyWithin':
      case 'fill':
      case 'pop':
      case 'push':
      case 'reverse':
      case 'shift':
      case 'sort':
      case 'splice':
      case 'unshift':
        return Reflect.get(this.writeArray, key, receiver);
    }
    key = key.toString();
    if (typeof (this.readArray as Record<string, any>)[key] === 'function') {
      return (this.readArray as Record<string, any>)[key];
    }
    switch (key) {
      case 'length':
        return Reflect.get(this.writeArray, key, receiver);
    }
    return this.getValue(key);
  }

  public has(target: Record<string, any>, key: string) {
    return Reflect.has(this.readArray, key);
  }

  public ownKeys() {
    return Reflect.ownKeys(this.readArray);
  }

  public getOwnPropertyDescriptor(
    target: Record<string, any>,
    key: string
  ): PropertyDescriptor | undefined {
    return Reflect.getOwnPropertyDescriptor(this.readArray, key);
  }

  public set(_target: any[], key: string, value: any): any {
    return this.setValue(key, value);
  }

  public readonly isChangeset = true;

  public get isDirty(): boolean {
    // we're dirty if either we have top level changes
    // or if a nested proxy is dirty
    let changes = this.__changes;
    if (!changes) {
      return false;
    }
    let data = this.__originalContent;
    if (changes.length !== data.length) {
      return true;
    }
    for (let i = 0; i < data.length; i++) {
      let change = changes[i];
      if (!isUnchanged(change, data[i])) {
        // a proxy is always different from the original
        // see if it's dirty
        if (isChangeset(change)) {
          if (change.isDirty) {
            return true;
          } else if (change.data !== data[i]) {
            // it's a proxy for a new object
            return true;
          }
        } else {
          // scalar values that has changed
          return true;
        }
      }
    }
    return false;
  }

  public get isPristine(): boolean {
    return !this.isDirty;
  }

  public get isInvalid(): boolean {
    return !this.isValid;
  }

  public get isValid(): boolean {
    // validate this level
    if (Object.keys(this.__errors).length > 0) {
      return false;
    }
    // now look at all the nested proxies
    if (this.__changes === undefined) {
      return true;
    }
    for (let change of this.__changes) {
      if (isChangeset(change) && !change.isValid) {
        return false;
      }
    }
    return true;
  }

  public get content(): T {
    return this.readArray;
  }

  public get error(): object {
    return this.__errors;
  }

  public get errors(): PublicErrors {
    return Object.keys(this.__errors).map(key => {
      let entry = this.__errors[key];
      return {
        key,
        value: entry.value,
        validation: entry.validation
      };
    });
  }

  public isValidating(key: string | void): boolean {
    let runningValidations: RunningValidations = this._runningValidations;
    let ks: string[] = Object.keys(runningValidations);
    if (key) {
      return ks.includes(key);
    }
    return ks.length > 0;
  }

  rollbackInvalid(key: string | void): this {
    if (!key) {
      // clone the array so we can edit the object
      // while iterating the keys
      let keys = [...Object.keys(this.__errors)];
      for (let key of keys) {
        this.rollbackProperty(key);
      }
    } else if (this.__errors[key]) {
      this.rollbackProperty(key);
    }
    return this;
  }

  public at(index: number) {
    // is it an existing proxy?
    return this.readArray[index];
  }

  cast() {
    // noop
  }

  /**
   * String representation for the changeset.
   */
  get [Symbol.toStringTag](): string {
    return this.readArray.toString();
  }

  public getValue(key: string) {
    if (key === ChangesetIdentityKey) {
      return true;
    }
    let [localKey, subkey] = splitKey(key);
    // it wasn't in there so look in our array
    let index = parseInt(localKey);
    if (index === NaN) {
      return undefined;
    }
    if (index < 0) {
      throw 'Negative indices are not allowed as arrays do not serialize values at negative indices';
    }
    let value = this.readArray[index];
    if (requiresProxying(value)) {
      value = this.addProxy(index, this.writeArray[index]);
    }
    if (subkey) {
      value = value[subkey];
    }
    return value;
  }

  private get readArray(): T {
    return this.__changes ?? this.__originalContent;
  }

  private get writeArray(): T {
    if (this.__changes === undefined) {
      this.__changes = [...this.__originalContent];
    }
    return this.__changes as T;
  }

  public setValue(key: string, value: any, _validate = true): boolean {
    let [localKey, subkey] = splitKey(key);
    const index = parseInt(localKey);
    if (index === NaN) {
      return false;
    }
    if (index < 0) {
      throw 'Negative indices are not allowed as arrays do not serialize values at negative indices';
    }
    if (subkey) {
      // pass the change down to a nested level
      let proxy = this.readArray[index];
      if (!isChangeset(proxy)) {
        // no existing proxy
        // so they're trying to set deep into an object that isn't yet proxied
        // wrap the existing object or create an empty one
        proxy = this.addProxy(index);
      }
      return proxy.set(subkey, value);
    } else {
      // this is a change at our level
      // check the changeset key filter
      if (requiresProxying(value)) {
        value = this.addProxy(index, value);
        return true;
      }
      // the value is a scalar value
      this.writeArray[index] = value;
      return true;
    }
  }

  private addProxy<T>(index: number, value?: T): any {
    // get sends just the key
    // set sends the key and the new value
    let proxyValue: T | {} = value ?? (this.__originalContent[index] as T) ?? {};
    let proxy = new Proxy(proxyValue, handlerFor(proxyValue, this.options)) as IChangeset<T>;
    this.writeArray[index] = proxy;
    return proxy;
  }

  markChange(index: number, value: any) {
    this.writeArray[index] = value;
    // const oldValue = this.__originalContent[index];
    // const unchanged = isUnchanged(value, oldValue);
    // let changes = this.__changes;
    // if (changes && changes.has(index)) {
    //   // we have a pending change
    //   // modify it or delete
    //   if (unchanged) {
    //     // we're back to the original value
    //     // so delete the change
    //     changes.delete(index);
    //   } else {
    //     // we know the key exists so the cast is safe
    //     changes.set(index, value);
    //   }
    // } else if (!unchanged) {
    //   // create a new pending change
    //   if (!changes) {
    //     this.__changes = changes = new Map<number, any>();
    //   }
    //   changes.set(index, value);
    // }
  }

  public prepare(preparedChangedFn: PrepareChangesFn): this {
    let changes: Record<string, any> = {};
    for (let change of this.changes) {
      changes[change.key] = change.value;
    }
    const modifiedChanges = preparedChangedFn(changes);
    // clear all our changes
    this.clearPending();
    // and replace with these
    if (modifiedChanges !== null) {
      for (let key in modifiedChanges) {
        const value = modifiedChanges[key];
        this.setValue(key, value, NoValidation);
      }
    }
    return this;
  }

  public execute(target?: TContentArray): this {
    // apply the changes to the source
    // but keep the changes for undo later
    if (target === undefined) {
      target = this.__originalContent;
    }
    if (this.isDirty) {
      this.__undoState = target.concat([]); // copy the array;
      if (this.__changes && this.isValid) {
        replaceArrayContent(target, this.__changes);
      }
    }
    return this;
  }

  on(eventName: string, callback: EventedCallback) {
    const notifier = this.notifierForEvent(eventName);
    return notifier.addListener(callback);
  }

  off(eventName: string, callback: EventedCallback) {
    const notifier = this.notifierForEvent(eventName);
    return notifier.removeListener(callback);
  }

  public unwrap(): this {
    // deprecated
    return this;
  }

  public unexecute(): this {
    if (this.__changes !== undefined) {
      // apply the undo state from the bottom up
      for (let value of this.__changes) {
        if (isChangeset(value)) {
          value.unexecute();
        }
      }
    }

    if (this.__undoState) {
      let oldStates = [...this.__undoState.entries()];
      for (let [key, value] of oldStates) {
        if (value === DeleteOnUndo) {
          delete this.__originalContent[key];
        } else {
          this.__originalContent[key] = value;
        }
      }
    }
    // clear the undo state
    this.__undoState = undefined;
    return this;
  }

  private clearPending() {
    this.__changes = undefined;
    this.__undoState = undefined;
  }

  public rollbackProperty(_key: string): this {
    // doesn't mean anything for arrays
    this.trigger(AFTER_ROLLBACK_EVENT);
    return this;
  }

  public rollback(): void {
    // apply the undo state
    if (this.__undoState) {
      replaceArrayContent(this.__originalContent, this.__undoState);
    }
    this.clearPending();
  }

  public async validate(..._validationKeys: string[]): Promise<void> {}

  public get change(): { [index: string]: any } | any[] {
    let changes = this.changes;
    // build a structure from them
    let result = {};
    for (let change of changes) {
      setDeep(result, change.key, change.value);
    }
    return result;
  }

  public get changes(): Change[] {
    let allChanges: Change[] = [];
    let changes = this.__changes;
    if (changes === undefined) {
      return [];
    }
    let data = this.__originalContent;
    for (let i = 0; i < changes.length; i++) {
      let newValue = changes[i];
      let oldValue = data[i];
      if (!isUnchanged(newValue, oldValue)) {
        // the value has changed at this index
        if (isChangeset(newValue)) {
          // has the object itself been replaced?
          if (!isUnchanged(newValue.data, oldValue)) {
            allChanges.push({
              key: `${i}`,
              value: newValue.content
            });
          }
          // now add any changes within the object
          let proxyChanges = newValue.changes;
          for (let change of proxyChanges) {
            allChanges.push({
              key: `${i}.${change.key}`,
              value: change.value
            });
          }
        } else {
          allChanges.push({
            key: i.toString(),
            value: newValue
          });
        }
      }
    }
    return allChanges; //.sort((a, b) => (a.key === b.key ? 0 : a.key < b.key ? -1 : 1));
  }

  private trigger(eventName: string, ...args: any[]): void {
    const notifier = this.notifierForEvent(eventName);
    if (notifier) {
      notifier.trigger(...args);
    }
  }

  private notifierForEvent(eventName: string): Notifier<any> {
    let notifiers = this.__eventedNotifiers;
    if (notifiers === undefined) {
      notifiers = this.__eventedNotifiers = new Map<string, Notifier<any>>();
    }

    if (!notifiers.has(eventName)) {
      notifiers.set(eventName, new Notifier());
    }

    let notifier = notifiers.get(eventName) as Notifier<any>;

    return notifier;
  }

  private options: ProxyOptions;
  private __originalContent: T;
  private __errors: Errors<any> = {};
  private __errorsCache: Errors<any> = {};
  private _runningValidations: RunningValidations = {};
  private __undoState?: T;
  private __changes?: T;
  private __eventedNotifiers?: Map<string, Notifier<any>>;
}
