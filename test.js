var tape = require('tape')
var EventEmitter = require('events').EventEmitter
var Preactor = require('./index.js')

function makePromise (value) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, 100, value)
  })
}

tape('simple transducer - Preactor.prototype.delay', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'fraud')
  var reacted = false

  preactor.delay(1000)
  preactor.once('fraud', function () {
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

tape('errorin with Preactor.prototype.delay', function (t) {
  t.throws(function () {
    new Preactor(new EventEmitter(), 'noop')
      .delay(-1)
  }, TypeError, 'ms is not an unsigned integer')
  t.end()
})

tape('gettin error events', function (t) {
  t.timeoutAfter(100)
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'fraud', 'error')
  preactor.delay(1000) // transducers cannot alter error emit processes

  preactor.once('error', function onceError (err) {
    t.same(err.constructor, Error, 'err')
    t.pass('got the error passed thru instantly')
    t.end()
  })

  emitter.emit('error', new Error('errmsg'))
})

tape('takin a promise', function (t) {
  var preactor = new Preactor(makePromise(419))
  preactor.once('resolved', function (motto) {
    t.is(motto, 419, 'all we do is ' + motto)
    t.end()
  })
})

tape('passin a promise and a custom resolved-event name', function (t) {
  var preactor = new Preactor(makePromise(Infinity), 'customResolvedEventName')
  preactor.once('customResolvedEventName', function (balance) {
    t.is(balance, Infinity, 'balance is ' + balance)
    t.end()
  })
})

tape('transducer chainin', function (t) {
  var reacted = false
  var emitter = new EventEmitter()

  new Preactor(emitter, 'fraud')
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
    t.true(reacted, 'preactor reacted')
    t.end()
  }, 100)
})

tape('throws on missing event name with event emitters', function (t) {
  t.throws(function () {
    new Preactor(new EventEmitter())
  }, TypeError, 'event name string required')
  t.end()
})

tape('throws on anti-emitter', function (t) {
  t.throws(function () {
    new Preactor(419, 'fraud')
  }, TypeError, 'unsupported subject type')
  t.end()
})

tape('maskin with Preactor.prototype.mask', function (t) {
  var emitter = new EventEmitter()
  var called = 0

  new Preactor(emitter, 'masked')
    .mask([ 0, 1 ], false)
    .on('masked', function (num) {
      called++
      t.is(num, 2, 'only got the second emit')
      t.end()
    })

  emitter.emit('masked', 1)
  emitter.emit('masked', 2)
})

tape('maskin with recyclin via Preactor.prototype.mask', function (t) {
  var emitter = new EventEmitter()
  var called = 0

  new Preactor(emitter, 'masked')
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

tape('maskin incorrectly with Preactor.prototype.mask', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'masked')
  t.throws(function () {
    preactor.mask({ 1: true, 2: false })
  }, TypeError, 'mask is not an array')
  t.end()
})

tape('limitin with Preactor.prototype.limit', function (t) {
  t.plan(3)
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'limited')
  var count = 0, i = 0

  preactor
    .limit(3)
    .on('limited', function () {
      t.pass('got the listener called')
    })

  emitter.emit('limited')
  emitter.emit('limited')
  emitter.emit('limited')
  emitter.emit('limited')
  emitter.emit('limited')
})

tape('errorin pt 1 with Preactor.prototype.limit', function (t) {
  t.throws(function () {
    new Preactor(new EventEmitter(), 'limited')
      .limit('5')
  }, TypeError, 'n is not an unsigned integer')
  t.end()
})

tape('errorin pt 2 with Preactor.prototype.limit', function (t) {
  t.throws(function () {
    new Preactor(new EventEmitter(), 'limited')
      .limit(NaN)
  }, TypeError, 'n is not an unsigned integer')
  t.end()
})

tape('debouncin with Preactor.prototype.debounce', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'debounced')
  var gotCalled = false

  function argumentReducer (prevArgs = [ 0, '' ], nextArgs) {
    return [ prevArgs[0] + nextArgs[0], prevArgs[1] + nextArgs[1] ]
  }

  preactor
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

tape('errorin with Preactor.prototype.debounce', function (t) {
  t.throws(function () {
    new Preactor(new EventEmitter(), 'noop')
     .debounce(-1)
  }, TypeError, 'ms is not an unsigned integer')
  t.end()
})

tape('Preactor.prototype.debounce - argsReducer default demo', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'debounced')
  var gotCalled = false

  preactor
    .debounce(100)
    .on('debounced', function (reducedNumber, reducedString) {
      t.is(reducedNumber, 187, 'reducedNumber is ' + reducedNumber)
      t.is(reducedString, 'c', 'reducedString is ' + reducedString)
      t.end()
    })

  emitter.emit('debounced', 36, 'a')
  emitter.emit('debounced', 44, 'b')
  emitter.emit('debounced', 187, 'c')
})

tape('onlyWithin - Preactor.prototype.onlyWithin', function (t) {
  t.plan(9)
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'onlyWithin')
  var start = Date.now()
  var end = start + 1000 // +1s

  preactor
    .onlyWithin(start, end)
    .on('onlyWithin', function (number) {
      t.is(number, 1, 'number ' + number)
      t.ok(Date.now() >= start, 'gte start')
      t.ok(Date.now() <= end, 'lte end')
    })

  emitter.emit('onlyWithin', 1)
  emitter.emit('onlyWithin', 1)
  emitter.emit('onlyWithin', 1)
  setTimeout(function () {
    emitter.emit('onlyWithin')
  }, 1050)
})

