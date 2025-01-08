const fs = require('fs')
const path = require('path')
require('dotenv').config()
const { log, getFormattedString } = require('./print.js')
const { app, BrowserWindow, ipcMain } = require('electron')

global.log = log

const ModulesArray = []
const ModuleDir = path.join(__dirname, 'spotify')
const Files = fs.readdirSync(ModuleDir)
log(`Loading modules from "${ModuleDir}"`)

for (const file of Files) {
	const fileWithoutExtension = file.split('.')[0]
	const modulePath = path.join(ModuleDir, file)
	const Module = require(modulePath)
	ModulesArray.push(Module)
	log(`Loaded module: "${fileWithoutExtension}"`)
	app.whenReady().then(() => {
		ipcMain.on(fileWithoutExtension, (...args) => {
			Module?.onIpc && Module.onIpc(...args)
		})
	})
	Module?.init && Module.init({})
}

const createWindow = () => {
	const win = new BrowserWindow({
		width: 448,
		height: 424,
		webPreferences: {
			preload: path.join(__dirname, 'THE_INNER_WORKINGS/preload.js'),
		},
	})

	win.loadFile('THE_INNER_WORKINGS/index.html')
}

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})
