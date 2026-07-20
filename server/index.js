require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, VerticalAlign, ImageRun, BorderStyle, HeightRule, PageBreak } = require('docx');
const { createJsonStore } = require('./stores/json-store');
const { createPostgresStore } = require('./stores/postgres-store');

async function createStore(options = {}) {
    const dataDir = options.dataDir || path.join(__dirname, 'data');
    const driver = options.driver
        || process.env.ATTENDANCE_DATA_DRIVER
        || (process.env.DATABASE_URL || process.env.PGHOST ? 'postgres' : 'json');

    if (driver === 'postgres') {
        const importLegacyJson = options.importLegacyJson
            ?? process.env.ATTENDANCE_IMPORT_LEGACY_JSON === 'true';
        return createPostgresStore({ ...options, dataDir, importLegacyJson });
    }

    return createJsonStore(dataDir);
}

// DOCX Generation Logic
function buildWorkerReportChildren(worker, dateRange, attendance, options = {}) {
    if (!worker) throw new Error('Worker not found');
    const logoPath = path.join(__dirname, '..', 'client', 'public', 'logo.png');
    let logoImage = null;
    if (fs.existsSync(logoPath)) {
        logoImage = new ImageRun({
            data: fs.readFileSync(logoPath),
            transformation: { width: 55, height: 55 },
        });
    }

    const navy = '1E3A8A';
    const slate = '475569';
    const borderGray = 'E2E8F0';

    const startDate = dayjs(dateRange.start);
    const endDate = dayjs(dateRange.end);
    const daysCount = endDate.diff(startDate, 'day') + 1;
    const vnDays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: BorderStyle.NONE, bottom: BorderStyle.NONE, left: BorderStyle.NONE, right: BorderStyle.NONE, insideHorizontal: BorderStyle.NONE, insideVertical: BorderStyle.NONE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [logoImage] })] }),
                    new TableCell({
                        width: { size: 85, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({ children: [new TextRun({ text: 'CÔNG TY TNHH CƠ KHÍ XÂY DỰNG THƯƠNG MẠI VIỆT THÀNH', bold: true, size: 22, color: navy })] }),
                            new Paragraph({ children: [new TextRun({ text: 'Địa chỉ: Milano ML127 KĐT Ecocity Premia, P. Tân An, Đắk Lắk', size: 16, color: slate })] }),
                            new Paragraph({ children: [new TextRun({ text: 'Điện thoại: 0972 524 799  |  Mail: vietthanh.me.con@gmail.com', size: 16, color: slate })] }),
                        ],
                        verticalAlign: VerticalAlign.CENTER,
                    }),
                ],
            }),
        ],
    });

    const tableRows = [
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'THỨ / NGÀY', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ĐỊA ĐIỂM', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TRẠNG THÁI', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'LƯƠNG NGÀY', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TIỀN CÔNG', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TIỀN XE', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'GHI CHÚ', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
            ],
            height: { value: 500, rule: HeightRule.ATLEAST },
        }),
    ];

    let totalFull = 0;
    let totalTravelCost = 0;
    let totalWage = 0;
    for (let i = 0; i < daysCount; i++) {
        const d = startDate.add(i, 'day');
        const dayRec = attendance.find(a => a.date === d.format('YYYY-MM-DD'));
        const rec = dayRec?.records.find(r => String(r.workerId) === String(worker.id));
        let statusText = '-';
        let statusColor = '64748B';
        let dailyRateText = '-';
        let wageText = '-';
        if (rec) {
            totalTravelCost += Number(rec.travelCost || 0);
            const rate = Number(rec.dailyRate || 0);
            let wage = 0;
            if (rec.status === 'Full') {
                statusText = 'CÔNG';
                totalFull += 1;
                statusColor = '15803d';
                wage = rate;
            }
            else if (rec.status === 'Half') {
                statusText = '1/2 CÔNG';
                totalFull += 0.5;
                statusColor = 'B45309';
                wage = rate * 0.5;
            }
            else if (rec.status === 'Holiday') { statusText = 'NGHỈ LỄ'; statusColor = 'B91C1C'; }
            else if (rec.status === 'Leave') { statusText = 'PHÉP'; statusColor = '2563EB'; }
            else if (rec.status === 'Absent') { statusText = 'NGHỈ'; statusColor = '991B1B'; }
            else if (rec.status === 'Travel') { statusText = 'DI CHUYỂN'; statusColor = '7C3AED'; }

            if (rate > 0) {
                dailyRateText = `${rate.toLocaleString('vi-VN')}đ`;
            }
            if (wage > 0) {
                wageText = `${wage.toLocaleString('vi-VN')}đ`;
                totalWage += wage;
            }
        }
        tableRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: `${vnDays[d.day()]} (${d.format('DD/MM')})` })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ text: rec?.location || '-', alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: statusText, bold: true, color: statusColor })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ text: dailyRateText, alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ text: wageText, alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ text: rec?.travelCost > 0 ? `${rec.travelCost.toLocaleString('vi-VN')}đ` : '-', alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ text: rec?.note || '-', alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
            ],
            height: { value: 450, rule: HeightRule.ATLEAST },
        }));
    }

    return [
        ...(options.pageBreakBefore ? [new Paragraph({ children: [new PageBreak()] })] : []),
        headerTable,
                new Paragraph({ border: { bottom: { color: navy, size: 6, style: BorderStyle.SINGLE } }, spacing: { after: 300 } }),
                new Paragraph({ children: [new TextRun({ text: 'BẢNG CHẤM CÔNG CHI TIẾT', bold: true, size: 40, color: '111827' })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'NHÂN VIÊN: ', size: 20, color: slate }),
                        new TextRun({ text: worker.name.toUpperCase(), bold: true, size: 20, color: '000000' }),
                        new TextRun({ text: '    |    MÃ THỢ: ', size: 20, color: slate }),
                        new TextRun({ text: `VH-${String(worker.id).padStart(3, '0')}`, bold: true, size: 20, color: '000000' }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Kỳ báo cáo: Từ ${dayjs(dateRange.start).format('DD/MM/YYYY')} đến ${dayjs(dateRange.end).format('DD/MM/YYYY')}`, italic: true, size: 16, color: slate })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),
                new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                new Paragraph({ text: '', spacing: { before: 300 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: BorderStyle.NONE, bottom: BorderStyle.NONE, left: BorderStyle.NONE, right: BorderStyle.NONE, insideHorizontal: BorderStyle.NONE, insideVertical: BorderStyle.NONE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ 
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: 'Tổng số công: ', size: 20, color: slate }),
                                                new TextRun({ text: `${totalFull}`, bold: true, size: 20, color: navy }),
                                            ]
                                        }),
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: 'Tổng lương: ', size: 20, color: slate }),
                                                new TextRun({ text: `${totalWage.toLocaleString('vi-VN')}đ`, bold: true, size: 20, color: navy }),
                                            ]
                                        })
                                    ] 
                                }),
                                new TableCell({ 
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: 'Tiền xe/Di chuyển: ', size: 20, color: slate }),
                                                new TextRun({ text: `${totalTravelCost.toLocaleString('vi-VN')}đ`, bold: true, size: 20, color: 'B45309' }),
                                            ],
                                            alignment: AlignmentType.RIGHT,
                                        }),
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: 'Thực nhận: ', bold: true, size: 22, color: slate }),
                                                new TextRun({ text: `${(totalWage + totalTravelCost).toLocaleString('vi-VN')}đ`, bold: true, size: 26, color: '15803d' }),
                                            ],
                                            alignment: AlignmentType.RIGHT,
                                        })
                                    ] 
                                }),
                            ]
                        })
                    ]
                }),
                new Paragraph({ text: '', spacing: { before: 600 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: BorderStyle.NONE, bottom: BorderStyle.NONE, left: BorderStyle.NONE, right: BorderStyle.NONE, insideHorizontal: BorderStyle.NONE, insideVertical: BorderStyle.NONE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'NGƯỜI LẬP BIỂU', bold: true, size: 20 })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'GIÁM ĐỐC XÁC NHẬN', bold: true, size: 20 })], alignment: AlignmentType.CENTER })] }),
                            ],
                        }),
                        new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: '', spacing: { before: 1200 } })] }), new TableCell({ children: [new Paragraph({ text: '', spacing: { before: 1200 } })] })] }),
                    ],
                }),
    ];
}

async function buildWorkerReportDocx(worker, dateRange, attendance) {
    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
        sections: [{ children: buildWorkerReportChildren(worker, dateRange, attendance) }],
    });
    return await Packer.toBuffer(doc);
}

function buildWorkersSummaryChildren(workers, dateRange, attendance) {
    let allWorkersWorkTotal = 0;
    let allWorkersWageTotal = 0;
    const rows = [
        new TableRow({
            children: ['STT', 'HỌ VÀ TÊN', 'TỔNG SỐ CÔNG', 'TỔNG LƯƠNG'].map((text) => new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
                    alignment: AlignmentType.CENTER,
                })],
                shading: { fill: '1E3A8A' },
                verticalAlign: VerticalAlign.CENTER,
            })),
        }),
    ];

    workers.forEach((worker, index) => {
        const { workTotal, wageTotal } = calculateWorkerReportTotals(worker, dateRange, attendance);
        allWorkersWorkTotal += workTotal;
        allWorkersWageTotal += wageTotal;
        rows.push(new TableRow({
            children: [
                `${index + 1}`,
                worker.name,
                `${workTotal}`,
                `${wageTotal.toLocaleString('vi-VN')}đ`,
            ].map((text) => new TableCell({
                children: [new Paragraph({ text, alignment: AlignmentType.CENTER })],
                verticalAlign: VerticalAlign.CENTER,
            })),
        }));
    });

    rows.push(new TableRow({
        children: [
            new TableCell({
                columnSpan: 2,
                children: [new Paragraph({
                    children: [new TextRun({ text: 'TỔNG CỘNG', bold: true })],
                    alignment: AlignmentType.CENTER,
                })],
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: `${allWorkersWorkTotal}`, bold: true })],
                    alignment: AlignmentType.CENTER,
                })],
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: `${allWorkersWageTotal.toLocaleString('vi-VN')}đ`, bold: true, color: '15803D' })],
                    alignment: AlignmentType.CENTER,
                })],
            }),
        ],
    }));

    return [
        new Paragraph({
            children: [new TextRun({ text: 'BẢNG TỔNG HỢP LƯƠNG', bold: true, size: 36, color: '1E3A8A' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
        }),
        new Paragraph({
            text: `Từ ${dayjs(dateRange.start).format('DD/MM/YYYY')} đến ${dayjs(dateRange.end).format('DD/MM/YYYY')}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Tổng lương tất cả nhân công: ', bold: true, size: 24 }),
                new TextRun({ text: `${allWorkersWageTotal.toLocaleString('vi-VN')}đ`, bold: true, size: 28, color: '15803D' }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400 },
        }),
    ];
}

