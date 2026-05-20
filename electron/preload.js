const { contextBridge, ipcRenderer } = require('electron');

const updateChannels = {
    update_checking: 'update_checking',
    update_available: 'update_available',
    update_not_available: 'update_not_available',
    download_progress: 'download_progress',
    update_downloaded: 'update_downloaded',
    update_error: 'update_error'
};

function subscribe(channel, callback) {
    const ipcChannel = updateChannels[channel];
    if (!ipcChannel || typeof callback !== 'function') return () => {};

    const listener = (_event, value) => callback(value);
    ipcRenderer.on(ipcChannel, listener);

    return () => {
        ipcRenderer.removeListener(ipcChannel, listener);
    };
}

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateChecking: (callback) => subscribe('update_checking', callback),
    onUpdateAvailable: (callback) => subscribe('update_available', callback),
    onUpdateNotAvailable: (callback) => subscribe('update_not_available', callback),
    onDownloadProgress: (callback) => subscribe('download_progress', callback),
    onUpdateDownloaded: (callback) => subscribe('update_downloaded', callback),
    onUpdateError: (callback) => subscribe('update_error', callback),
    getAppVersion: () => ipcRenderer.invoke('get_app_version'),
    checkForUpdates: () => ipcRenderer.invoke('check_for_updates'),
    restartApp: () => ipcRenderer.send('restart_app')
});
