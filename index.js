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

function Reactor (subject, feature) {
  if (!(this instanceof Reactor)) return new Reactor(subject, feature)
  EventEmitter.call(this)

  if (subject instanceof Function || subject instanceof Promise) {
    this._feature = 'resolved'
    this._failure = 'rejected'
  } else if (feature) {
    this._feature = feature
    this._failure = 'error'
  } else if (!feature) {
    throw new Error('feature (event or property name) required')
  }

  this._emitData = this.emit.bind(this, this._feature)
  this._emitError = this.emit.bind(this, this._failure)

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

  this._subject.addListener(this._feature, this._emitData)
  this._subject.addListener(this._failure, this._emitError)
}

inherits(Reactor, EventEmitter)

Reactor.prototype.delay = function (ms) {
  var prevEmitterFunction = this._emitData
  function nextEmitterFunction (...args) {
    setTimeout(prevEmitterFunction, ms, ...args)
  }
  this._subject.removeListener(this._feature, prevEmitterFunction)
  this._subject.addListener(this._feature, nextEmitterFunction)
  this._emitData = nextEmitterFunction
}

Reactor.prototype.max = function (n) {

}

module.exports = Reactor