async function buildWorkersReportDocx(workers, dateRange, attendance) {
    const children = [
        ...buildWorkersSummaryChildren(workers, dateRange, attendance),
        ...workers.flatMap((worker) => buildWorkerReportChildren(worker, dateRange, attendance, {
            pageBreakBefore: true,
        })),
    ];

    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
        sections: [{ children }],
    });

    return await Packer.toBuffer(doc);
}

function parseWorkerIds(workerIds) {
    if (!workerIds || workerIds === 'all') return null;
    return String(workerIds)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
}

function getWorkersByIds(workers, workerIds) {
    const ids = parseWorkerIds(workerIds);
    if (!ids) return workers;

    const selected = workers.filter((worker) => ids.includes(String(worker.id)));
    if (!selected.length) throw new Error('No workers selected');
    return selected;
}

function getSafeSheetName(worker, index) {
    const baseName = String(worker.name || `Worker ${index + 1}`)
        .replace(/[\\/?*[\]:]/g, ' ')
        .trim()
        .slice(0, 25);
    return `${index + 1}-${baseName || 'Worker'}`.slice(0, 31);
}

function calculateWorkerReportTotals(worker, dateRange, attendance) {
    let current = dayjs(dateRange.start);
    const end = dayjs(dateRange.end);
    let workTotal = 0;
    let wageTotal = 0;

    while (current.isBefore(end) || current.isSame(end)) {
        const attendanceDay = attendance.find((item) => item.date === current.format('YYYY-MM-DD'));
        const record = attendanceDay?.records.find((item) => String(item.workerId) === String(worker.id));
        const dailyRate = Number(record?.dailyRate || 0);

        if (record?.status === 'Full') {
            workTotal += 1;
            wageTotal += dailyRate;
        } else if (record?.status === 'Half') {
            workTotal += 0.5;
            wageTotal += dailyRate * 0.5;
        }

        current = current.add(1, 'day');
    }

    return { workTotal, wageTotal };
}

