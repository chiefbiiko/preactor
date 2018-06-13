var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

function Reactor (subject, feature) {
  if (!(this instanceof Reactor)) return new Reactor(subject, feature)
  EventEmitter.call(this)

  this._subject = subject
  this._feature = feature
  this._emitData = this.emit.bind(this, feature)
  this._emitError = this.emit.bind(this, 'error')

  if (this._subject instanceof EventEmitter) {
    // or DOM event emitter!
    this._subject.addListener(feature, this._emitData)
    this._subject.addListener('error', this._emitError)
  } else if (this._subject instanceof Promise) {
    // or if Promise: promiseToEmitter, listen to rejected instead of error

  } else { // setup setter and constructor traps with the Proxy API

  }
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

Reactor.prototype.ntimes = function (n) {

}

module.exports = Reactor
