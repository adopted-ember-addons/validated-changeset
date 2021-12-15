import { bind } from 'bind-decorator';
import { Notifier } from '../..';
import {
  Errors,
  IChangeset,
  PrepareChangesFn,
  PublicErrors,
  RunningValidations
} from '../../../types';
import { CHANGESET } from '../../../utils/is-changeset';
import { DEBUG } from '../../utils/consts';
import handlerFor from '../../utils/handler-for';
import isUnchanged from '../../utils/is-unchanged';
import requiresProxying from '../../utils/requires-proxying';
import { AFTER_ROLLBACK_EVENT } from '../../utils/strings';
import IChangesetProxyHandler from './changeset-proxy-handler-interface';
import ProxyOptions from './proxy-options';
import { DeleteOnUndo, ObjectReplaced, ProxyArrayValueKey } from './proxy-symbols';

type Input = any[];

const NoValidation = false;

interface EventedCallback {
  (args: any[]): void;
}

export default class ChangesetArrayProxyHandler implements IChangesetProxyHandler {
  constructor(source: any[], options: ProxyOptions) {
    this.options = options;
    this.__data = source;
    if (this.options.getMap) {
      this.__nestedProxies = this.options.getMap();
    } else {
      this.__nestedProxies = new Map<string | number, IChangeset>();
    }
  }

  private publicApiMethods = new Map<string, Function>([
    ['cast', this.cast],
    ['execute', this.execute],
    ['get', this.getValue],
    ['rollback', this.rollback],
    ['save', this.save],
    ['set', this.setValue],
    ['unexecute', this.unexecute],
    ['unwrap', this.unwrap],
    ['validate', this.validate]
  ]);

  private publicApiProperties = new Map<string, Function>([
    ['__changeset__', () => CHANGESET],
    ['change', () => this.change],
    ['changes', () => this.changes],
    ['data', () => this.data],
    ['isChangeset', () => true],
    ['isDirty', () => this.isDirty],
    ['isInvalid', () => !this.isValid],
    ['isPristine', () => !this.isDirty],
    ['isValid', () => this.isValid],
    ['pendingData', () => this.pendingData]
  ]);

  public get(_target: any[], key: string): any {
    // extra stuff
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
        return this.writeArray[key];
    }
    if (typeof (this.readArray as Record<string, any>)[key] === 'function') {
      return (this.readArray as Record<string, any>)[key];
    }
    switch (key) {
      case 'length':
        return this.readArray[key];
    }
    if (this.publicApiMethods.has(key)) {
      return this.publicApiMethods.get(key);
    }
    if (this.publicApiProperties.has(key)) {
      let getter = this.publicApiProperties.get(key) as Function;
      return getter();
    }

