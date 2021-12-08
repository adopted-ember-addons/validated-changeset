import { DEBUG } from './consts';

export default function assert(msg: string, property: unknown): void {
  if (DEBUG) {
    if (!property) {
      throw new Error(msg);
    }
  }
}
