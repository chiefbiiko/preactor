var EventEmitter = require('events').EventEmitter

function isUint (x) {
  return typeof x === 'number' && !Number.isNaN(x) && x % 1 === 0 && x >= 0
}

function latestWin (prev, args) {
  return args
}

function naiveNeverBefore (accu, args) {
  return !accu.some(function (prevArgs) {
    return prevArgs.every(function (prevArg, i) {
      return prevArg === args[i]
    })
  })
}

function promiseToEmitter (promise, eventName, errorName) { // require once pub
  var emitter = new EventEmitter()
  promise
    .then(emitter.emit.bind(emitter, eventName || 'resolved'))
    .catch(emitter.emit.bind(emitter, errorName || 'rejected'))
  return emitter
}

function problyEventEmitter (x) {
  return x &&
    typeof x.addListener === 'function' &&
    typeof x.removeListener === 'function' &&
    typeof x.emit === 'function'
}

function problyEventTarget (x) {
  return x &&
    typeof x.addEventListener === 'function' &&
    typeof x.removeEventListener === 'function' &&
    typeof x.dispatchEvent === 'function'
}

module.exports = {
  isUint,
  latestWin,
  naiveNeverBefore,
  problyEventEmitter,
  problyEventTarget,
  promiseToEmitter
}
