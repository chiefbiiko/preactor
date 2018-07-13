var tape = require('tape')
var preactor = require('./index.js')

// fix browser-test on new local machine and start CI

tape('in-browser debounce', function (t) {
  var input = document.createElement('input')

  preactor(input, 'change')
    .debounce(1000)
    .once('change', function (untrustedE) {
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
    .accumulate(3, argsReducer)
    .once('message', function (accumulatedMsg) {
      t.is(accumulatedMsg, '419', 'got message')
      websocket.close()
      t.end()
    })

  websocket.onopen = function () {
    websocket.send('4')
    websocket.send('1')
    websocket.send('9')
  }
})
