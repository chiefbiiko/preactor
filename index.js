var { EventEmitter } = require('events')
var { inherits } = require('util')
var {
  isUint,
  latestWin,
  problyEventEmitter,
  problyEventTarget,
  promiseToEmitter
} = require('./utils.js')

var debug = require('debug')('reactor')

function Reactor (subject, eventName) {
  if (!(this instanceof Reactor)) return new Reactor(subject, eventName)
  EventEmitter.call(this)

  if (subject instanceof Promise) {
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
  } else {
    throw new TypeError('unsupported subject type')
  }

  this._subject.addListener(this._eventName, this._emitData)
  this._subject.addListener(this._errorName, this._emitError)
}

inherits(Reactor, EventEmitter)

Reactor.prototype.debounce = function debounce (ms, argsReducer) {
  if (!isUint(ms)) throw new TypeError('ms is not an unsigned integer')
  argsReducer = typeof argsReducer === 'function' ? argsReducer : latestWin
  debug('::debounce::')
  var prevEmitData = this._emitData
  var reducedArgs
  var timeout
  function nextEmitData (...args) {
    debug('nextEmitData', ...args)
    if (timeout) {
      debug('::timeout truthy::')
      reducedArgs = argsReducer(reducedArgs, args) // assure Array
      debug('reducedArgs', ...reducedArgs)
      clearTimeout(timeout)
      timeout = null
    }
    debug('::timeout falsey::')
    reducedArgs = reducedArgs || args
    timeout = setTimeout(prevEmitData, ms, ...reducedArgs)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Reactor.prototype.delay = function delay (ms, unref) {
  if (!isUint(ms)) throw new TypeError('ms is not an unsigned integer')
  unref = !!unref
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

Reactor.prototype.limit = function limit (n) {
  if (!isUint(n)) throw new TypeError('n is not an unsigned integer')
  var i = 0
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    if (i++ < n) prevEmitData(...args)
    else null // unregisterin?
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Reactor.prototype.mask = function mask (mask, recycle) {
  if (!Array.isArray(mask)) throw new TypeError('mask is not an array')
  recycle = recycle !== false
  var i = -1
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    if (++i === mask.length && recycle) i = 0
    var cur = mask[i]
    if (cur) prevEmitData(...args)
    if (!cur && !recycle) null // unregisterin?
   }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Reactor.prototype.notWithin = function notWithin (start, end) {
  if (!isUint(start)) throw new TypeError('start is not an unsigned integer')
  else if (!isUint(end)) throw new TypeError('end is not an unsigned integer')
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    var now = Date.now()
    if (now < start || now > end) prevEmitData(...args)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Reactor.prototype.onlyWithin = function onlyWithin (start, end) {
  if (!isUint(start)) throw new TypeError('start is not an unsigned integer')
  else if (!isUint(end)) throw new TypeError('end is not an unsigned integer')
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    var now = Date.now()
    if (now >= start && now <= end) prevEmitData(...args)
    else if (now > end) null // unregisterin?
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

module.exports = Reactor
