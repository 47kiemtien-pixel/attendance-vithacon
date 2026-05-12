require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, VerticalAlign, ImageRun, BorderStyle, Header, Footer, HeightRule } = require('docx');
const { createJsonStore } = require('./stores/json-store');

async function createStore(options = {}) {
    const dataDir = options.dataDir || path.join(__dirname, 'data');
    return createJsonStore(dataDir);
}

// DOCX Generation Logic
async function buildWorkerReportDocx(worker, dateRange, attendance) {
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
                    new TableCell({
                        width: { size: 15, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ children: [logoImage] })],
                    }),
                    new TableCell({
                        width: { size: 85, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: 'CÔNG TY TNHH CƠ KHÍ XÂY DỰNG THƯƠNG MẠI VIỆT THÀNH', bold: true, size: 22, color: navy })],
                            }),
                            new Paragraph({
                                children: [new TextRun({ text: 'Địa chỉ: Milano ML127 KĐT Ecocity Premia, P. Tân An, Đắk Lắk', size: 16, color: slate })],
                            }),
                            new Paragraph({
                                children: [new TextRun({ text: 'Điện thoại: 0972 524 799  |  Mail: vietthanh.me.con@gmail.com', size: 16, color: slate })],
                            }),
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
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ĐỊA ĐIỂM CÔNG TÁC', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TRẠNG THÁI', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'GHI CHÚ', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: navy }, verticalAlign: VerticalAlign.CENTER }),
            ],
            height: { value: 500, rule: HeightRule.ATLEAST },
        }),
    ];

    let totalFull = 0;
    for (let i = 0; i < daysCount; i++) {
        const d = startDate.add(i, 'day');
        const dayRec = attendance.find(a => a.date === d.format('YYYY-MM-DD'));
        const rec = dayRec?.records.find(r => String(r.workerId) === String(worker.id));
        
        let statusText = '-';
        let statusColor = '64748B';
        if (rec) {
            if (rec.status === 'Full') { statusText = 'CÔNG'; statusColor = '15803d'; totalFull += 1; }
            else if (rec.status === 'Half') { statusText = '1/2 CÔNG'; statusColor = 'B45309'; totalFull += 0.5; }
            else if (rec.status === 'Holiday') { statusText = 'NGHỈ LỄ'; statusColor = 'B91C1C'; }
        }

        tableRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: `${vnDays[d.day()]} (${d.format('DD/MM')})` })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ text: rec?.location || '-', alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: statusText, bold: true, color: statusColor })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
                new TableCell({ children: [new Paragraph({ text: rec?.note || '-', alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: { left: BorderStyle.NONE, right: BorderStyle.NONE, top: { style: BorderStyle.SINGLE, color: borderGray }, bottom: { style: BorderStyle.SINGLE, color: borderGray } } }),
            ],
            height: { value: 450, rule: HeightRule.ATLEAST },
        }));
    }

    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
        sections: [{
            children: [
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
                new Paragraph({
                    children: [
                        new TextRun({ text: `Tổng số công: `, bold: true, size: 24, color: slate }),
                        new TextRun({ text: `${totalFull}`, bold: true, size: 36, color: navy }),
                    ],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 600 },
                }),
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
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: '', spacing: { before: 1200 } })] }),
                                new TableCell({ children: [new Paragraph({ text: '', spacing: { before: 1200 } })] }),
                            ],
                        }),
                    ],
                }),
            ],
        }],
    });
    return await Packer.toBuffer(doc);
}

