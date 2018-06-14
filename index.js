var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var promisify = require('util').promisify

var _AsyncFunction = (async function () {}).constructor

function promiseToEmitter (promise) { // require once published
  var emitter = new EventEmitter()
  promise
    .then(emitter.emit.bind(emitter, 'resolved'))
    .catch(emitter.emit.bind(emitter, 'rejected'))
  return emitter
}

function Reactor (subject, eventName) {
  if (!(this instanceof Reactor)) return new Reactor(subject, eventName)
  EventEmitter.call(this)

  if (subject instanceof EventEmitter) { // or DOM event emitter!
    this._subject = subject
  } else if (subject instanceof Promise) {
    this._subject = promiseToEmitter(subject)
  } else if (subject instanceof _AsyncFunction) {
    this._subject = promiseToEmitter(subject())
  } else if (subject instanceof Function) {
    this._subject = promiseToEmitter(promisify(subject)())
  } else {
    throw new Error('unsupported subject type')
  }

  if (subject instanceof Function || subject instanceof Promise) {
    this._eventName = eventName || 'resolved'
  } else if (eventName) {
    this._eventName = eventName
  } else if (!eventName) {
    throw new Error('event name required')
  }

  this._failure = 'error'
  this._emitData = this.emit.bind(this, this._eventName)
  this._emitError = this.emit.bind(this, this._failure)
  this._subject.addListener(this._eventName, this._emitData)
  this._subject.addListener(this._failure, this._emitError)
}

inherits(Reactor, EventEmitter)

Reactor.prototype.debounce = function (ms, argumentReducer) {
  
}

Reactor.prototype.delay = function (ms) {
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    setTimeout(prevEmitData, ms, ...args)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
}

Reactor.prototype.mask = function (mask) {

}

Reactor.prototype.max = function (n) {

}

module.exports = Reactor
