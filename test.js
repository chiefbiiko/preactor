var tape = require('tape')
var EventEmitter = require('events').EventEmitter
var Reactor = require('./index')

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
    t.false(reacted, 'still not reacted yet')
  }, 419)
  setTimeout(function () {
    t.false(reacted, 'still not reacted yet')
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
    t.pass('got the error passed thru')
    t.end()
  })
  emitter.emit('error')
})

tape('takin a promise', function (t) {
  function makePromise () {
    return new Promise(function (resolve, reject) {
      setTimeout(resolve, 100, 419)
    })
  }
  var reactor = new Reactor(makePromise())
  reactor.once('resolved', function (motto) {
    t.pass('all we do is ' + motto)
    t.end()
  })
})