function addWorkersSummarySheet(workbook, workers, dateRange, attendance) {
    const sheet = workbook.addWorksheet('Tổng hợp');
    sheet.addRow(['STT', 'HỌ VÀ TÊN', 'TỔNG SỐ CÔNG', 'TỔNG LƯƠNG']);

    let allWorkersWorkTotal = 0;
    let allWorkersWageTotal = 0;
    workers.forEach((worker, index) => {
        const { workTotal, wageTotal } = calculateWorkerReportTotals(worker, dateRange, attendance);
        allWorkersWorkTotal += workTotal;
        allWorkersWageTotal += wageTotal;
        sheet.addRow([index + 1, worker.name, workTotal, wageTotal]);
    });

    sheet.addRow([]);
    sheet.addRow(['TỔNG CỘNG', '', allWorkersWorkTotal, allWorkersWageTotal]);
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 18;
    sheet.getColumn(4).width = 22;
    sheet.getColumn(4).numFmt = '#,##0"đ"';
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(sheet.rowCount).font = { bold: true };
}

function addWorkerReportSheet(workbook, worker, dateRange, attendance, index) {
    const sheet = workbook.addWorksheet(getSafeSheetName(worker, index));
    sheet.addRow(['THỨ / NGÀY', 'ĐỊA ĐIỂM', 'TRẠNG THÁI', 'LƯƠNG NGÀY', 'TIỀN CÔNG', 'TIỀN XE', 'GHI CHÚ']);

    let current = dayjs(dateRange.start);
    const end = dayjs(dateRange.end);
    let total = 0;
    let travelTotal = 0;
    let wageTotal = 0;

    while(current.isBefore(end) || current.isSame(end)) {
        const dateStr = current.format('YYYY-MM-DD');
        const att = attendance.find(a => a.date === dateStr);
        const rec = att?.records.find(r => String(r.workerId) === String(worker.id));
        let status = '-';
        const rate = Number(rec?.dailyRate || 0);
        let wage = 0;
        if(rec?.status === 'Full') { status = 'CÔNG'; total += 1; wage = rate; }
        else if(rec?.status === 'Half') { status = '1/2 CÔNG'; total += 0.5; wage = rate * 0.5; }
        else if(rec?.status === 'Absent') { status = 'NGHỈ'; }
        else if(rec?.status === 'Travel') { status = 'DI CHUYỂN'; }
        else if(rec?.status === 'Holiday') { status = 'NGHỈ LỄ'; }
        else if(rec?.status === 'Leave') { status = 'PHÉP'; }
        
        const tCost = Number(rec?.travelCost || 0);
        travelTotal += tCost;
        wageTotal += wage;
        
        sheet.addRow([
            current.format('DD/MM/YYYY'),
            rec?.location || '-',
            status,
            rate > 0 ? rate : '-',
            wage > 0 ? wage : '-',
            tCost > 0 ? tCost : '-',
            rec?.note || '-'
        ]);
        current = current.add(1, 'day');
    }

    sheet.addRow([]);
    sheet.addRow(['TỔNG CỘNG', '', total, 'Tổng lương:', wageTotal, 'Tổng tiền xe:', travelTotal]);
    sheet.addRow(['THỰC NHẬN', '', '', '', wageTotal + travelTotal, '', '']);
    sheet.columns.forEach((column) => {
        column.width = 18;
    });
}

