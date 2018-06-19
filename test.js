var tape = require('tape')
var EventEmitter = require('events').EventEmitter
var Reactor = require('./index')

function makePromise (value) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, 100, value)
  })
}

tape('simple transducer - Reactor.prototype.delay', function (t) {
  var emitter = new EventEmitter()
  var reactor = new Reactor(emitter, 'fraud')
  var reacted = false

  reactor.delay(1000)
  reactor.once('fraud', function () {
    reacted = true
  })

  emitter.emit('fraud')
  t.false(reacted, 'not reacted yet')

  setTimeout(function () {
    t.false(reacted, 'still not reacted')
  }, 419)
  setTimeout(function () {
    t.false(reacted, 'still still not reacted')
  }, 750)
  setTimeout(function () {
    t.true(reacted, 'delayed reaction')
    t.end()
  }, 1019)
})

tape('always passin error events', function (t) {
  t.timeoutAfter(100)
  var emitter = new EventEmitter()
  var reactor = new Reactor(emitter, 'fraud')
  reactor.delay(1000) // transducers cannot alter 'error' emit processes

  reactor.once('error', function onceError (err) {
    t.pass('got the error passed thru instantly')
    t.end()
  })

  emitter.emit('error')
})

tape('takin a promise', function (t) {
  var reactor = new Reactor(makePromise(419))
  reactor.once('resolved', function (motto) {
    t.is(motto, 419, 'all we do is ' + motto)
    t.end()
  })
})

tape('passin a promise and a custom resolved-event name', function (t) {
  var reactor = new Reactor(makePromise(Infinity), 'customResolvedEventName')
  reactor.once('customResolvedEventName', function (balance) {
    t.is(balance, Infinity, 'balance is ' + balance)
    t.end()
  })
})

tape('transducer chainin', function (t) {
  var reacted = false
  var emitter = new EventEmitter()

  new Reactor(emitter, 'fraud')
    .delay(36)
    .delay(44)
    .once('fraud', function () {
      reacted = true
    })

  emitter.emit('fraud')
  t.false(reacted, 'not reacted yet')

  setTimeout(function () {
    t.false(reacted, 'still not reacted')
  }, 50)
  setTimeout(function () {
    t.true(reacted, 'reactor reacted')
    t.end()
  }, 100)
})

tape('throws on missing event name with event emitters', function (t) {
  t.throws(function () {
    new Reactor(new EventEmitter())
  }, TypeError, 'event name string required')
  t.end()
})

tape('throws on non-async subject', function (t) {
  t.throws(function () {
    new Reactor(419, 'fraud')
  }, TypeError, 'unsupported subject type')
  t.end()
})

tape('maskin with Reactor.prototype.mask', function (t) {
  var emitter = new EventEmitter()
  var called = 0

  new Reactor(emitter, 'masked')
    .mask([ 0, 1 ], false)
    .on('masked', function (num) {
      called++
      t.is(num, 2, 'only got the second emit')
      t.end()
    })

  emitter.emit('masked', 1)
  emitter.emit('masked', 2)
})

tape('maskin with recyclin via Reactor.prototype.mask', function (t) {
  var emitter = new EventEmitter()
  var called = 0

  new Reactor(emitter, 'masked')
    .mask([ false, true ], true)
    .on('masked', function (num) {
      called++
      if (called === 1) {
        t.is(num, 2, 'got the second emit...')
      } else if (called === 2) {
        t.is(num, 4, '...and got the fourth emit')
        t.end()
      }
    })

  emitter.emit('masked', 1)
  emitter.emit('masked', 2)
  emitter.emit('masked', 3)
  emitter.emit('masked', 4)
})

tape('maskin incorrectly with Reactor.prototype.mask', function (t) {
  var emitter = new EventEmitter()
  var reactor = new Reactor(emitter, 'masked')
  t.throws(function () {
    reactor.mask({ 1: true, 2: false })
  }, TypeError, 'mask is not an array')
  t.end()
})

tape('maxin with Reactor.prototype.max', function (t) {
  t.plan(3)
  var emitter = new EventEmitter()
  var reactor = new Reactor(emitter, 'maxed')
  var count = 0, i = 0

  reactor
    .max(3)
    .on('maxed', function () {
      t.pass('got the listener called')
    })

  emitter.emit('maxed')
  emitter.emit('maxed')
  emitter.emit('maxed')
  emitter.emit('maxed')
  emitter.emit('maxed')
})

tape('errorin pt 1 with Reactor.prototype.max', function (t) {
  t.throws(function () {
    new Reactor(new EventEmitter(), 'maxed')
      .max('5')
  }, TypeError, 'n is not an unsigned integer')
  t.end()
})

tape('errorin pt 2 with Reactor.prototype.max', function (t) {
  t.throws(function () {
    new Reactor(new EventEmitter(), 'maxed')
      .max(NaN)
  }, TypeError, 'n is not an unsigned integer')
  t.end()
})

tape('debouncin with Reactor.prototype.debounce', function (t) {
  var emitter = new EventEmitter()
  var reactor = new Reactor(emitter, 'debounced')
  var gotCalled = false

  function argumentReducer (prevArgs = [ 0, '' ], nextArgs) {
    return [ prevArgs[0] + nextArgs[0], prevArgs[1] + nextArgs[1] ]
  }

  reactor
    .debounce(100, argumentReducer)
    .on('debounced', function (reducedNumber, reducedString) {
      gotCalled = true
      t.is(reducedNumber, 686, 'reducedNumber is ' + reducedNumber)
      t.is(reducedString, 'acab', 'reducedString is ' + reducedString)
      t.end()
    })

  emitter.emit('debounced', 36, 'a')
  emitter.emit('debounced', 44, 'c')
  emitter.emit('debounced', 187, 'a')
  emitter.emit('debounced', 419, 'b')

  t.false(gotCalled, 'did not get called yet')
  setTimeout(function () {
      t.false(gotCalled, 'did not get called yet yet')
  }, 50)
  setTimeout(function () {
      t.false(gotCalled, 'did not get called yet yet yet')
  }, 75)
})

tape('within - Reactor.prototype.within', function (t) {
  t.plan(9)
  var emitter = new EventEmitter()
  var reactor = new Reactor(emitter, 'within')
  var start = Date.now()
  var end = start + 1000 // +1s

  reactor
    .within(start, end)
    .on('within', function (number) {
      t.is(number, 1, 'number ' + number)
      t.ok(Date.now() >= start, 'gte start')
      t.ok(Date.now() <= end, 'lte end')
    })

  emitter.emit('within', 1)
  emitter.emit('within', 1)
  emitter.emit('within', 1)
  setTimeout(function () {
    emitter.emit('within')
  }, 1050)
})
