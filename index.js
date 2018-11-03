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

var debug = function () {} // require('debug')('preactor')

function Preactor (subject, eventName, errorName) {
  if (!(this instanceof Preactor)) {
    return new Preactor(subject, eventName, errorName)
  }

  EventEmitter.call(this)

  this._transducers = []

  if (subject instanceof Promise) {
    this._eventName = typeof eventName === 'string' ? eventName : 'resolved'
  } else if (typeof eventName === 'string') {
    this._eventName = eventName
  } else {
    throw new TypeError('event name string required')
  }

  if (problyEventEmitter(subject)) {
    this._subject = subject
  } else if (problyEventTarget(subject)) {
    subject.addListener = subject.addEventListener
    subject.removeListener = subject.removeEventListener
    this._subject = subject
  } else if (subject instanceof Promise) {
    this._subject = promiseToEmitter(subject, this._eventName, errorName)
  } else {
    throw new TypeError('unsupported subject type')
  }

  if (typeof errorName === 'string') {
    this._subject.addListener(errorName, this.emit.bind(this, errorName))
  }

  this._emitData = this.emit.bind(this, this._eventName)
  this._subject.addListener(this._eventName, this._emitData)
  this._transducers.push(this._emitData)
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
  var self = this
  var count = 0
  var reducedArgs
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    debug('args', args)
    reducedArgs = argsReducer(reducedArgs, args)
    debug('reducedArgs', reducedArgs)
    count++
    if (!repeat && count === n) {
      self.removeListener(self._eventName, nextEmitData)
      prevEmitData(...reducedArgs)
    } else if (repeat && count % n === 0) {
      prevEmitData(...reducedArgs)
      reducedArgs = undefined
    }
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
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
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    if (self._interval) {
      reducedArgs = argsReducer(reducedArgs, args)
      debug('interval truthy reducedArgs', reducedArgs)
    } else {
      reducedArgs = argsReducer(reducedArgs, args)
      debug('interval falsey reducedArgs', reducedArgs)
      self._interval = setInterval(function () {
        debug('timeout reducedArgs', reducedArgs)
        prevEmitData(...(reducedArgs || []))
        reducedArgs = undefined
      }, ms)
      if (unref && self._interval.unref) self._interval.unref()
    }
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.accumulatePeriod =
  function accumulatePeriod (start, end, argsReducer) {
  throw new Error('not yet implemented')
  if (!isUint(start)) throw new TypeError('start is not an unsigned integer')
  if (!isUint(end)) throw new TypeError('end is not an unsigned integer')
  if (typeof argsReducer !== 'function') argsReducer = latestWin
  // ...
  var reducedArgs
  var self = this
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) { // TODO

  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.debounce = function debounce (ms, unref, argsReducer) {
  if (!isUint(ms)) throw new TypeError('ms is not an unsigned integer')
  debug('::debounce::')
  if (typeof unref === 'function') {
    argsReducer = unref
    unref = false
  }
  unref = !!unref
  argsReducer = typeof argsReducer === 'function' ? argsReducer : latestWin
  var reducedArgs
  var self = this
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    debug('nextEmitData', ...args)
    if (self._timeout) {
      debug('::timeout truthy::')
      reducedArgs = argsReducer(reducedArgs, args)
      debug('reducedArgs', ...reducedArgs)
      clearTimeout(self._timeout)
      self._timeout = null
    }
    debug('::fresh timeout::')
    reducedArgs = reducedArgs || args
    self._timeout = setTimeout(prevEmitData, ms, ...reducedArgs)
    if (unref && self._timeout.unref) self._timeout.unref()
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.delay = function delay (ms, unref) {
  if (!isUint(ms)) throw new TypeError('ms is not an unsigned integer')
  unref = !!unref
  var self = this
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    self._timeout = setTimeout(prevEmitData, ms, ...args)
    if (unref && self._timeout.unref) self._timeout.unref()
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.distinct = function distinct (pred) {
  if (typeof pred !== 'function') pred = naiveNeverBefore
  var accu = []
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    var distinct = pred(accu, args)
    debug('distinct', distinct)
    if (distinct) prevEmitData(...args)
    accu.push(args)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.filter = function filter (pred) {
  if (typeof pred !== 'function') throw new TypeError('pred is not a function')
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    if (pred(...args)) prevEmitData(...args)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.limit = function limit (n) {
  if (!isUint(n)) throw new TypeError('n is not an unsigned integer')
  var self = this
  var i = 0
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    if (i++ < n) prevEmitData(...args)
    else self.removeListener(self._eventName, nextEmitData)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.mask = function mask (mask, recycle) {
  if (!Array.isArray(mask)) throw new TypeError('mask is not an array')
  recycle = recycle !== false
  var self = this
  var i = -1
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    if (++i === mask.length && recycle) i = 0
    var cur = mask[i]
    if (cur) prevEmitData(...args)
    if (!cur && !recycle) self.removeListener(self._eventName, nextEmitData)
   }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.notWithin = function notWithin (start, end) {
  if (!isUint(start)) throw new TypeError('start is not an unsigned integer')
  else if (!isUint(end)) throw new TypeError('end is not an unsigned integer')
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    var now = Date.now()
    if (now < start || now > end) prevEmitData(...args)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.onlyWithin = function onlyWithin (start, end) {
  if (!isUint(start)) throw new TypeError('start is not an unsigned integer')
  else if (!isUint(end)) throw new TypeError('end is not an unsigned integer')
  var self = this
  var prevEmitData = this._transducers[this._transducers.length - 1]
  function nextEmitData (...args) {
    var now = Date.now()
    if (now >= start && now <= end) prevEmitData(...args)
    else if (now > end) self.removeListener(self._eventName, nextEmitData)
  }
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, nextEmitData)
  this._transducers.push(nextEmitData)
  return this
}

Preactor.prototype.clearOwnTimeout = function clearOwnTimeout () {
  clearTimeout(this._timeout)
  return this
}

Preactor.prototype.clearOwnInterval = function clearOwnInterval () {
  clearInterval(this._interval)
  return this
}

Preactor.prototype.reset = function reset (index) {
  if(!isUint(index)) throw new TypeError('index is not an unsigned integer')
  if (index >= this._transducers.length) throw new TypeError('invalid index')
  if (!this._transducers.length) return this
  var prevEmitData = this._transducers[this._transducers.length - 1]
  this._subject.removeListener(this._eventName, prevEmitData)
  this._subject.addListener(this._eventName, this._transducers[index])
  return this
}

Preactor.prototype.__defineGetter__('transducers', function () {
  return this._transducers
})

module.exports = Preactor