function sanitizeFilenamePart(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60);
}

function dateRangePart(startDate, endDate) {
    return `${startDate}_den_${endDate}`;
}

function buildReportFilename(parts, extension) {
    const filename = ['Viet_Thanh', ...parts]
        .map(sanitizeFilenamePart)
        .filter(Boolean)
        .join('_');
    return `${filename}.${extension}`;
}

function setDownloadFilename(res, filename) {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

// Server Core
async function createServer(options = {}) {
    const app = express();
    const port = Number(options.port || process.env.ATTENDANCE_SERVER_PORT || 5005);
    const store = await createStore(options);
    app.use(cors());
    app.use(bodyParser.json());

    // Workers
    app.get('/api/workers', async (req, res) => res.json(await store.getWorkers()));
    app.post('/api/workers', async (req, res) => res.json(await store.createWorker(req.body)));
    app.put('/api/workers/:id', async (req, res) => res.json(await store.updateWorker(req.params.id, req.body)));

    // Attendance
    app.get('/api/attendance', async (req, res) => res.json(await store.getAttendance()));
    app.post('/api/attendance', async (req, res) => res.json(await store.replaceAttendanceForDate(req.body.date, req.body.records)));
    app.post('/api/attendance/record', async (req, res) => {
        const { date, workerId, status, dailyRate, position, location, note, travelCost } = req.body;
        const result = await store.upsertAttendanceRecord(date, workerId, { status, dailyRate, position, location, note, travelCost });
        res.json(result || { success: true });
    });

    // Settings
    app.get('/api/settings', async (req, res) => res.json(await store.getSettings()));
    app.post('/api/settings', async (req, res) => res.json(await store.saveSettings(req.body)));
    app.get('/api/auth/status', (req, res) => res.json({ authRequired: false }));

    // Export Excel (All)
    app.get('/api/export', async (req, res) => {
        try {
            const { month, year } = req.query;
            const allWorkers = await store.getWorkers();
            const attendance = await store.getAttendance();
            
            // Filter workers: keep active workers OR workers who had attendance records in this month
            const workers = allWorkers.filter(w => {
                if (w.status !== 'resigned') return true;
                return attendance.some(att => {
                    if (!att.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)) return false;
                    return att.records.some(r => String(r.workerId) === String(w.id));
                });
            });

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet(`Tháng ${month}-${year}`);
            sheet.addRow(['STT', 'Họ và tên', ...Array.from({ length: 31 }, (_, i) => i + 1), 'Tổng công', 'Tổng tiền công', 'Tổng tiền xe', 'Thực nhận']);
            workers.forEach((w, idx) => {
                let total = 0;
                let travelTotal = 0;
                let wageTotal = 0;
                const rowData = [idx + 1, w.name];
                for(let d=1; d<=31; d++) {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const att = attendance.find(a => a.date === dateStr);
                    const rec = att?.records.find(r => String(r.workerId) === String(w.id));
                    travelTotal += Number(rec?.travelCost || 0);
                    if (rec?.status === 'Full') {
                        total += 1;
                        wageTotal += Number(rec.dailyRate || 0);
                        rowData.push(1);
                    }
                    else if (rec?.status === 'Half') {
                        total += 0.5;
                        wageTotal += Number(rec.dailyRate || 0) * 0.5;
                        rowData.push(0.5);
                    }
                    else if (rec?.status === 'Absent' || rec?.status === 'Leave' || rec?.status === 'Travel' || rec?.status === 'Holiday') {
                        rowData.push(0);
                    }
                    else rowData.push('');
                }
                rowData.push(total);
                rowData.push(wageTotal);
                rowData.push(travelTotal);
                rowData.push(wageTotal + travelTotal);
                sheet.addRow(rowData);
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            setDownloadFilename(res, buildReportFilename(['Bang_Cong_Thang', month, year], 'xlsx'));
            await workbook.xlsx.write(res);
            res.end();
        } catch (e) { console.error('Excel Export Error:', e); res.status(500).send(e.message); }
    });

    // Export Excel (Individual)
    app.get('/api/export/worker', async (req, res) => {
        try {
            const { workerId, startDate, endDate } = req.query;
            if (!workerId) return res.status(400).send('Worker ID is required');
            const workers = await store.getWorkers();
            const worker = workers.find(w => String(w.id) === String(workerId));
            if (!worker) return res.status(404).send('Worker not found');
            const attendance = await store.getAttendance();
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Bao Cao');
            sheet.addRow(['THỨ / NGÀY', 'ĐỊA ĐIỂM', 'TRẠNG THÁI', 'LƯƠNG NGÀY', 'TIỀN CÔNG', 'TIỀN XE', 'GHI CHÚ']);
            let current = dayjs(startDate);
            const end = dayjs(endDate);
            let total = 0;
            let travelTotal = 0;
            let wageTotal = 0;
            while(current.isBefore(end) || current.isSame(end)) {
                const dateStr = current.format('YYYY-MM-DD');
                const att = attendance.find(a => a.date === dateStr);
                const rec = att?.records.find(r => String(r.workerId) === String(workerId));
                let status = '-';
                const rate = Number(rec?.dailyRate || 0);
                let wage = 0;
                if(rec?.status === 'Full') { status = 'CÔNG'; total += 1; wage = rate; }
                else if(rec?.status === 'Half') { status = '1/2 CÔNG'; total += 0.5; wage = rate * 0.5; }
                else if(rec?.status === 'Absent') { status = 'NGHỈ'; }
                else if(rec?.status === 'Travel') { status = 'DI CHUYỂN'; }
                else if(rec?.status === 'Holiday') { status = 'NGHỈ LỄ'; }
                else if(rec?.status === 'Leave') { status = 'PHÉP'; }
                
                const tCost = Number(rec?.travelCost || 0);
                travelTotal += tCost;
                wageTotal += wage;
                
                sheet.addRow([
                    current.format('DD/MM/YYYY'),
                    rec?.location || '-',
                    status,
                    rate > 0 ? rate : '-',
                    wage > 0 ? wage : '-',
                    tCost > 0 ? tCost : '-',
                    rec?.note || '-'
                ]);
                current = current.add(1, 'day');
            }
            sheet.addRow([]);
            sheet.addRow(['TỔNG CỘNG', '', total, 'Tổng lương:', wageTotal, 'Tổng tiền xe:', travelTotal]);
            sheet.addRow(['THỰC NHẬN', '', '', '', wageTotal + travelTotal, '', '']);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            setDownloadFilename(res, buildReportFilename(['Bao_Cao_Ca_Nhan', worker.name, dateRangePart(startDate, endDate)], 'xlsx'));
            await workbook.xlsx.write(res);
            res.end();
        } catch (e) { console.error('Individual Excel Export Error:', e); res.status(500).send(e.message); }
    });

    // Export Excel (Multiple workers)
    app.get('/api/export/workers', async (req, res) => {
        try {
            const { workerIds, startDate, endDate } = req.query;
            const workers = getWorkersByIds(await store.getWorkers(), workerIds);
            const attendance = await store.getAttendance();
            const workbook = new ExcelJS.Workbook();

            addWorkersSummarySheet(workbook, workers, { start: startDate, end: endDate }, attendance);
            workers.forEach((worker, index) => {
                addWorkerReportSheet(workbook, worker, { start: startDate, end: endDate }, attendance, index);
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            setDownloadFilename(res, buildReportFilename(['Bao_Cao_Nhieu_Nguoi', dateRangePart(startDate, endDate)], 'xlsx'));
            await workbook.xlsx.write(res);
            res.end();
        } catch (e) { console.error('Multiple Excel Export Error:', e); res.status(500).send(e.message); }
    });

    // Export Word
    app.get('/api/export/worker/docx', async (req, res) => {
        try {
            const { workerId, startDate, endDate } = req.query;
            const workers = await store.getWorkers();
            const worker = workers.find(w => String(w.id) === String(workerId));
            const attendance = await store.getAttendance();
            const buffer = await buildWorkerReportDocx(worker, { start: startDate, end: endDate }, attendance);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            setDownloadFilename(res, buildReportFilename(['Bao_Cao_Ca_Nhan', worker?.name, dateRangePart(startDate, endDate)], 'docx'));
            res.end(buffer, 'binary');
        } catch (e) { console.error('DOCX Export Error:', e); res.status(500).send(e.message); }
    });

    // Export Word (Multiple workers, one page per worker)
    app.get('/api/export/workers/docx', async (req, res) => {
        try {
            const { workerIds, startDate, endDate } = req.query;
            const workers = getWorkersByIds(await store.getWorkers(), workerIds);
            const attendance = await store.getAttendance();
            const buffer = await buildWorkersReportDocx(workers, { start: startDate, end: endDate }, attendance);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            setDownloadFilename(res, buildReportFilename(['Bao_Cao_Nhieu_Nguoi', dateRangePart(startDate, endDate)], 'docx'));
            res.end(buffer, 'binary');
        } catch (e) { console.error('Multiple DOCX Export Error:', e); res.status(500).send(e.message); }
    });

    return { app, port };
}

async function startServer(options = {}) {
    const { app, port } = await createServer(options);
    return app.listen(port, '0.0.0.0', () => { console.log(`Server started on ${port}`); });
}

module.exports = { createServer, startServer };
if (require.main === module) startServer();
