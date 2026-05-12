const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
    onDownloadProgress: (callback) => ipcRenderer.on('download_progress', (_event, value) => callback(value)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback),
    restartApp: () => ipcRenderer.send('restart_app')
});
