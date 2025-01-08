const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
	send: (...args) => {
		console.log('send', args)
		ipcRenderer.send(...args)
	},
})
