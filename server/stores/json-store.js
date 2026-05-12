const fs = require('fs');
const path = require('path');
const { normalizeEmail } = require('../lib/auth');

function ensureDataStore(dataDir) {
    const workersFile = path.join(dataDir, 'workers.json');
    const attendanceFile = path.join(dataDir, 'attendance.json');
    const settingsFile = path.join(dataDir, 'settings.json');
    const usersFile = path.join(dataDir, 'users.json');

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(workersFile)) fs.writeFileSync(workersFile, JSON.stringify([]));
    if (!fs.existsSync(attendanceFile)) fs.writeFileSync(attendanceFile, JSON.stringify([]));
    if (!fs.existsSync(settingsFile)) fs.writeFileSync(settingsFile, JSON.stringify({ presetJobs: [] }));
    if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

    return { workersFile, attendanceFile, settingsFile, usersFile };
}

function createJsonStore(dataDir) {
    const { workersFile, attendanceFile, settingsFile, usersFile } = ensureDataStore(dataDir);

    const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
    const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

    return {
        driver: 'json',
        async getWorkers() {
            return readData(workersFile);
        },
        async createWorker(workerData) {
            const workers = readData(workersFile);
            const newWorker = { id: Date.now().toString(), ...workerData };
            workers.push(newWorker);
            writeData(workersFile, workers);
            return newWorker;
        },
        async updateWorker(id, workerData) {
            const workers = readData(workersFile);
            const index = workers.findIndex((worker) => worker.id === id);
            if (index === -1) return null;

            workers[index] = { ...workers[index], ...workerData };
            writeData(workersFile, workers);
            return workers[index];
        },
        async getSettings() {
            return readData(settingsFile);
        },
        async saveSettings(settings) {
            writeData(settingsFile, settings);
        },
        async getAttendance() {
            return readData(attendanceFile);
        },
        async replaceAttendanceForDate(date, records) {
            let attendance = readData(attendanceFile);
            attendance = attendance.filter((entry) => entry.date !== date);
            attendance.push({ date, records });
            writeData(attendanceFile, attendance);
        },
        async upsertAttendanceRecord(date, workerId, recordData) {
            const attendance = readData(attendanceFile);
            let dayRecord = attendance.find((entry) => entry.date === date);

            if (!dayRecord) {
                dayRecord = { date, records: [] };
                attendance.push(dayRecord);
            }

            dayRecord.records = dayRecord.records.filter((record) => record.workerId !== workerId);

            if (recordData && recordData.status && recordData.status !== 'Absent') {
                dayRecord.records.push({ workerId, ...recordData });
            }

            writeData(attendanceFile, attendance);
        },
        async getBackup() {
            return {
                workers: readData(workersFile),
                attendance: readData(attendanceFile),
                settings: readData(settingsFile)
            };
        },
        async restoreBackup(payload) {
            const { workers, attendance, settings } = payload;
            if (workers && Array.isArray(workers)) writeData(workersFile, workers);
            if (attendance && Array.isArray(attendance)) writeData(attendanceFile, attendance);
            if (settings && typeof settings === 'object') writeData(settingsFile, settings);
        },
        async getUserCount() {
            return readData(usersFile).length;
        },
        async findUserByEmail(email) {
            return readData(usersFile).find((user) => user.email === normalizeEmail(email)) || null;
        },
        async createUser(userData) {
            const users = readData(usersFile);
            const newUser = {
                id: userData.id || Date.now().toString(),
                fullName: userData.fullName || '',
                email: normalizeEmail(userData.email),
                passwordHash: userData.passwordHash,
                role: userData.role || 'admin',
                isActive: userData.isActive ?? true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            users.push(newUser);
            writeData(usersFile, users);
            return { ...newUser };
        },
        async getUserById(id) {
            return readData(usersFile).find((user) => user.id === id) || null;
        },
        async close() {
            return undefined;
        }
    };
}

module.exports = { createJsonStore };
