var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

function Reactor (subject, feature) {
  if (!(this instanceof Reactor)) return new Reactor(subject, feature)
  EventEmitter.call(this)

  this._subject = subject
  this._emit = this.emit.bind(this, feature)
  this._emit._isReactorEmitterFunction = true // marking the internal handler

  if (this._subject instanceof EventEmitter) { // or DOM event emitter!
    this._subject.addEventListener(feature, this._emit.bind(this))
  } else { // setup setter and constructor traps with the Proxy API

  }
}

inherits(Reactor, EventEmitter)

Reactor.prototype.delay = function (ms) {
  // replace subject's registered listener._isReactorEmitterFunction with
  // a composite function that incorporates the previous listener

}

Reactor.prototype.ntimes = function (n) {

}

module.exports = Reactor
