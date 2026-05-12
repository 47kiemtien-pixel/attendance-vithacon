require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const helmet = require('helmet');
const path = require('path');
const dayjs = require('dayjs');
const { createJsonStore } = require('./stores/json-store');
const { hashPassword, normalizeEmail, verifyPassword } = require('./lib/auth');
const { createAuthMiddleware, signAccessToken } = require('./middleware/auth');

function resolveStoreDriver(options = {}) {
    if (options.storeDriver) return options.storeDriver;
    if (process.env.ATTENDANCE_DATA_DRIVER) return process.env.ATTENDANCE_DATA_DRIVER;
    if (process.env.DATABASE_URL || process.env.PGHOST || process.env.PGDATABASE) return 'postgres';
    return 'json';
}

async function createStore(options = {}) {
    const driver = resolveStoreDriver(options);
    const dataDir = options.dataDir || process.env.ATTENDANCE_DATA_DIR || path.join(__dirname, 'data');

    if (driver === 'postgres') {
        const { createPostgresStore } = require('./stores/postgres-store');
        return createPostgresStore({
            ...options,
            dataDir
        });
    }

    return createJsonStore(dataDir);
}

function buildMonthlyWorkbook(month, year, workers, attendance) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Thang ${month}-${year}`, {
        views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }]
    });

    const headerStyle = {
        font: { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
        }
    };

    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    const columns = [
        { header: 'Ho Ten', key: 'name', width: 25 },
        { header: 'Vi Tri', key: 'position', width: 20 },
        { header: 'Dia Diem', key: 'location', width: 20 },
        { header: 'Luong/Ngay', key: 'rate', width: 15 }
    ];

    const weekends = [];
    for (let i = 1; i <= daysInMonth; i += 1) {
        const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`;
        const dayOfWeek = dayjs(dateStr).day();
        if (dayOfWeek === 0 || dayOfWeek === 6) weekends.push(i);
        columns.push({ header: String(i), key: `day_${i}`, width: 6 });
    }
    columns.push({ header: 'Tong Cong', key: 'total_days', width: 12 });
    columns.push({ header: 'Thanh Tien', key: 'total_salary', width: 18 });

    worksheet.columns = columns;
    worksheet.spliceRows(1, 0, []);
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `BANG CHAM CONG THANG ${month}/${year}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F497D' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6EEF8' } };
    worksheet.getRow(1).height = 40;

    const headerRow = worksheet.getRow(2);
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
        cell.style = headerStyle;
        if (colNumber > 4 && colNumber <= 4 + daysInMonth) {
            const day = colNumber - 4;
            if (weekends.includes(day)) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } };
            }
        }
    });

    const cellBorder = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
    };

    workers.forEach((worker, workerIndex) => {
        const workerRecordsThisMonth = [];

        for (let i = 1; i <= daysInMonth; i += 1) {
            const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`;
            const dayRecord = attendance.find((entry) => entry.date === dateStr);
            const workerRecord = dayRecord?.records.find((record) => record.workerId === worker.id);
            if (workerRecord) workerRecordsThisMonth.push({ day: i, ...workerRecord });
        }

        const profiles = {};
        if (workerRecordsThisMonth.length === 0) {
            profiles.default = {
                position: worker.position,
                location: worker.location,
                rate: worker.dailyRate,
                records: []
            };
        } else {
            workerRecordsThisMonth.forEach((record) => {
                const position = record.position || worker.position || '';
                const location = record.location || worker.location || '';
                const rate = record.dailyRate || worker.dailyRate || 0;
                const key = `${position}_${location}_${rate}`;
                if (!profiles[key]) {
                    profiles[key] = { position, location, rate, records: [] };
                }
                profiles[key].records.push(record);
            });
        }

        const profileValues = Object.values(profiles);
        let startRowIndex = -1;

        profileValues.forEach((profile, profileIndex) => {
            const rowData = {
                name: profileIndex === 0 ? worker.name : '',
                position: profile.position,
                location: profile.location,
                rate: profile.rate
            };

            let totalDays = 0;
            for (let i = 1; i <= daysInMonth; i += 1) {
                const recordForDay = profile.records.find((record) => record.day === i);
                if (recordForDay) {
                    if (recordForDay.status === 'Full') {
                        rowData[`day_${i}`] = 1;
                        totalDays += 1;
                    } else if (recordForDay.status === 'Half') {
                        rowData[`day_${i}`] = 0.5;
                        totalDays += 0.5;
                    } else {
                        rowData[`day_${i}`] = 0;
                    }
                } else {
                    rowData[`day_${i}`] = '';
                }
            }

            rowData.total_days = totalDays;
            rowData.total_salary = totalDays * profile.rate;
            const row = worksheet.addRow(rowData);
            row.height = 25;

            if (profileIndex === 0) startRowIndex = row.number;

            const isAlternateRow = workerIndex % 2 !== 0;
            const alternateFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFDFD' } };

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = cellBorder;
                cell.alignment = { vertical: 'middle', horizontal: 'left' };

                if (isAlternateRow) cell.fill = alternateFill;
                if (colNumber > 3) cell.alignment = { vertical: 'middle', horizontal: 'center' };
                if (colNumber === 4) cell.alignment = { vertical: 'middle', horizontal: 'right' };

                if (colNumber > 4 && colNumber <= 4 + daysInMonth) {
                    const day = colNumber - 4;
                    if (weekends.includes(day)) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
                    }
                    if (cell.value === 0) {
                        cell.font = { color: { argb: 'FFEF4444' }, bold: true };
                    } else if (cell.value === 0.5) {
                        cell.font = { color: { argb: 'FFF59E0B' }, bold: true };
                    } else if (cell.value === 1) {
                        cell.font = { color: { argb: 'FF10B981' } };
                    }
                }
            });

            row.getCell('rate').numFmt = '#,##0 "VND"';
            row.getCell('total_salary').numFmt = '#,##0 "VND"';
            row.getCell('total_salary').font = { bold: true, color: { argb: 'FF1F2937' } };
            row.getCell('total_salary').alignment = { vertical: 'middle', horizontal: 'right' };
            row.getCell('total_days').font = { bold: true };
            row.getCell('total_days').alignment = { vertical: 'middle', horizontal: 'center' };
        });

        if (profileValues.length > 1 && startRowIndex !== -1) {
            const endRowIndex = startRowIndex + profileValues.length - 1;
            worksheet.mergeCells(`A${startRowIndex}:A${endRowIndex}`);
            const mergedCell = worksheet.getCell(`A${startRowIndex}`);
            mergedCell.alignment = { vertical: 'middle', horizontal: 'left' };
            mergedCell.border = cellBorder;
            if (workerIndex % 2 !== 0) {
                mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFDFD' } };
            }
        }
    });

    return workbook;
}