// Server Core
async function createServer(options = {}) {
    const app = express();
    const port = 5005; 
    const store = await createStore(options);
    app.use(cors());
    app.use(bodyParser.json());

    // Workers API
    app.get('/api/workers', async (req, res) => res.json(await store.getWorkers()));
    app.post('/api/workers', async (req, res) => res.json(await store.addWorker(req.body)));
    app.put('/api/workers/:id', async (req, res) => res.json(await store.updateWorker(req.params.id, req.body)));

    // Attendance API
    app.get('/api/attendance', async (req, res) => res.json(await store.getAttendance()));
    app.post('/api/attendance', async (req, res) => {
        const { date, records } = req.body;
        res.json(await store.saveAttendance(date, records));
    });
    app.post('/api/attendance/record', async (req, res) => {
        const { date, workerId, status, dailyRate, position, location, note } = req.body;
        res.json(await store.saveAttendanceRecord(date, workerId, status, dailyRate, position, location, note));
    });

    // Settings API
    app.get('/api/settings', async (req, res) => res.json(await store.getSettings()));
    app.post('/api/settings', async (req, res) => res.json(await store.saveSettings(req.body)));

    // Auth Status (Stub)
    app.get('/api/auth/status', (req, res) => res.json({ authRequired: false }));

    // Export Excel (All workers)
    app.get('/api/export', async (req, res) => {
        try {
            const { month, year } = req.query;
            const workers = await store.getWorkers();
            const attendance = await store.getAttendance();
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet(`Tháng ${month}-${year}`);
            
            sheet.addRow(['STT', 'Họ và tên', ...Array.from({ length: 31 }, (_, i) => i + 1), 'Tổng công']);
            workers.forEach((w, idx) => {
                let total = 0;
                const rowData = [idx + 1, w.name];
                for(let d=1; d<=31; d++) {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const att = attendance.find(a => a.date === dateStr);
                    const rec = att?.records.find(r => String(r.workerId) === String(w.id));
                    if (rec?.status === 'Full') { total += 1; rowData.push(1); }
                    else if (rec?.status === 'Half') { total += 0.5; rowData.push(0.5); }
                    else rowData.push('');
                }
                rowData.push(total);
                sheet.addRow(rowData);
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Bang_Cham_Cong_Thang_${month}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();
        } catch (e) { res.status(500).send(e.message); }
    });

    // Export Excel (Individual worker)
    app.get('/api/export/worker', async (req, res) => {
        try {
            const { workerId, startDate, endDate } = req.query;
            const workers = await store.getWorkers();
            const worker = workers.find(w => String(w.id) === String(workerId));
            const attendance = await store.getAttendance();
            
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Bao Cao');
            sheet.addRow(['THỨ / NGÀY', 'ĐỊA ĐIỂM', 'TRẠNG THÁI', 'GHI CHÚ']);
            
            let current = dayjs(startDate);
            const end = dayjs(endDate);
            let total = 0;
            while(current.isBefore(end) || current.isSame(end)) {
                const dateStr = current.format('YYYY-MM-DD');
                const att = attendance.find(a => a.date === dateStr);
                const rec = att?.records.find(r => String(r.workerId) === String(workerId));
                let status = '-';
                if(rec?.status === 'Full') { status = 'CÔNG'; total += 1; }
                else if(rec?.status === 'Half') { status = '1/2 CÔNG'; total += 0.5; }
                
                sheet.addRow([current.format('DD/MM/YYYY'), rec?.location || '-', status, rec?.note || '-']);
                current = current.add(1, 'day');
            }
            sheet.addRow([]);
            sheet.addRow(['TỔNG CỘNG', '', total]);
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Bao_Cao_Excel_${worker.name}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();
        } catch (e) { res.status(500).send(e.message); }
    });

    // Export Word Premium
    app.get('/api/export/worker/docx', async (req, res) => {
        try {
            const { workerId, startDate, endDate } = req.query;
            const workers = await store.getWorkers();
            const worker = workers.find(w => String(w.id) === String(workerId));
            const attendance = await store.getAttendance();
            const buffer = await buildWorkerReportDocx(worker, { start: startDate, end: endDate }, attendance);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'attachment; filename=Bao_Cao_Hoan_Thien.docx');
            res.end(buffer, 'binary');
        } catch (e) {
            console.error(e);
            res.status(500).send(e.message);
        }
    });

    return { app, port };
}

async function startServer(options = {}) {
    const { app, port } = await createServer(options);
    return app.listen(port, '0.0.0.0', () => { console.log(`Server started on ${port}`); });
}

module.exports = { createServer, startServer };
if (require.main === module) startServer();
