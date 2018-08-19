# preactor

[![build status](http://img.shields.io/travis/chiefbiiko/preactor.svg?style=flat)](http://travis-ci.org/chiefbiiko/preactor) [![AppVeyor Build Status](https://ci.appveyor.com/api/projects/status/github/chiefbiiko/preactor?branch=master&svg=true)](https://ci.appveyor.com/project/chiefbiiko/preactor) [![Security Responsible Disclosure](https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg)](./security.md)

***

`preactor` allows to develop event-heavy and reactive applications in a seemless manner. Its manifestation, the `Preactor` type, an `EventEmitter`, has a variety of methods for manipulating the process of an event being emitted. All `Preactor.prototype` methods may be called *transducers*.

***

## Get it!

```
npm install --save preactor
```

***

## Usage

Wrap any `EventEmitter`, `EventTarget`, or `Promise` instance with the `Preactor` type, then manipulate its events with the various `Preactor` prototype methods, *transducers*.

Note that all transducers return `this`, meaning you can simply chain them, allowing for straight-forward event processing.

The example below is for a browser context. Run `npm run demo`, hit `localhost:9966` with a browser, and type sth into the input field.

``` js
var preactor = require('preactor')

window.onload = function () {
  var input = document.createElement('input')
  input.placeholder = 'type 2 c keyup debounce'

  preactor(input, 'keyup')
    .debounce(1000)
    .on('keyup', function (e) {
      alert('debounced:: ' + e.target.value)
    })

  document.body.appendChild(input)
}
```

***

## API

### `new Preactor(emitter, eventName[, errorName])`

Create a `preactor` that wraps an `EventEmitter`, `EventTarget` or `Promise`.

For those that don't like `new`:

`preactor(emitter, eventName[, errorName])`

The returned `Preactor` instance itself is just a simple `EventEmitter`. Passing `eventName` is required for all input emitters that are not a `Promise`. For a `Promise` `eventName` defaults to `'resolved'`, whereas `errorName` defaults to `'rejected'`. When wrapping an `EventEmitter` or `EventTarget` `eventName` is required and indicates the event to preact upon, whereas `errorName` is optional and indicates the name of the event that signals failure. Specifying `errorName` allows to listen for errors directly on the preactor instance as it simply forwards failures of its wrapped subject.

### `Preactor.prototype.accumulate(n[, repeat][, argsReducer])`

Accumulate `n` emits of the preactor's event using `argsReducer` to handle the propagation of arguments. `n` must be an unsigned integer, `repeat` a boolean, and `argsReducer` a function. The latter must have arity two, take two arrays as inputs, whereby the first parameter should have a default argument, i.e. `argsReducer(a = [], b)`, and return an array. `argsReducer` defaults to a *latestWin* implementation. `repeat` indicates whether to repeat accumulation or only accumulate the first `n` emits, defaults to `false`.

### `Preactor.prototype.accumulateInterval(ms[, unref][, argsReducer])`

Accumulate emits of the preactor's event within a recurring interval. `ms` must be an unsigned integer and indicates the interval duration. `unref` must be a boolean and indicates whether to call `Timeout.prototype.unref` in a node context, defaults to `false`. `argsReducer` should be a function and defaults to a *latestWin* implementation. It must have arity two, take two arrays as inputs, whereby the first parameter should have a default argument, i.e. `argsReducer(a = [], b)`, and return an array.

### `Preactor.prototype.debounce(ms[, unref][, argsReducer])`

Debounces the preactor's event by `ms`. Unreference internal timers by passing a truthy non-function second argument which defaults to `false`. If passed `argsReducer` must be a function and defaults to a *latestWin* implementation. It must have arity two, take two arrays as inputs, whereby the first parameter should have a default argument, i.e. `argsReducer(a = [], b)`, and return an array.

### `Preactor.prototype.delay(ms[, unref])`

Delay events by `ms`. Pass `unref` truthy and the internal timers will be unreferenced, defaults to `false`.

### `Preactor.prototype.distinct(pred)`

Only allow emits that pass a predicate test. `pred` must be a function and defaults to a *naiveNeverBefore* implementation. It must have arity two, take two arrays as inputs, whereby the first parameter should have a default argument, i.e. `pred(accu = [], args)`, and return a boolean.

### `Preactor.prototype.limit(n)`

Limit the number of emits of this preactor instance to `n`.

### `Preactor.prototype.mask(mask, recycle)`

Cpntrol whether a `Preactor` instance reemits its emitter's events according to a boolean sequence. `mask` must be an array, which is used as a boolean schedule that indicates whether to or not have the preactor reemit its emitter's events. `recycle` indicates whether the preactor should repeat reemitting events according to `mask` or to have it stop reemitting for good.

### **_tbc_**

***

## License

[MIT](./license.md)
