var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

function Reactor (subject, feature) {
  if (!(this instanceof Reactor)) return new Reactor(subject, feature)
  EventEmitter.call(this)

  this._subject = subject
  this._feature = feature
  this._emit = this.emit.bind(this, feature)

  if (this._subject instanceof EventEmitter) { // or DOM event emitter!
    this._subject.addListener(feature, this._emit)
  } else { // setup setter and constructor traps with the Proxy API

  }
}

inherits(Reactor, EventEmitter)

Reactor.prototype.delay = function (ms) {
  var prevEmitterFunction = this._emit
  function nextEmitterFunction (...args) {
    setTimeout(prevEmitterFunction, ms, ...args)
  }
  this._subject.removeListener(this._feature, prevEmitterFunction)
  this._subject.addListener(this._feature, nextEmitterFunction)
  this._emit = nextEmitterFunction
}

Reactor.prototype.ntimes = function (n) {

}

module.exports = Reactor
