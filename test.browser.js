var tape = require('tape')
var preactor = require('./index.js')

tape('in-browser debounce', function (t) {
  var input = document.createElement('input')

  preactor(input, 'change')
    .debounce(1000)
    .on('change', function ondebouncedchange (_) {
      t.is(input.value, 'y y y y y ', 'y')
      t.end()
    })

  var count = 0
  var interval = setInterval(function () {
    count++
    input.value += 'y '
    input.dispatchEvent(new Event('change'))
    if (count === 5) clearInterval(interval)
  }, 150)
})
