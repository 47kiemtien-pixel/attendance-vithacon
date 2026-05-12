const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { startServer } = require('../server/index.js');

autoUpdater.autoDownload = true;

const SERVER_PORT = 5005; // HARDCODED
const EXTERNAL_API_URL = '';
let mainWindow = null;
let serverInstance = null;

function getRendererEntry() {
    return path.join(__dirname, '..', 'client', 'dist', 'index.html');
}

function createMainWindow(apiUrl) {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 920,
        backgroundColor: '#0f172a',
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'ỨNG DỤNG ĐANG SỬA - VITHACON v1.2.4'
    });

    mainWindow.setTitle('ỨNG DỤNG ĐANG SỬA - VITHACON v1.2.4');
    mainWindow.on('page-title-updated', (e) => e.preventDefault());

    mainWindow.loadFile(getRendererEntry(), {
        query: {
            apiUrl
        }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
        mainWindow.focus();
    });
}

async function bootstrap() {
    const dataDir = path.join(app.getPath('userData'), 'data');
    let apiUrl = `http://127.0.0.1:${SERVER_PORT}/api`;

    try {
        serverInstance = await startServer({
            port: SERVER_PORT,
            dataDir
        });
    } catch (error) {
        dialog.showErrorBox('Server startup failed', error.message);
        app.quit();
        return;
    }

    createMainWindow(apiUrl);
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
    }
});