    return this.getValue(key);
  }

  public set(_target: any[], key: string, value: any): any {
    return this.setValue(key, value);
  }

  public readonly isChangeset = true;

  public get data(): any[] {
    return this.__data;
  }

  public get isDirty(): boolean {
    // we're dirty if either we have top level changes
    // or if a nested proxy is dirty
    return this.__proxyArray !== undefined;
  }

  public get isPristine(): boolean {
    return this.__proxyArray === undefined;
  }

  public get isInvalid(): boolean {
    return !this.isValid;
  }

  public get isValid(): boolean {
    // TODO: validate this level

    // now look at all the nested proxies
    for (let proxy of this.__nestedProxies.values()) {
      if (!proxy.isValid) {
        return false;
      }
    }
    return true;
  }

  public get pendingData(): { [index: string]: any } {
    let result = {
      ProxyArrayValueKey: this.readArray
    };
    return result;
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

  @bind
  public isValidating(key: string | void): boolean {
    let runningValidations: RunningValidations = this._runningValidations;
    let ks: string[] = Object.keys(runningValidations);
    if (key) {
      return ks.includes(key);
    }
    return ks.length > 0;
  }

  @bind
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

  @bind
  public at(index: number) {
    // is it an existing proxy?
    if (this.__nestedProxies.has(index)) {
      // todo deal with the length of the array changing
      return this.__nestedProxies.get(index);
    } else {
      return this.readArray[index];
    }
  }

  @bind
  cast() {
    // noop
  }

  @bind
  public getValue(key: string | symbol) {
    if (typeof key === 'symbol') {
      return undefined;
    }
    // to be backwards compatible we support getting properties by the get function
    if (this.publicApiProperties.has(key)) {
      let getter = this.publicApiProperties.get(key) as Function;
      return getter();
    }
    // it wasn't in there so look in our contents
    return this.readArray[parseInt(key)];
  }

  private get readArray(): any[] {
    return this.__proxyArray === undefined ? this.__data : this.__proxyArray;
  }

  private get writeArray(): any[] {
    if (this.__proxyArray === undefined) {
      this.__proxyArray = [];
    }
    return this.__proxyArray as any[];
  }

  @bind
  public setValue(key: string, value: any, _validate = true): boolean {
    if (DEBUG) {
      if (this.publicApiMethods.has(key) || this.publicApiProperties.has(key)) {
        throw `changeset.${key} is a readonly property of the changeset`;
      }
    }
    // this is a change at our level
    // check the changeset key filter
    const index = parseInt(key);
    if (requiresProxying(value)) {
      value = this.addProxy(index, value);
      // remove a tracked value if there was one with the same key
      this.markChange(index, ObjectReplaced);
    } else {
      // the value is a plain value
      this.markChange(index, value);
      // remove a proxy if there was one with the same key
      if (this.__nestedProxies.has(index)) {
        this.__nestedProxies.delete(index);
      }
    }
    return true;
  }

  private addProxy(index: number, value?: {}): any {
    // get sends just the key
    // set sends the key and the new value
    if (value === undefined) {
      // use the original
      value = this.__data[index];
    }
    if (value === undefined) {
      // missing on original but added in the changeset
      value = {};
    }
    let proxy = new Proxy(value, handlerFor(value, this.options)) as IChangeset;
    this.__nestedProxies.set(index, proxy);
    return proxy;
  }

  markChange(index: number, value: any) {
    // have to use get() here because source might be an EmberProxy
    const oldValue = this.__data[index];
    const unchanged = isUnchanged(value, oldValue);
    let changes = this.__changes;
    if (changes.has(index)) {
      // we have a pending change
      // modify it or delete
      if (unchanged) {
        // we're back to the original value
        // so delete the change
        changes.delete(index);
      } else {
        // we know the key exists so the cast is safe
        changes.set(index, value);
      }
    } else if (!unchanged) {
      // create a new pending change
      changes.set(index, value);
    }
  }

  @bind
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

  @bind
  public execute(): this {
    // apply the changes to the source
    // but keep the changes for undo later
    if (this.isDirty) {
      this.__undoState = this.__data.concat([]); // copy the array;
      if (this.__proxyArray && this.isValid) {
        this.replaceSourceWith(this.__proxyArray);
      }
    }
    return this;
  }

  @bind
  on(eventName: string, callback: EventedCallback) {
    const notifier = this.notifierForEvent(eventName);
    return notifier.addListener(callback);
  }

  @bind
  off(eventName: string, callback: EventedCallback) {
    const notifier = this.notifierForEvent(eventName);
    return notifier.removeListener(callback);
  }

  @bind
  public unwrap(): this {
    // deprecated
    return this;
  }

  @bind
  public unexecute(): this {
    // apply the undo state from the bottom up
    for (let proxy of this.__nestedProxies.values()) {
      proxy.unexecute();
    }

    if (this.__undoState) {
      let oldStates = [...this.__undoState.entries()];
      for (let [key, value] of oldStates) {
        if (value === DeleteOnUndo) {
          delete this.__data[key];
        } else {
          this.__data[key] = value;
        }
      }
    }
    // clear the undo state
    this.__undoState = undefined;
    return this;
  }

  @bind
  public async save(_options?: object): Promise<this | any> {
    this.execute();
    this.clearPending();
    return this;
  }

  private arrayStorageFor(source: any[]): any[] {
    if (this.options.getArrayStorage) {
      return this.options.getArrayStorage(source);
    }
    return source;
  }

  private clearPending() {
    this.__nestedProxies.clear();
    this.__proxyArray = undefined;
    this.__undoState = undefined;
  }

  @bind
  public rollbackProperty(_key: string): this {
    // doesn't mean anything for arrays
    this.trigger(AFTER_ROLLBACK_EVENT);
    return this;
  }

  @bind
  public rollback(): void {
    // apply the undo state
    if (this.__undoState) {
      this.replaceSourceWith(this.__undoState);
    }
    this.clearPending();
  }

  replaceSourceWith(newArray: any[]) {
    this.__data.splice(0, this.__data.length, newArray);
  }

  @bind
  public async validate(..._validationKeys: string[]): Promise<void> {}

  public get change(): { [index: string]: any } | any[] {
    if (this.__proxyArray !== undefined) {
      return this.__proxyArray;
    }
    return {};
  }

  // private get localChange(): { [index: string]: any; } | any[]  {
  //   // only the changes at this level and not the nested content
  //   if (this.__proxyArray !== undefined) {
  //     return this.__proxyArray;
  //   }
  //   return {};
  // }

  public get changes(): { key: string; value: any }[] {
    if (this.__proxyArray !== undefined) {
      return [
        {
          key: ProxyArrayValueKey,
          value: this.__proxyArray
        }
      ];
    }
    return [];
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
  private __data: any[];
  private __errors: Errors<any> = {};
  private __errorsCache: Errors<any> = {};
  private __proxyArray?: any[];
  private _runningValidations: RunningValidations = {};
  private __undoState?: any[];
  private __changes!: Map<number, any>;
  private __nestedProxies: Map<string | number, IChangeset>;
  private __eventedNotifiers?: Map<string, Notifier<any>>;
}
