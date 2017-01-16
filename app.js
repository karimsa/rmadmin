'use strict'

const { app, BrowserWindow } = require('electron')
    , url = require('url')
    , path = require('path')

let win
app.on('ready', () => {
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize

  win = new BrowserWindow({
    width: width * .8,
    height: height * .8
  })

  win.loadURL(url.format({
    pathname: path.resolve(__dirname, 'app', 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  win.on('close', () => {
    win = null
  })
})
