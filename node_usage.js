var preactor = require('./index.js')

console.log('type sth and hit enter multiple times...')

preactor(process.stdin, 'data')
  .accumulate(2, true, (accu = [ '' ], args) => {
    return [ accu[0] + args[0].toString().trim() ]
  })
  .on('data', accu => console.log('accumulated data:', accu))
