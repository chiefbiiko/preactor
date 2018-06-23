var tape = require('tape')
var preactor = require('./index.js')

tape('in-browser debounce', function (t) {
  var input = document.createElement('input')

  preactor(input, 'change')
    .debounce(1000)
    .on('change', function ondebouncedchange (untrustedE) {
      t.is(input.value, 'y y y y y ', 'y')
      t.end()
    })

  var count = 0
  var interval = setInterval(function () {
    input.value += 'y '
    input.dispatchEvent(new Event('change'))
    if (++count === 5) clearInterval(interval)
  }, 150)
})

tape('accumulatin websocket messages', function (t) {
  var websocket = new WebSocket('wss://echo.websocket.org')

  function argsReducer (accu = [ '' ], args) {
    return accu.map(function (accuVal) {
      return accuVal + args[0].data
    })
  }

  preactor(websocket, 'message')
    .accumulate(3, false, argsReducer)
    .once('message', function oncemessage (accumulatedMsg) {
      t.is(accumulatedMsg, '419', 'got message')
      t.end()
    })

  websocket.onopen = function onopen () {
    websocket.send('4')
    websocket.send('1')
    websocket.send('9')
  }
})
