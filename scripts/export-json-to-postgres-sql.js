const fs = require('fs');
const path = require('path');
const {
    ATTENDANCE_STATUSES,
    normalizeAttendanceEntries,
    normalizeAttendanceRecord
} = require('../server/stores/attendance-normalizer');

const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'server', 'data');
const outputPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(rootDir, 'deploy', 'attendance-system-export.sql');

function readJson(filename, fallback) {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sqlString(value) {
    if (value === null || value === undefined) return 'NULL';
    return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : '0';
}

function buildPresetName(preset) {
    return [preset.position, preset.location].filter(Boolean).join(' - ');
}

function valuesList(rows) {
    return rows.length ? rows.join(',\n') : '';
}

function insertBlock(table, columns, rows) {
    if (!rows.length) return `-- No rows for ${table}\n`;
    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${valuesList(rows)};\n`;
}

const workers = readJson('workers.json', []);
const attendance = normalizeAttendanceEntries(readJson('attendance.json', []));
const settings = readJson('settings.json', { presetJobs: [] });

const statusCheck = Array.from(ATTENDANCE_STATUSES)
    .map(sqlString)
    .join(', ');

const workerRows = workers.map((worker) => `(${[
    sqlString(worker.id),
    sqlString(worker.name || ''),
    sqlString(worker.phone || ''),
    sqlString(worker.cccd || ''),
    sqlString(worker.position || ''),
    sqlString(worker.location || ''),
    sqlNumber(worker.dailyRate),
    sqlString(worker.status || 'working')
].join(', ')})`);

const attendanceRows = [];
for (const entry of attendance) {
    for (const record of entry.records || []) {
        const normalized = normalizeAttendanceRecord(record);
        if (!normalized) continue;

        attendanceRows.push(`(${[
            sqlString(entry.date),
            sqlString(normalized.workerId),
            sqlString(normalized.status),
            sqlNumber(normalized.dailyRate),
            sqlString(normalized.position),
            sqlString(normalized.location),
            sqlString(normalized.note),
            sqlNumber(normalized.travelCost)
        ].join(', ')})`);
    }
}

const presetRows = (settings.presetJobs || []).map((preset) => `(${[
    sqlString(preset.id),
    sqlString(preset.name || buildPresetName(preset)),
    sqlString(preset.position || ''),
    sqlString(preset.location || ''),
    sqlNumber(preset.rate)
].join(', ')})`);

const generatedAt = new Date().toISOString();
const sql = `-- Attendance System PostgreSQL export
-- Generated at: ${generatedAt}
-- Source: server/data/*.json
-- Import example:
--   psql "$DATABASE_URL" -f deploy/attendance-system-export.sql

BEGIN;

CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    cccd TEXT DEFAULT '',
    position TEXT DEFAULT '',
    location TEXT DEFAULT '',
    daily_rate INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'working',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGSERIAL PRIMARY KEY,
    attendance_date DATE NOT NULL,
    worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN (${statusCheck})),
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

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS travel_cost INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check CHECK (status IN (${statusCheck}));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'working';

TRUNCATE TABLE attendance_records, preset_jobs, workers RESTART IDENTITY CASCADE;

${insertBlock('workers', ['id', 'name', 'phone', 'cccd', 'position', 'location', 'daily_rate', 'status'], workerRows)}
${insertBlock('preset_jobs', ['id', 'name', 'position', 'location', 'rate'], presetRows)}
${insertBlock('attendance_records', ['attendance_date', 'worker_id', 'status', 'daily_rate', 'position', 'location', 'note', 'travel_cost'], attendanceRows)}
SELECT setval(
    pg_get_serial_sequence('attendance_records', 'id'),
    COALESCE((SELECT MAX(id) FROM attendance_records), 1),
    (SELECT COUNT(*) > 0 FROM attendance_records)
);

COMMIT;
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sql, 'utf8');

console.log(`SQL export written: ${outputPath}`);
console.log(`Workers: ${workerRows.length}`);
console.log(`Preset jobs: ${presetRows.length}`);
console.log(`Attendance records: ${attendanceRows.length}`);
