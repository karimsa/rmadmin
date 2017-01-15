'use strict'

const { app, BrowserWindow } = require('electron')

let win
app.on('ready', () => {
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize

  win = new BrowserWindow({
    width: width * .8,
    height: height * .8
  })

  win.loadURL(`file://${__dirname}/app/index.html`)
  win.webContents.openDevTools()

  win.on('close', () => {
    win = null
  })
})