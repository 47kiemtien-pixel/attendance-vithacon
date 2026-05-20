const WORK_DETAIL_STATUSES = new Set(['Full', 'Half']);
const NOTE_ONLY_STATUSES = new Set(['Absent', 'Holiday', 'Leave']);
const TRAVEL_STATUS = 'Travel';
const ATTENDANCE_STATUSES = new Set([
    ...WORK_DETAIL_STATUSES,
    ...NOTE_ONLY_STATUSES,
    TRAVEL_STATUS
]);

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeAmount(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeAttendanceRecord(record) {
    if (!record || typeof record !== 'object') return null;

    const workerId = record.workerId === undefined || record.workerId === null
        ? ''
        : String(record.workerId);
    const status = typeof record.status === 'string' ? record.status : '';

    if (!workerId || !ATTENDANCE_STATUSES.has(status)) return null;

    const normalized = {
        workerId,
        status,
        dailyRate: 0,
        position: '',
        location: '',
        note: normalizeText(record.note),
        travelCost: 0
    };

    if (WORK_DETAIL_STATUSES.has(status)) {
        normalized.dailyRate = normalizeAmount(record.dailyRate);
        normalized.position = normalizeText(record.position);
        normalized.location = normalizeText(record.location);
        normalized.travelCost = normalizeAmount(record.travelCost);
        return normalized;
    }

    if (status === TRAVEL_STATUS) {
        normalized.travelCost = normalizeAmount(record.travelCost);
    }

    return normalized;
}

function normalizeAttendanceRecords(records) {
    return Array.isArray(records)
        ? records.map(normalizeAttendanceRecord).filter(Boolean)
        : [];
}

function normalizeAttendanceEntries(entries) {
    return Array.isArray(entries)
        ? entries
            .map((entry) => {
                const date = typeof entry?.date === 'string' ? entry.date : '';
                if (!date) return null;

                return {
                    date,
                    records: normalizeAttendanceRecords(entry.records)
                };
            })
            .filter(Boolean)
        : [];
}

module.exports = {
    ATTENDANCE_STATUSES,
    WORK_DETAIL_STATUSES,
    normalizeAttendanceEntries,
    normalizeAttendanceRecord,
    normalizeAttendanceRecords
};
