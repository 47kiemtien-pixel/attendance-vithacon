const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { startServer } = require('../server/index.js');

// Auto Update Configuration
autoUpdater.autoDownload = true;
autoUpdater.checkForUpdatesAndNotify();

const SERVER_PORT = Number(process.env.PORT) || 5000;
const EXTERNAL_API_URL = process.env.ATTENDANCE_API_URL || '';
let mainWindow = null;
let serverInstance = null;

function getRendererEntry() {
    return path.join(__dirname, '..', 'client', 'dist', 'index.html');
}

function copyDirectory(sourceDir, targetDir) {
    if (!fs.existsSync(sourceDir)) return;
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(sourcePath, targetPath);
        } else if (!fs.existsSync(targetPath)) {
            fs.copyFileSync(sourcePath, targetPath);
        }
    }
}

function seedInitialData(dataDir) {
    const bundledDataDir = path.join(__dirname, '..', 'server', 'data');
    const hasExistingData =
        fs.existsSync(dataDir) &&
        fs.readdirSync(dataDir).some((fileName) => fileName.endsWith('.json'));

    if (!hasExistingData) {
        copyDirectory(bundledDataDir, dataDir);
    }
}

function createMainWindow(apiUrl) {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 920,
        minWidth: 1100,
        minHeight: 700,
        backgroundColor: '#0f172a',
        autoHideMenuBar: true,
        icon: path.join(__dirname, '..', 'client', 'dist', 'logo.png'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(getRendererEntry(), {
        query: {
            apiUrl
        }
    });
}

async function bootstrap() {
    const rendererEntry = getRendererEntry();
    if (!fs.existsSync(rendererEntry)) {
        dialog.showErrorBox(
            'Missing client build',
            'Khong tim thay client/dist/index.html. Hay chay "npm run build:client" truoc khi mo desktop app.'
        );
        app.quit();
        return;
    }

    const dataDir = path.join(app.getPath('userData'), 'data');
    seedInitialData(dataDir);

    let apiUrl = EXTERNAL_API_URL;

    if (!apiUrl) {
        try {
            serverInstance = await startServer({
                port: SERVER_PORT,
                dataDir
            });
            apiUrl = `http://127.0.0.1:${SERVER_PORT}/api`;
        } catch (error) {
            dialog.showErrorBox(
                'Server startup failed',
                `Khong the khoi dong server noi bo tren cong ${SERVER_PORT}.\n\n${error.message}`
            );
            app.quit();
            return;
        }
    }

    createMainWindow(apiUrl);
}

const singleInstance = app.requestSingleInstanceLock();

if (!singleInstance) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(bootstrap);
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});
