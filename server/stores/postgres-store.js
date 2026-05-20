const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizeEmail } = require('../lib/auth');
const {
    ATTENDANCE_STATUSES,
    normalizeAttendanceEntries,
    normalizeAttendanceRecord
} = require('./attendance-normalizer');

const ATTENDANCE_STATUS_CHECK = Array.from(ATTENDANCE_STATUSES)
    .map((status) => `'${status}'`)
    .join(', ');

function buildPresetName(preset) {
    return [preset.position, preset.location].filter(Boolean).join(' - ');
}

function buildConnectionConfig(options = {}) {
    if (options.connectionString || process.env.DATABASE_URL) {
        return {
            connectionString: options.connectionString || process.env.DATABASE_URL
        };
    }

    return {
        host: options.host || process.env.PGHOST || '127.0.0.1',
        port: Number(options.dbPort || process.env.PGPORT || 5432),
        database: options.database || process.env.PGDATABASE || 'attendance_system',
        user: options.user || process.env.PGUSER || 'postgres',
        password: options.password || process.env.PGPASSWORD || ''
    };
}

async function createPostgresStore(options = {}) {
    const { Pool } = require('pg');
    const pool = new Pool(buildConnectionConfig(options));

    async function query(text, params = []) {
        return pool.query(text, params);
    }

    async function transaction(work) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await work(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async function insertAttendanceRecord(client, date, record) {
        const normalizedRecord = normalizeAttendanceRecord(record);
        if (!normalizedRecord) return;

        await client.query(
            `INSERT INTO attendance_records (attendance_date, worker_id, status, daily_rate, position, location, note, travel_cost)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                date,
                normalizedRecord.workerId,
                normalizedRecord.status,
                normalizedRecord.dailyRate,
                normalizedRecord.position,
                normalizedRecord.location,
                normalizedRecord.note,
                normalizedRecord.travelCost
            ]
        );
    }

    async function ensureSchema() {
        await query(`
            CREATE TABLE IF NOT EXISTS workers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT DEFAULT '',
                cccd TEXT DEFAULT '',
                position TEXT DEFAULT '',
                location TEXT DEFAULT '',
                daily_rate INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS attendance_records (
                id BIGSERIAL PRIMARY KEY,
                attendance_date DATE NOT NULL,
                worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
                status TEXT NOT NULL CHECK (status IN (${ATTENDANCE_STATUS_CHECK})),
                daily_rate INTEGER NOT NULL DEFAULT 0,
                position TEXT DEFAULT '',
                location TEXT DEFAULT '',
                note TEXT DEFAULT '',
                travel_cost INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (attendance_date, worker_id)
            );

            CREATE TABLE IF NOT EXISTS preset_jobs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT '',
                position TEXT DEFAULT '',
                location TEXT DEFAULT '',
                rate INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS app_users (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // Migration for existing table
        try {
            await query('ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS note TEXT DEFAULT \'\'');
            await query('ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS travel_cost INTEGER NOT NULL DEFAULT 0');
            await query('ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check');
            await query(`ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check CHECK (status IN (${ATTENDANCE_STATUS_CHECK}))`);
        } catch (e) {
            console.error('Migration error:', e);
        }
    }

    async function importLegacyJsonIfEmpty(dataDir) {
        const workersCount = Number((await query('SELECT COUNT(*)::int AS count FROM workers')).rows[0].count);
        const attendanceCount = Number((await query('SELECT COUNT(*)::int AS count FROM attendance_records')).rows[0].count);
        const presetCount = Number((await query('SELECT COUNT(*)::int AS count FROM preset_jobs')).rows[0].count);

        if (workersCount > 0 || attendanceCount > 0 || presetCount > 0) {
            return;
        }

        const workersFile = path.join(dataDir, 'workers.json');
        const attendanceFile = path.join(dataDir, 'attendance.json');
        const settingsFile = path.join(dataDir, 'settings.json');

        const workers = fs.existsSync(workersFile) ? JSON.parse(fs.readFileSync(workersFile, 'utf8')) : [];
        const attendance = fs.existsSync(attendanceFile) ? JSON.parse(fs.readFileSync(attendanceFile, 'utf8')) : [];
        const settings = fs.existsSync(settingsFile)
            ? JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
            : { presetJobs: [] };

        await transaction(async (client) => {
            for (const worker of workers) {
                await client.query(
                    `INSERT INTO workers (id, name, phone, cccd, position, location, daily_rate)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        String(worker.id),
                        worker.name || '',
                        worker.phone || '',
                        worker.cccd || '',
                        worker.position || '',
                        worker.location || '',
                        Number(worker.dailyRate || 0)
                    ]
                );
            }

            for (const entry of attendance) {
                for (const record of entry.records || []) {
                    await insertAttendanceRecord(client, entry.date, record);
                }
            }

            for (const preset of settings.presetJobs || []) {
                await client.query(
                    `INSERT INTO preset_jobs (id, name, position, location, rate)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        String(preset.id),
                        preset.name || buildPresetName(preset),
                        preset.position || '',
                        preset.location || '',
                        Number(preset.rate || 0)
                    ]
                );
            }
        });
    }

    async function groupAttendanceRows() {
        const rows = (await query(
            `SELECT attendance_date, worker_id, status, daily_rate, position, location, note, travel_cost
             FROM attendance_records
             ORDER BY attendance_date ASC, worker_id ASC`
        )).rows;

        const map = new Map();

        for (const row of rows) {
            const date = row.attendance_date instanceof Date
                ? row.attendance_date.toISOString().slice(0, 10)
                : String(row.attendance_date);

            if (!map.has(date)) {
                map.set(date, { date, records: [] });
            }

            const normalizedRecord = normalizeAttendanceRecord({
                workerId: row.worker_id,
                status: row.status,
                dailyRate: Number(row.daily_rate || 0),
                position: row.position || '',
                location: row.location || '',
                note: row.note || '',
                travelCost: Number(row.travel_cost || 0)
            });

            if (normalizedRecord) {
                map.get(date).records.push(normalizedRecord);
            }
        }

        return Array.from(map.values());
    }

    await ensureSchema();
    if ((options.importLegacyJson ?? true) && options.dataDir) {
        await importLegacyJsonIfEmpty(options.dataDir);
    }

    return {
        driver: 'postgres',
        async getWorkers() {
            const result = await query(
                `SELECT id, name, phone, cccd, position, location, daily_rate
                 FROM workers
                 ORDER BY created_at ASC, id ASC`
            );

            return result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                phone: row.phone || '',
                cccd: row.cccd || '',
                position: row.position || '',
                location: row.location || '',
                dailyRate: Number(row.daily_rate || 0)
            }));
        },
        async createWorker(workerData) {
            const id = workerData.id || crypto.randomUUID();
            await query(
                `INSERT INTO workers (id, name, phone, cccd, position, location, daily_rate)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    id,
                    workerData.name || '',
                    workerData.phone || '',
                    workerData.cccd || '',
                    workerData.position || '',
                    workerData.location || '',
                    Number(workerData.dailyRate || 0)
                ]
            );

            return {
                id,
                ...workerData,
                dailyRate: Number(workerData.dailyRate || 0)
            };
        },
        async updateWorker(id, workerData) {
            const result = await query(
                `UPDATE workers
                 SET name = $2,
                     phone = $3,
                     cccd = $4,
                     position = $5,
                     location = $6,
                     daily_rate = $7,
                     updated_at = NOW()
                 WHERE id = $1
                 RETURNING id, name, phone, cccd, position, location, daily_rate`,
                [
                    id,
                    workerData.name || '',
                    workerData.phone || '',
                    workerData.cccd || '',
                    workerData.position || '',
                    workerData.location || '',
                    Number(workerData.dailyRate || 0)
                ]
            );

            if (result.rowCount === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                phone: row.phone || '',
                cccd: row.cccd || '',
                position: row.position || '',
                location: row.location || '',
                dailyRate: Number(row.daily_rate || 0)
            };
        },
        async getSettings() {
            const result = await query(
                `SELECT id, name, position, location, rate
                 FROM preset_jobs
                 ORDER BY created_at ASC, id ASC`
            );

            return {
                presetJobs: result.rows.map((row) => ({
                    id: row.id,
                    name: row.name || buildPresetName(row),
                    position: row.position || '',
                    location: row.location || '',
                    rate: Number(row.rate || 0)
                }))
            };
        },
        async saveSettings(settings) {
            const presetJobs = settings?.presetJobs || [];

            await transaction(async (client) => {
                await client.query('DELETE FROM preset_jobs');
                for (const preset of presetJobs) {
                    await client.query(
                        `INSERT INTO preset_jobs (id, name, position, location, rate)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            String(preset.id || crypto.randomUUID()),
                            preset.name || buildPresetName(preset),
                            preset.position || '',
                            preset.location || '',
                            Number(preset.rate || 0)
                        ]
                    );
                }
            });
        },
        async getAttendance() {
            return groupAttendanceRows();
        },
        async replaceAttendanceForDate(date, records) {
            await transaction(async (client) => {
                await client.query('DELETE FROM attendance_records WHERE attendance_date = $1', [date]);
                for (const record of records || []) {
                    await insertAttendanceRecord(client, date, record);
                }
            });
        },
        async upsertAttendanceRecord(date, workerId, recordData) {
            await transaction(async (client) => {
                await client.query(
                    'DELETE FROM attendance_records WHERE attendance_date = $1 AND worker_id = $2',
                    [date, String(workerId)]
                );

                await insertAttendanceRecord(client, date, { workerId, ...recordData });
            });
        },
        async getBackup() {
            return {
                workers: await this.getWorkers(),
                attendance: await this.getAttendance(),
                settings: await this.getSettings()
            };
        },
        async restoreBackup(payload) {
            const workers = payload?.workers || [];
            const attendance = normalizeAttendanceEntries(payload?.attendance || []);
            const presetJobs = payload?.settings?.presetJobs || [];

            await transaction(async (client) => {
                await client.query('DELETE FROM attendance_records');
                await client.query('DELETE FROM preset_jobs');
                await client.query('DELETE FROM workers');

                for (const worker of workers) {
                    await client.query(
                        `INSERT INTO workers (id, name, phone, cccd, position, location, daily_rate)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            String(worker.id),
                            worker.name || '',
                            worker.phone || '',
                            worker.cccd || '',
                            worker.position || '',
                            worker.location || '',
                            Number(worker.dailyRate || 0)
                        ]
                    );
                }

                for (const entry of attendance) {
                    for (const record of entry.records || []) {
                        await insertAttendanceRecord(client, entry.date, record);
                    }
                }

                for (const preset of presetJobs) {
                    await client.query(
                        `INSERT INTO preset_jobs (id, name, position, location, rate)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            String(preset.id || crypto.randomUUID()),
                            preset.name || buildPresetName(preset),
                            preset.position || '',
                            preset.location || '',
                            Number(preset.rate || 0)
                        ]
                    );
                }
            });
        },
        async getUserCount() {
            const result = await query('SELECT COUNT(*)::int AS count FROM app_users');
            return Number(result.rows[0].count);
        },
        async findUserByEmail(email) {
            const result = await query(
                `SELECT id, full_name, email, password_hash, role, is_active
                 FROM app_users
                 WHERE email = $1
                 LIMIT 1`,
                [normalizeEmail(email)]
            );
            if (result.rowCount === 0) return null;
            const row = result.rows[0];
            return {
                id: row.id,
                fullName: row.full_name,
                email: row.email,
                passwordHash: row.password_hash,
                role: row.role,
                isActive: row.is_active
            };
        },
        async createUser(userData) {
            const id = userData.id || crypto.randomUUID();
            const result = await query(
                `INSERT INTO app_users (id, full_name, email, password_hash, role, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, full_name, email, password_hash, role, is_active`,
                [
                    id,
                    userData.fullName || '',
                    normalizeEmail(userData.email),
                    userData.passwordHash,
                    userData.role || 'admin',
                    userData.isActive ?? true
                ]
            );
            const row = result.rows[0];
            return {
                id: row.id,
                fullName: row.full_name,
                email: row.email,
                passwordHash: row.password_hash,
                role: row.role,
                isActive: row.is_active
            };
        },
        async getUserById(id) {
            const result = await query(
                `SELECT id, full_name, email, password_hash, role, is_active
                 FROM app_users
                 WHERE id = $1
                 LIMIT 1`,
                [id]
            );
            if (result.rowCount === 0) return null;
            const row = result.rows[0];
            return {
                id: row.id,
                fullName: row.full_name,
                email: row.email,
                passwordHash: row.password_hash,
                role: row.role,
                isActive: row.is_active
            };
        },
        async close() {
            await pool.end();
        }
    };
}

module.exports = { createPostgresStore };
