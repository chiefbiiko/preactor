// run @maxogden/wzrd usage.js and hit localhost:9966 with a browser

var preactor = require('./index.js')

window.onload = function onload () {
  var input = document.createElement('input')
  input.placeholder = 'type 2 c keyup debounce'

  preactor(input, 'keyup')
    .debounce(1000)
    .on('keyup', function ondebouncedkeyup (e) {
      alert('debounced:: ' + e.target.value)
    })

  document.body.appendChild(input)
}
