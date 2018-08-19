// FIXME: npm run demo and hit localhost:9966 with a browser

var preactor = require('./index.js')

window.onload = function () {
  var input = document.createElement('input')
  input.placeholder = 'type 2 c keyup debounce'

  preactor(input, 'keyup')
    .debounce(1000)
    .on('keyup', function (e) {
      alert('debounced:: ' + e.target.value)
    })

  document.body.appendChild(input)
}
