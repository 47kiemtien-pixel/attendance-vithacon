const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { startServer } = require('../server/index.js');

const SERVER_PORT = Number(process.env.ATTENDANCE_SERVER_PORT || 5005);

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

let mainWindow = null;
let serverInstance = null;

function getRendererEntry() {
    return path.join(__dirname, '..', 'client', 'dist', 'index.html');
}

function sendToRenderer(channel, payload) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(channel, payload);
}

function setupAutoUpdater() {
    autoUpdater.on('checking-for-update', () => {
        sendToRenderer('update_checking');
    });

    autoUpdater.on('update-available', (info) => {
        sendToRenderer('update_available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        sendToRenderer('update_not_available', info);
    });

    autoUpdater.on('download-progress', (progress) => {
        sendToRenderer('download_progress', {
            percent: Math.round(progress.percent || 0),
            bytesPerSecond: progress.bytesPerSecond || 0,
            transferred: progress.transferred || 0,
            total: progress.total || 0
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        sendToRenderer('update_downloaded', info);
    });

    autoUpdater.on('error', (error) => {
        sendToRenderer('update_error', {
            message: error?.message || 'Khong the kiem tra hoac tai ban cap nhat.'
        });
    });

    ipcMain.on('restart_app', () => {
        autoUpdater.quitAndInstall(false, true);
    });

    ipcMain.handle('get_app_version', () => app.getVersion());
    ipcMain.handle('check_for_updates', async () => {
        if (!app.isPackaged) {
            return { skipped: true, reason: 'Update chi hoat dong trong ban da dong goi.' };
        }

        return autoUpdater.checkForUpdates();
    });
}

async function checkForUpdatesWhenPackaged() {
    if (!app.isPackaged) return;

    try {
        await autoUpdater.checkForUpdates();
    } catch (error) {
        sendToRenderer('update_error', {
            message: error?.message || 'Khong the kiem tra ban cap nhat.'
        });
    }
}

function createMainWindow(apiUrl) {
    const title = `Cham cong Viet Thanh v${app.getVersion()}`;

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
        title
    });

    mainWindow.setTitle(title);
    mainWindow.on('page-title-updated', (event) => event.preventDefault());

    mainWindow.loadFile(getRendererEntry(), {
        query: { apiUrl }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
        mainWindow.focus();
        checkForUpdatesWhenPackaged();
    });
}

async function bootstrap() {
    const dataDir = path.join(app.getPath('userData'), 'data');
    const apiUrl = `http://127.0.0.1:${SERVER_PORT}/api`;

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

setupAutoUpdater();
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
