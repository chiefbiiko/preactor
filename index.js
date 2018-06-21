var { EventEmitter } = require('events')
var { inherits } = require('util')
var {
  isUint,
  latestWin,
  naiveNeverBefore,
  problyEventEmitter,
  problyEventTarget,
  promiseToEmitter
} = require('./utils.js')

var debug = require('debug')('preactor')

function Preactor (subject, eventName) {
  if (!(this instanceof Preactor)) return new Preactor(subject, eventName)
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

inherits(Preactor, EventEmitter)

Preactor.prototype.accumulate = function accumulate (n, repeat, argsReducer) {
  if (!isUint(n)) throw new TypeError('n is not an unsigned integer')
  if (typeof repeat === 'function') {
    argsReducer = repeat
    repeat = false
  } else if (typeof argsReducer !== 'function') {
    argsReducer = latestWin
  }
  repeat = !!repeat
  var count = 0
  var reducedArgs
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    debug('args', args)
    reducedArgs = argsReducer(reducedArgs, args)
    debug('reducedArgs', reducedArgs)
    count++
    if (!repeat && count === n) {
      // unregisterin?
      prevEmitData(...reducedArgs)
    } else if (count % n === 0) {
      prevEmitData(...reducedArgs)
      reducedArgs = undefined
    }
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Preactor.prototype.accumulateInterval =
  function accumulateInterval (ms, unref, argsReducer) {
  if (!isUint(ms)) throw new TypeError('ms is not an unsigned integer')
  if (typeof unref === 'function') {
    argsReducer = unref
    unref = false
  } else if (typeof argsReducer !== 'function') {
    argsReducer = latestWin
  }
  unref = !!unref
  var reducedArgs
  var self = this
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    debug('nextEmitData args', ...args)
    if (self._interval) {
      reducedArgs = argsReducer(reducedArgs, args)
      debug('reducedArgs', reducedArgs)
    } else {
      reducedArgs = argsReducer(reducedArgs, args)
      self._interval = setInterval(function () {
        prevEmitData(...reducedArgs)
      }, ms)
      if (unref && self._interval.unref) self._interval.unref()
    }
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Preactor.prototype.accumulatePeriod =
  function accumulatePeriod (start, end, argsReducer) {

}

Preactor.prototype.clearOwnTimeout = function clearOwnTimeout () {
  clearTimeout(this._timeout)
  return this
}

Preactor.prototype.clearOwnInterval = function clearOwnInterval () {
  clearInterval(this._interval)
  return this
}

Preactor.prototype.debounce = function debounce (ms, unref, argsReducer) {
  if (!isUint(ms)) throw new TypeError('ms is not an unsigned integer')
  if (typeof unref === 'function') {
    argsReducer = unref
    unref = false
  }
  unref = !!unref
  argsReducer = typeof argsReducer === 'function' ? argsReducer : latestWin
  debug('::debounce::')
  var reducedArgs
  var self = this
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    debug('nextEmitData', ...args)
    if (self._timeout) {
      debug('::timeout truthy::')
      reducedArgs = argsReducer(reducedArgs, args)
      debug('reducedArgs', ...reducedArgs)
      clearTimeout(self._timeout)
      self._timeout = null
    }
    debug('::timeout falsey::')
    reducedArgs = reducedArgs || args
    self._timeout = setTimeout(prevEmitData, ms, ...reducedArgs)
    if (unref && self._timeout.unref) self._timeout.unref()
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Preactor.prototype.delay = function delay (ms, unref) {
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

Preactor.prototype.distinct = function distinct (predicateFunc) {
  if (typeof predicateFunc !== 'function') predicateFunc = naiveNeverBefore
  var accu = []
  var prevEmitData = this._emitData
  function nextEmitData (...args) {
    var pred = predicateFunc(accu, args)
    debug('pred', pred)
    if (pred) prevEmitData(...args)
    accu.push(args)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._emitData = nextEmitData
  return this
}

Preactor.prototype.limit = function limit (n) {
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

Preactor.prototype.mask = function mask (mask, recycle) {
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

Preactor.prototype.notWithin = function notWithin (start, end) {
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

Preactor.prototype.onlyWithin = function onlyWithin (start, end) {
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

module.exports = Preactor
