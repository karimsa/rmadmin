/**
 * Connection wrapper.
 */

const { Client } = require('ssh2')
    , fs = require('fs')
    , path = require('path')
    , errify = err => {
      return err.message || String(err)
    }

module.exports = options => new Promise((resolve, reject) => {
  var conn = new Client()

  // create bindings
  conn.on('ready', () => resolve(conn))
  conn.on('close', hadError => {
    fd.end()
    if (hadError) reject('Unknown error.')
  })
  conn.on('error', err => reject(fd.end(), errify(err)))

  // handle interactive logins using magic
  conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) =>
    finish([ options.password ])
  )

  // create logfile
  const fd = fs.createWriteStream(path.join(__dirname, '..', '..', 'logs', options.host + '-' + Date.now() + '.txt'), 'utf-8')

  // connect
  try {
    conn.connect(Object.assign(options, {
      tryKeyboard: true
    , debug: msg => fd.write(msg + '\r\n')
    , algorithms: {
        cipher: [
          'aes128-ctr',
          'aes128-cbc',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm',
          'aes128-gcm@openssh.com',
          'aes256-gcm',
          'aes256-gcm@openssh.com'
        ]
      }
    }))
  } catch (err) {
    reject(errify(err))
  }
})