function buildWorkerReportWorkbook(worker, dateRange, attendance) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bảng Chấm Công');

    // Column widths
    worksheet.columns = [
        { width: 22 }, // Thứ / Ngày
        { width: 22 }, // Địa điểm
        { width: 25 }, // Trạng thái
        { width: 35 }  // Ghi chú
    ];

    // Colors
    const blueColor = 'FF1E40AF';
    const lightBlueBg = 'FFF1F5F9';
    const textDark = 'FF111827';
    const textMuted = 'FF4B5563';
    
    // Add Logo
    const logoPath = path.join(__dirname, '../client/public/logo.png');
    if (fs.existsSync(logoPath)) {
        const logoId = workbook.addImage({
            buffer: fs.readFileSync(logoPath),
            extension: 'png',
        });
        // Position logo at top left (A1)
        worksheet.addImage(logoId, {
            tl: { col: 0.1, row: 0.2 },
            ext: { width: 85, height: 85 }
        });
    }

    // Row 1-3: Header area
    worksheet.getRow(1).height = 30;
    worksheet.getRow(2).height = 25;
    worksheet.getRow(3).height = 25;

    // Company Info (Shifted to column B/C to make room for logo if needed)
    worksheet.mergeCells('B1:D1');
    const compName1 = worksheet.getCell('B1');
    compName1.value = 'CÔNG TY TNHH CƠ KHÍ XÂY DỰNG VIỆT THÀNH';
    compName1.font = { name: 'Arial', bold: true, size: 14, color: { argb: blueColor } };
    compName1.alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.mergeCells('B2:C2');
    const compSub = worksheet.getCell('B2');
    compSub.value = 'THƯƠNG MẠI & DỊCH VỤ VITHACON';
    compSub.font = { name: 'Arial', bold: true, size: 11, color: { argb: blueColor } };
    compSub.alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.mergeCells('D2:D2');
    const periodTitle = worksheet.getCell('D2');
    periodTitle.value = 'BẢNG CHẤM CÔNG';
    periodTitle.font = { name: 'Arial', bold: true, size: 22, color: { argb: blueColor } };
    periodTitle.alignment = { vertical: 'middle', horizontal: 'right' };

    worksheet.mergeCells('B3:C3');
    const webCell = worksheet.getCell('B3');
    webCell.value = 'Website: vithacon.vn | Hotline: 09xx.xxx.xxx';
    webCell.font = { name: 'Arial', size: 10, color: { argb: textMuted } };
    webCell.alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.mergeCells('D3:D3');
    const periodLabel = dateRange.label || `Từ ${dayjs(dateRange.start).format('DD/MM/YYYY')} đến ${dayjs(dateRange.end).format('DD/MM/YYYY')}`;
    const periodCell = worksheet.getCell('D3');
    periodCell.value = periodLabel;
    periodCell.font = { name: 'Arial', bold: true, size: 12, color: { argb: textDark } };
    periodCell.alignment = { vertical: 'middle', horizontal: 'right' };

    worksheet.mergeCells('A4:D4');
    worksheet.getRow(4).height = 6;
    worksheet.getCell('A4').border = { bottom: { style: 'medium', color: { argb: blueColor } } };

    // Worker info section
    worksheet.addRow([]); // Spacer
    const infoHeader = worksheet.addRow(['', 'HỌ VÀ TÊN', 'MÃ THỢ', 'THỜI GIAN']);
    infoHeader.font = { name: 'Arial', bold: true, size: 10, color: { argb: textMuted } };
    infoHeader.height = 20;

    const workerCode = `VH-${String(worker.id).slice(-3).toUpperCase()}`;
    const timeRange = `${dayjs(dateRange.start).format('DD/MM')} - ${dayjs(dateRange.end).format('DD/MM/YYYY')}`;
    const infoValues = worksheet.addRow(['', worker.name, workerCode, timeRange]);
    infoValues.font = { name: 'Arial', bold: true, size: 18, color: { argb: textDark } };
    infoValues.height = 35;
    
    worksheet.addRow([]); // Spacer

    // Table Header
    const tableHeader = worksheet.addRow(['THỨ / NGÀY', 'ĐỊA ĐIỂM', 'TRẠNG THÁI', 'GHI CHÚ']);
    tableHeader.height = 35;
    tableHeader.eachCell((cell) => {
        cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { 
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' } 
        };
    });

    // Data rows
    let totalFull = 0;
    let totalHoliday = 0;

    const startDate = dayjs(dateRange.start);
    const endDate = dayjs(dateRange.end);
    const days = endDate.diff(startDate, 'day') + 1;

    const vnDays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    for (let i = 0; i < days; i++) {
        const d = startDate.add(i, 'day');
        const dateStr = d.format('YYYY-MM-DD');
        const dayRecord = attendance.find(a => a.date === dateStr);
        const record = dayRecord?.records.find(r => r.workerId === worker.id);

        const row = worksheet.addRow([
            `${vnDays[d.day()]} (${d.format('DD/MM')})`,
            record?.location || '-',
            '', // Status placeholder
            record?.note || '-'
        ]);
        row.height = 40;

        const statusCell = row.getCell(3);
        if (record) {
            if (record.status === 'Full') {
                statusCell.value = 'ĐI LÀM (CÔNG)';
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
                statusCell.font = { color: { argb: 'FF065F46' }, bold: true, size: 10 };
                totalFull += 1;
            } else if (record.status === 'Half') {
                statusCell.value = 'ĐI LÀM (1/2 CÔNG)';
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
                statusCell.font = { color: { argb: 'FF065F46' }, bold: true, size: 10 };
                totalFull += 0.5;
            } else if (record.status === 'Holiday') {
                statusCell.value = 'NGHỈ LỄ';
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
                statusCell.font = { color: { argb: 'FFC2410C' }, bold: true, size: 10 };
                totalHoliday += 1;
            } else if (record.status === 'Leave') {
                statusCell.value = 'NGHỈ PHÉP';
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
                statusCell.font = { color: { argb: 'FF1D4ED8' }, bold: true, size: 10 };
            } else {
                statusCell.value = '-';
            }
        } else {
            statusCell.value = '-';
        }

        row.eachCell((cell, colNumber) => {
            cell.alignment = { vertical: 'middle', horizontal: colNumber === 3 ? 'center' : 'left' };
            cell.border = { 
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
        });
    }

    worksheet.addRow([]); // Spacer
    worksheet.addRow([]); // Spacer

    // Summary section
    const summaryHeader = worksheet.addRow(['', '', 'TỔNG NGÀY CÔNG', 'TỔNG NGÀY NGHỈ LỄ', 'XÁC NHẬN']);
    summaryHeader.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF6B7280' } };
    summaryHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    const summaryValues = worksheet.addRow(['', '', totalFull, totalHoliday, '✓']);
    summaryValues.height = 55;
    summaryValues.alignment = { vertical: 'middle', horizontal: 'center' };
    
    const fullCell = summaryValues.getCell(3);
    fullCell.font = { name: 'Arial', bold: true, size: 28, color: { argb: 'FF10B981' } };
    fullCell.border = { outline: true, bottom: { style: 'medium', color: { argb: 'FF10B981' } } };
    
    const holidayCell = summaryValues.getCell(4);
    holidayCell.font = { name: 'Arial', bold: true, size: 28, color: { argb: 'FFF59E0B' } };
    holidayCell.border = { outline: true, bottom: { style: 'medium', color: { argb: 'FFF59E0B' } } };
    
    const signCell = summaryValues.getCell(5);
    signCell.font = { name: 'Arial', bold: true, size: 28, color: { argb: textDark } };

    // Signature Area
    worksheet.addRow([]);
    worksheet.addRow([]);
    const footerDate = worksheet.addRow(['', '', '', `Ngày ...... tháng ...... năm 202...`]);
    footerDate.getCell(4).alignment = { horizontal: 'center' };
    footerDate.getCell(4).font = { italic: true };

    const signatureRow = worksheet.addRow(['', 'Người lập biểu', '', 'Giám đốc xác nhận']);
    signatureRow.font = { bold: true };
    signatureRow.eachCell(cell => cell.alignment = { horizontal: 'center' });

    return workbook;
}

