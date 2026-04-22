const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

function ensureDataStore(dataDir) {
    const workersFile = path.join(dataDir, 'workers.json');
    const attendanceFile = path.join(dataDir, 'attendance.json');
    const settingsFile = path.join(dataDir, 'settings.json');

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(workersFile)) fs.writeFileSync(workersFile, JSON.stringify([]));
    if (!fs.existsSync(attendanceFile)) fs.writeFileSync(attendanceFile, JSON.stringify([]));
    if (!fs.existsSync(settingsFile)) fs.writeFileSync(settingsFile, JSON.stringify({ presetJobs: [] }));

    return { workersFile, attendanceFile, settingsFile };
}

function createServer(options = {}) {
    const app = express();
    const port = options.port || Number(process.env.PORT) || 5000;
    const dataDir = options.dataDir || process.env.ATTENDANCE_DATA_DIR || path.join(__dirname, 'data');
    const { workersFile, attendanceFile, settingsFile } = ensureDataStore(dataDir);

    const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
    const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

    app.use(cors());
    app.use(bodyParser.json());

    app.get('/api/health', (req, res) => {
        res.json({ ok: true });
    });

    app.get('/api/workers', (req, res) => {
        res.json(readData(workersFile));
    });

    app.post('/api/workers', (req, res) => {
        const workers = readData(workersFile);
        const newWorker = { id: Date.now().toString(), ...req.body };
        workers.push(newWorker);
        writeData(workersFile, workers);
        res.status(201).json(newWorker);
    });

    app.put('/api/workers/:id', (req, res) => {
        const workers = readData(workersFile);
        const index = workers.findIndex(w => w.id === req.params.id);
        if (index !== -1) {
            workers[index] = { ...workers[index], ...req.body };
            writeData(workersFile, workers);
            res.json(workers[index]);
        } else {
            res.status(404).json({ message: 'Worker not found' });
        }
    });

    app.get('/api/settings', (req, res) => {
        res.json(readData(settingsFile));
    });

    app.post('/api/settings', (req, res) => {
        writeData(settingsFile, req.body);
        res.json({ message: 'Settings saved successfully' });
    });

    app.get('/api/attendance', (req, res) => {
        res.json(readData(attendanceFile));
    });

    app.post('/api/attendance', (req, res) => {
        const { date, records } = req.body;
        let attendance = readData(attendanceFile);

        attendance = attendance.filter(a => a.date !== date);
        attendance.push({ date, records });

        writeData(attendanceFile, attendance);
        res.json({ message: 'Attendance saved successfully' });
    });

    app.post('/api/attendance/record', (req, res) => {
        const { date, workerId, status, dailyRate, position, location } = req.body;
        let attendance = readData(attendanceFile);

        let dayRecord = attendance.find(a => a.date === date);
        if (!dayRecord) {
            dayRecord = { date, records: [] };
            attendance.push(dayRecord);
        }

        dayRecord.records = dayRecord.records.filter(r => r.workerId !== workerId);

        if (status && status !== 'Absent') {
            dayRecord.records.push({ workerId, status, dailyRate, position, location });
        }

        writeData(attendanceFile, attendance);
        res.json({ message: 'Record updated' });
    });

    app.get('/api/backup', (req, res) => {
        try {
            const workers = readData(workersFile);
            const attendance = readData(attendanceFile);
            const settings = readData(settingsFile);
            res.json({ workers, attendance, settings });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/restore', (req, res) => {
        try {
            const { workers, attendance, settings } = req.body;
            if (workers && Array.isArray(workers)) writeData(workersFile, workers);
            if (attendance && Array.isArray(attendance)) writeData(attendanceFile, attendance);
            if (settings && typeof settings === 'object') writeData(settingsFile, settings);
            res.json({ message: 'Restore completed successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/export', async (req, res) => {
    const { month, year } = req.query; // e.g., month=04, year=2026
    const workers = readData(workersFile);
    const attendance = readData(attendanceFile);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Tháng ${month}-${year}`, {
        views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }]
    });

    // Header styling
    const headerStyle = {
        font: { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
            top: {style:'thin', color: {argb:'FFFFFFFF'}}, 
            left: {style:'thin', color: {argb:'FFFFFFFF'}}, 
            bottom: {style:'thin', color: {argb:'FFFFFFFF'}}, 
            right: {style:'thin', color: {argb:'FFFFFFFF'}}
        }
    };

    // Columns setup
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    const columns = [
        { header: 'Họ Tên', key: 'name', width: 25 },
        { header: 'Vị Trí', key: 'position', width: 20 },
        { header: 'Địa Điểm', key: 'location', width: 20 },
        { header: 'Lương/Ngày', key: 'rate', width: 15 },
    ];

    const weekends = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${month}-${i.toString().padStart(2, '0')}`;
        const dayOfWeek = dayjs(dateStr).day();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekends.push(i);
        }
        columns.push({ header: i.toString(), key: `day_${i}`, width: 6 });
    }
    columns.push({ header: 'Tổng Công', key: 'total_days', width: 12 });
    columns.push({ header: 'Thành Tiền', key: 'total_salary', width: 18 });

    worksheet.columns = columns;

    // Insert a title row at the very top
    worksheet.spliceRows(1, 0, []); 
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `BẢNG CHẤM CÔNG THÁNG ${month}/${year}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F497D' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6EEF8' } };
    worksheet.getRow(1).height = 40;

    // Apply header styles to row 2
    const headerRow = worksheet.getRow(2);
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
        cell.style = headerStyle;
        // Subtly change color for weekend headers
        if (colNumber > 4 && colNumber <= 4 + daysInMonth) {
            const day = colNumber - 4;
            if (weekends.includes(day)) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } }; // Darker indigo for weekend headers
            }
        }
    });

    // Define normal row border
    const cellBorder = {
        top: {style:'thin', color: {argb:'FFDDDDDD'}}, 
        left: {style:'thin', color: {argb:'FFDDDDDD'}}, 
        bottom: {style:'thin', color: {argb:'FFDDDDDD'}}, 
        right: {style:'thin', color: {argb:'FFDDDDDD'}}
    };

    // Add data rows
    workers.forEach((worker, workerIndex) => {
        // Find all records for this worker in the current month
        const workerRecordsThisMonth = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${month}-${i.toString().padStart(2, '0')}`;
            const dayRecord = attendance.find(a => a.date === dateStr);
            const wRecord = dayRecord?.records.find(r => r.workerId === worker.id);
            if (wRecord) {
                workerRecordsThisMonth.push({ day: i, ...wRecord });
            }
        }

        // Group by unique (position, location, rate)
        const profiles = {};
        if (workerRecordsThisMonth.length === 0) {
            // Default profile if no work
            profiles['default'] = {
                position: worker.position,
                location: worker.location,
                rate: worker.dailyRate,
                records: []
            };
        } else {
            workerRecordsThisMonth.forEach(record => {
                const pos = record.position || worker.position || '';
                const loc = record.location || worker.location || '';
                const rate = record.dailyRate || worker.dailyRate || 0;
                const key = `${pos}_${loc}_${rate}`;
                if (!profiles[key]) {
                    profiles[key] = { position: pos, location: loc, rate: rate, records: [] };
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
                rate: profile.rate,
            };

            let totalDays = 0;
            for (let i = 1; i <= daysInMonth; i++) {
                const recordForDay = profile.records.find(r => r.day === i);
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
            row.height = 25; // slightly taller rows for better readability
            
            if (profileIndex === 0) {
                startRowIndex = row.number;
            }

            // Format cells in the row
            // Group rows by worker using alternate colors
            const isAlternateRow = workerIndex % 2 !== 0;
            const alternateFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFDFD' } };
            
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = cellBorder;
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                
                if (isAlternateRow) {
                    cell.fill = alternateFill;
                }

                if (colNumber > 3) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
                
                if (colNumber === 4) {
                     cell.alignment = { vertical: 'middle', horizontal: 'right' };
                }

                // Custom styling for day columns
                if (colNumber > 4 && colNumber <= 4 + daysInMonth) {
                    const day = colNumber - 4;
                    if (weekends.includes(day)) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Light gray for weekends
                    }
                    
                    if (cell.value === 0) {
                        cell.font = { color: { argb: 'FFEF4444' }, bold: true }; // Red for absent
                    } else if (cell.value === 0.5) {
                        cell.font = { color: { argb: 'FFF59E0B' }, bold: true }; // Orange for half day
                    } else if (cell.value === 1) {
                        cell.font = { color: { argb: 'FF10B981' } }; // Green for full day
                    }
                }
            });

            // Currency formatting and boldness
            const rateCell = row.getCell('rate');
            rateCell.numFmt = '#,##0 "₫"';
            
            const totalSalaryCell = row.getCell('total_salary');
            totalSalaryCell.numFmt = '#,##0 "₫"';
            totalSalaryCell.font = { bold: true, color: { argb: 'FF1F2937' } };
            totalSalaryCell.alignment = { vertical: 'middle', horizontal: 'right' };
            
            const totalDaysCell = row.getCell('total_days');
            totalDaysCell.font = { bold: true };
            totalDaysCell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // If a worker has multiple locations/profiles, merge the "Họ Tên" cells vertically
        if (profileValues.length > 1 && startRowIndex !== -1) {
            const endRowIndex = startRowIndex + profileValues.length - 1;
            worksheet.mergeCells(`A${startRowIndex}:A${endRowIndex}`);
            
            // Re-apply formatting for the merged cell (ExcelJS needs styling on the top-left cell of the merge)
            const mergedCell = worksheet.getCell(`A${startRowIndex}`);
            mergedCell.alignment = { vertical: 'middle', horizontal: 'left' };
            mergedCell.border = cellBorder;
            if (workerIndex % 2 !== 0) {
                mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFDFD' } };
            }
        }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Bang_Cham_Cong_${month}_${year}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
    });

    return { app, port, dataDir };
}

function startServer(options = {}) {
    const { app, port, dataDir } = createServer(options);

    return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
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
