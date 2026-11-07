// Global polyfills for modern JavaScript methods that may be absent in Hermes/React Native engines
/* eslint-disable no-extend-native */

if (!Array.prototype.findLast) {
  Object.defineProperty(Array.prototype, 'findLast', {
    value: function (predicate: (value: any, index: number, obj: any[]) => boolean, thisArg?: any) {
      if (this == null) throw new TypeError('Array.prototype.findLast called on null or undefined');
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) {
          return this[i];
        }
      }
      return undefined;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (!Array.prototype.findLastIndex) {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    value: function (predicate: (value: any, index: number, obj: any[]) => boolean, thisArg?: any) {
      if (this == null) throw new TypeError('Array.prototype.findLastIndex called on null or undefined');
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) {
          return i;
        }
      }
      return -1;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value: function (n: number) {
      if (this == null) throw new TypeError('Array.prototype.at called on null or undefined');
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (!String.prototype.at) {
  Object.defineProperty(String.prototype, 'at', {
    value: function (n: number) {
      if (this == null) throw new TypeError('String.prototype.at called on null or undefined');
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function () {
      if (this == null) throw new TypeError('Array.prototype.toReversed called on null or undefined');
      return [...this].reverse();
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (!Array.prototype.toSorted) {
  Object.defineProperty(Array.prototype, 'toSorted', {
    value: function (compareFn?: (a: any, b: any) => number) {
      if (this == null) throw new TypeError('Array.prototype.toSorted called on null or undefined');
      return [...this].sort(compareFn);
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

export {};