async function createServer(options = {}) {
    const app = express();
    const port = options.port || Number(process.env.PORT) || 5000;
    const host = options.host || process.env.HOST || '0.0.0.0';
    const dataDir = options.dataDir || process.env.ATTENDANCE_DATA_DIR || path.join(__dirname, 'data');
    const store = await createStore({ ...options, dataDir });
    const auth = createAuthMiddleware({
        authRequired: options.authRequired,
        jwtSecret: options.jwtSecret
    });
    const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
    const corsOrigin = process.env.CORS_ORIGIN || '*';

    app.use(helmet({
        crossOriginResourcePolicy: false
    }));
    app.use(cors({
        origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((item) => item.trim()),
        credentials: true
    }));
    app.use(bodyParser.json());
    app.use(auth.attachUserIfPresent);

    app.get('/api/health', (req, res) => {
        res.json({ ok: true, driver: store.driver, host, port, authRequired: auth.authRequired });
    });

    app.get('/api/auth/status', async (req, res) => {
        const userCount = await store.getUserCount();
        res.json({
            authRequired: auth.authRequired,
            hasUsers: userCount > 0,
            bootstrapAllowed: userCount === 0
        });
    });

    app.post('/api/auth/bootstrap', async (req, res) => {
        const userCount = await store.getUserCount();
        if (userCount > 0) {
            res.status(409).json({ message: 'Bootstrap already completed' });
            return;
        }

        const { email, password, fullName } = req.body || {};
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }

        const user = await store.createUser({
            email: normalizeEmail(email),
            fullName: fullName || 'Administrator',
            passwordHash: hashPassword(password),
            role: 'admin',
            isActive: true
        });

        const token = signAccessToken(user, jwtSecret);
        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    });

    app.post('/api/auth/login', async (req, res) => {
        const { email, password } = req.body || {};
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }

        const user = await store.findUserByEmail(email);
        if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const token = signAccessToken(user, jwtSecret);
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    });

    app.get('/api/auth/me', auth.requireAuth, async (req, res) => {
        const user = await store.getUserById(req.auth.sub);
        if (!user || !user.isActive) {
            res.status(401).json({ message: 'User not found' });
            return;
        }

        res.json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
        });
    });

    app.get('/api/workers', auth.requireAuth, async (req, res) => {
        res.json(await store.getWorkers());
    });

    app.post('/api/workers', auth.requireAuth, async (req, res) => {
        const newWorker = await store.createWorker(req.body);
        res.status(201).json(newWorker);
    });

    app.put('/api/workers/:id', auth.requireAuth, async (req, res) => {
        const worker = await store.updateWorker(req.params.id, req.body);
        if (!worker) {
            res.status(404).json({ message: 'Worker not found' });
            return;
        }
        res.json(worker);
    });

    app.get('/api/settings', auth.requireAuth, async (req, res) => {
        res.json(await store.getSettings());
    });

    app.post('/api/settings', auth.requireAuth, async (req, res) => {
        await store.saveSettings(req.body);
        res.json({ message: 'Settings saved successfully' });
    });

    app.get('/api/attendance', auth.requireAuth, async (req, res) => {
        res.json(await store.getAttendance());
    });

    app.post('/api/attendance', auth.requireAuth, async (req, res) => {
        const { date, records } = req.body;
        await store.replaceAttendanceForDate(date, records);
        res.json({ message: 'Attendance saved successfully' });
    });

    app.post('/api/attendance/record', auth.requireAuth, async (req, res) => {
        const { date, workerId, status, dailyRate, position, location, note } = req.body;
        await store.upsertAttendanceRecord(date, workerId, {
            status,
            dailyRate,
            position,
            location,
            note
        });
        res.json({ message: 'Record updated' });
    });

    app.get('/api/backup', auth.requireAuth, async (req, res) => {
        try {
            res.json(await store.getBackup());
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/restore', auth.requireAuth, async (req, res) => {
        try {
            await store.restoreBackup(req.body);
            res.json({ message: 'Restore completed successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/export', auth.requireAuth, async (req, res) => {
        try {
            const { month, year } = req.query;
            const workers = await store.getWorkers();
            const attendance = await store.getAttendance();
            const workbook = buildMonthlyWorkbook(month, year, workers, attendance);

            const buffer = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Bang_Cham_Cong_${month}_${year}.xlsx"`);
            res.send(buffer);
        } catch (error) {
            console.error('Export monthly error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Internal server error during export', error: error.message });
            }
        }
    });

    app.get('/api/export/worker', auth.requireAuth, async (req, res) => {
        try {
            const { workerId, startDate, endDate, label } = req.query;
            if (!workerId || !startDate || !endDate) {
                return res.status(400).json({ message: 'Missing parameters' });
            }

            const workers = await store.getWorkers();
            const worker = workers.find(w => w.id === workerId);
            if (!worker) return res.status(404).json({ message: 'Worker not found' });

            const attendance = await store.getAttendance();
            const workbook = buildWorkerReportWorkbook(worker, { start: startDate, end: endDate, label }, attendance);

            const buffer = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            
            const rawName = worker.name || 'Cong_Nhan';
            const safeName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
            res.setHeader('Content-Disposition', `attachment; filename="Bao_Cao_${safeName}.xlsx"`);
            res.send(buffer);
        } catch (error) {
            console.error('Export worker error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Internal server error during worker export', error: error.message });
            }
        }
    });

    return { app, port, host, dataDir, store };
}

async function startServer(options = {}) {
    const { app, port, host, dataDir, store } = await createServer(options);

    return new Promise((resolve, reject) => {
        const server = app.listen(port, host, () => {
            console.log(`Server is running on http://${host}:${port}`);
            console.log(`Attendance data driver: ${store.driver}`);
            console.log(`Attendance data directory: ${dataDir}`);
            resolve(server);
        });

        server.on('error', reject);
    });
}

module.exports = { createServer, startServer };

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Failed to start attendance server:', error);
        process.exit(1);
    });
}