tape('notWithin - Preactor.prototype.notWithin', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'notWithin')
  var start = Date.now()
  var end = start + 1000 // +1s

  preactor
    .notWithin(start, end)
    .on('notWithin', function (number) {
      t.is(number, 419, 'number ' + number)
      t.end()
    })

  emitter.emit('notWithin', 1)
  emitter.emit('notWithin', 2)
  emitter.emit('notWithin', 3)
  setTimeout(function () {
    emitter.emit('notWithin', 419)
  }, 1050)
})

tape('default distinct - Preactor.prototype.distinct', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'distinct')
  var count = 0

  preactor
    .distinct()
    .on('distinct', function (number) {
      count++
      if (number === 3) {
        t.is(count, 3, 'only listener calls with distinct args get thru')
        t.end()
      }
    })

  emitter.emit('distinct', 1)
  emitter.emit('distinct', 1)
  emitter.emit('distinct', 2)
  emitter.emit('distinct', 3)
})

tape('distinct - Preactor.prototype.distinct', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'distinct')
  var count = 0

  function lookbackTwo (accu, args) {
    return !accu.slice(accu.length - 2).some(function (prevArgs) {
      return prevArgs.every(function (prevArg, i) {
        return prevArg === args[i]
      })
    })
  }

  preactor
    .distinct(lookbackTwo)
    .on('distinct', function (number) {
      count++
      if (number === 3) {
        t.is(count, 3, 'only listener calls with distinct args get thru')
        t.end()
      }
    })

  emitter.emit('distinct', 1)
  emitter.emit('distinct', 1)
  emitter.emit('distinct', 2)
  emitter.emit('distinct', 3)
})

tape('default accumulate - Preactor.prototype.accumulate', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'accumulate')
  var count = 0

  preactor
    .accumulate(2)
    .on('accumulate', function (reducedNumber) {
      t.is(reducedNumber, 1, 'reducedNumber is ' + reducedNumber)
      t.end()
    })

  emitter.emit('accumulate', 1)
  emitter.emit('accumulate', 1)
})

tape('custom argsReducer accumulate - Preactor.prototype.accumulate', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'accumulate')
  var count = 0

  function argsReducer (accu = [ 0 ], args) { // should set a default accu
    return [ accu[0] + args[0] ] // and return an array
  }

  preactor
    .accumulate(2, argsReducer)
    .on('accumulate', function (reducedNumber) {
      t.is(reducedNumber, 2, 'reducedNumber is ' + reducedNumber)
      t.end()
    })

  emitter.emit('accumulate', 1)
  emitter.emit('accumulate', 1)
})

tape('repeat accumulate - Preactor.prototype.accumulate', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'accumulate')
  var count = 0

  function argsReducer (accu = [ 0 ], args) { // should set a default accu
    return [ accu[0] + args[0] ] // and return an array
  }

  preactor
    .accumulate(2, true, argsReducer)
    .on('accumulate', function (reducedNumber) {
      count++
      if (count === 1) t.is(reducedNumber, 2, 'reducedNumber #1')
      if (count === 2) {
        t.is(reducedNumber, 2, 'reducedNumber #2')
        t.end()
      }
    })

  emitter.emit('accumulate', 1)
  emitter.emit('accumulate', 1)
  emitter.emit('accumulate', 1)
  emitter.emit('accumulate', 1)
})

tape('accu errors', function (t) {
  t.throws(function () {
      new Preactor(new EventEmitter(), 'noop')
        .accumulate(NaN)
  }, TypeError, 'n is not an unsigned integer')
  t.end()
})

tape('Preactor.prototype.accumulateInterval - defaults', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'accuInterval')
  var count = 0

  preactor
    .accumulateInterval(50)
    .on('accuInterval', function (latest) {
      count++
      t.is(latest, 419, 'number ' + latest)
      if (count === 2) {
        preactor.clearOwnInterval()
        t.end()
      }
    })

  emitter.emit('accuInterval', 1)
  emitter.emit('accuInterval', 419)
  setTimeout(function () {
    emitter.emit('accuInterval', 1)
    emitter.emit('accuInterval', 419)
  }, 70)
})

tape('Preactor.prototype.accumulateInterval', function (t) {
  var emitter = new EventEmitter()
  var preactor = new Preactor(emitter, 'accuInterval')
  var count = 0

  function argsReducer (prev = [ 0 ], args) {
    return [ prev[0] + args[0] ]
  }

  preactor
    .accumulateInterval(50, false, argsReducer)
    .on('accuInterval', function (number) {
      t.is(number, 2, 'number ' + number)
      if (++count === 2) {
        preactor.clearOwnInterval()
        t.end()
      }
    })

  emitter.emit('accuInterval', 1)
  emitter.emit('accuInterval', 1)
  setTimeout(function () {
    emitter.emit('accuInterval', 1)
    emitter.emit('accuInterval', 1)
  }, 70)
})

tape('WIP Preactor.prototype.accumulatePeriod', function (t) {
  var preactor = new Preactor(new EventEmitter(), 'noop')
  t.throws(function () {
    preactor.accumulatePeriod(123456789, 123459999)
  }, Error, 'not yet implemented')
  t.end()
})
