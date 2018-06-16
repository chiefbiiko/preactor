var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var promisify = require('util').promisify

var _AsyncFunction = (async function () {}).constructor
// var _EventTarget = !process ? EventTarget : function Noop () {}

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

function Reactor (subject, eventName) {
  if (!(this instanceof Reactor)) return new Reactor(subject, eventName)
  EventEmitter.call(this)

  if ((subject instanceof Function) || (subject instanceof Promise)) {
    this._eventName = typeof eventName === 'string' ? eventName : 'resolved'
  } else if (typeof eventName === 'string') {
    this._eventName = eventName
  } else {
    throw new TypeError('event name string required')
  }

  this._errorName = 'error'
  this._emitData = this.emit.bind(this, this._eventName)
  this._emitError = this.emit.bind(this, this._errorName)

  if (problyEventEmitter(subject)) {
    this._subject = subject
  } else if (problyEventTarget(subject)) {
    subject.addListener = subject.addEventListener
    subject.removeListener = subject.removeEventListener
    this._subject = subject
  } else if (subject instanceof Promise) {
    this._subject = promiseToEmitter(subject, this._eventName, this._errorName)
  } else if (subject instanceof _AsyncFunction) {
    var promise = subject()
    this._subject = promiseToEmitter(promise, this._eventName, this._errorName)
  } else if (subject instanceof Function) {
    var promise = promisify(subject)()
    this._subject = promiseToEmitter(promise, this._eventName, this._errorName)
  } else {
    throw new TypeError('unsupported subject type')
  }

  this._subject.addListener(this._eventName, this._emitData)
  this._subject.addListener(this._errorName, this._emitError)
}

inherits(Reactor, EventEmitter)

Reactor.prototype.debounce = function debounce (ms, argumentReducer) {

}

Reactor.prototype.delay = function delay (ms, unref) {
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    var timeout = setTimeout(prevEmitData, ms, ...args)
    if (unref && timeout.unref) timeout.unref()
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Reactor.prototype.mask = function mask (mask) {

}

Reactor.prototype.max = function max (n) {

}

module.exports = Reactor
