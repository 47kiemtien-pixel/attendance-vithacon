import dayjs from 'dayjs';
import { formatVndCurrency } from './currency';

function sanitizeFilename(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

function getDayOfWeekName(d) {
  const day = dayjs(d).day();
  switch (day) {
    case 0: return 'Chủ nhật';
    case 1: return 'Thứ 2';
    case 2: return 'Thứ 3';
    case 3: return 'Thứ 4';
    case 4: return 'Thứ 5';
    case 5: return 'Thứ 6';
    case 6: return 'Thứ 7';
    default: return '';
  }
}

function loadQrImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    // Timeout after 3.5 seconds in case network hangs
    setTimeout(() => resolve(null), 3500);
  });
}

export async function generateWorkerPayrollCanvas(worker, dateRange, attendance) {
  const rows = [];
  let current = dayjs(dateRange.start);
  const end = dayjs(dateRange.end);

  let totalWorkDays = 0;
  let totalWage = 0;

  while (current.isBefore(end) || current.isSame(end)) {
    const dateStr = current.format('YYYY-MM-DD');
    const dayRec = attendance.find((a) => a.date === dateStr);
    const rec = dayRec?.records.find((r) => String(r.workerId) === String(worker.id));

    let statusText = '-';
    let statusType = 'none';
    const rate = Number(rec?.dailyRate || worker.dailyRate || 0);
    let wage = 0;

    if (rec?.status === 'Full') {
      statusText = 'ĐỦ CÔNG';
      statusType = 'full';
      totalWorkDays += 1;
      wage = rate;
    } else if (rec?.status === 'Half') {
      statusText = '1/2 CÔNG';
      statusType = 'half';
      totalWorkDays += 0.5;
      wage = rate * 0.5;
    } else if (rec?.status === 'Absent') {
      statusText = 'NGHỈ';
      statusType = 'absent';
    } else if (rec?.status === 'Travel') {
      statusText = 'DI CHUYỂN';
      statusType = 'travel';
    } else if (rec?.status === 'Holiday') {
      statusText = 'NGHỈ LỄ';
      statusType = 'holiday';
    } else if (rec?.status === 'Leave') {
      statusText = 'PHÉP';
      statusType = 'leave';
    }

    totalWage += wage;

    rows.push({
      dateStr: current.format('DD/MM/YYYY'),
      dayOfWeek: getDayOfWeekName(current),
      location: rec?.location || '-',
      statusText,
      statusType,
      rate,
      wage,
      note: rec?.note || ''
    });

    current = current.add(1, 'day');
  }

  const netSalary = totalWage;

  // Prepare QR Code if bank account exists
  // Uses 'compact' template so that NO 'Số tiền: 0đ' or memo footer is generated
  let qrImage = null;
  if (worker.bankAccount && (worker.bankBin || worker.bankShortName)) {
    const accountHolder = (worker.bankAccountHolder || '').toUpperCase();
    const query = accountHolder ? `?accountName=${encodeURIComponent(accountHolder)}` : '';
    // template 'compact' has VietQR header & Bank/Napas footer, without any default amount box
    const qrUrl = `https://img.vietqr.io/image/${worker.bankBin}-${worker.bankAccount}-compact.png${query}`;
    qrImage = await loadQrImage(qrUrl);
  }

  // Layout Dimensions & Scale
  const scale = 2; // High-resolution retina export
  const canvasWidth = 880;
  const paddingX = 40;
  const contentWidth = canvasWidth - paddingX * 2; // 800px

  // QR display dimensions (square for compact template: 540x540)
  const qrBoxSize = 250;
  const qrImageSize = 230;

  const topPadding = 32;
  const headerSectionHeight = 118;
  const workerCardHeight = 84;
  const tableHeaderHeight = 40;
  const rowHeight = 34;
  const tableTotalHeight = tableHeaderHeight + rows.length * rowHeight + 40;
  const netSalaryHeight = 60;
  const paymentSectionHeight = qrImage ? (qrBoxSize + 48) : (worker.bankAccount ? 120 : 70);
  const signatureSectionHeight = 100;
  const footerHeight = 40;

  const canvasHeight = topPadding 
    + headerSectionHeight 
    + workerCardHeight 
    + tableTotalHeight 
    + netSalaryHeight 
    + paymentSectionHeight 
    + signatureSectionHeight 
    + footerHeight 
    + 60;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer elegant frame border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(14, 14, canvasWidth - 28, canvasHeight - 28);

  // Top Accent Brand Bar
  const topGrad = ctx.createLinearGradient(14, 14, canvasWidth - 14, 14);
  topGrad.addColorStop(0, '#0f766e');
  topGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = topGrad;
  ctx.fillRect(14, 14, canvasWidth - 28, 6);

  let y = topPadding + 6;

  // 1. Header Section: Corporate Metadata & Document Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 14px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '0.5px';
  ctx.fillText('CÔNG TY TNHH CƠ KHÍ XÂY DỰNG THƯƠNG MẠI VIỆT THÀNH', canvasWidth / 2, y);

  y += 20;
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('HỆ THỐNG QUẢN LÝ THI CÔNG & CHẤM CÔNG NHÂN SỰ', canvasWidth / 2, y);

  y += 16;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX + 60, y);
  ctx.lineTo(canvasWidth - paddingX - 60, y);
  ctx.stroke();

  y += 26;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '0.3px';
  ctx.fillText('BẢNG THANH TOÁN TIỀN LƯƠNG CHI TIẾT', canvasWidth / 2, y);

  y += 24;
  // Sub-bar with Period and Reference Code
  const periodStr = `Kỳ lương: ${dayjs(dateRange.start).format('DD/MM/YYYY')} - ${dayjs(dateRange.end).format('DD/MM/YYYY')}`;
  const refCodeStr = `Mã phiếu: PL-${String(worker.id).padStart(3, '0')}/${dayjs(dateRange.end).format('MMYY')}`;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = '500 12.5px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${periodStr}   •   ${refCodeStr}`, canvasWidth / 2, y);

  y += 26;

  // 2. Worker Information Card (Refined 2-column accounting card)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, workerCardHeight, 10);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Subtle vertical divider inside worker card
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX + contentWidth / 2, y + 12);
  ctx.lineTo(paddingX + contentWidth / 2, y + workerCardHeight - 12);
  ctx.stroke();

  ctx.textAlign = 'left';
  // Column 1: Worker Info
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('HỌ VÀ TÊN CÔNG NHÂN', paddingX + 20, y + 26);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(worker.name.toUpperCase(), paddingX + 20, y + 49);

  ctx.fillStyle = '#475569';
  ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
  const phoneText = worker.phone || 'Chưa có SĐT';
  const cccdText = worker.cccd ? `CCCD: ${worker.cccd}` : 'Chưa có CCCD';
  ctx.fillText(`${phoneText}   •   ${cccdText}`, paddingX + 20, y + 69);

  // Column 2: Salary Rate & Payment Method
  const col2X = paddingX + contentWidth / 2 + 24;
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('MỨC LƯƠNG ĐƠN GIÁ THEO NGÀY', col2X, y + 26);

  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 16px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(`${formatVndCurrency(worker.dailyRate)} / ngày`, col2X, y + 49);

  ctx.fillStyle = '#475569';
  ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
  const payMethodText = worker.bankAccount ? 'Hình thức: Chuyển khoản VietQR' : 'Hình thức: Tiền mặt trực tiếp';
  ctx.fillText(payMethodText, col2X, y + 69);

  y += workerCardHeight + 20;

  // 3. Attendance Detail Table
  const cols = [
    { label: 'STT', width: 48, align: 'center' },
    { label: 'THỨ / NGÀY', width: 160, align: 'left' },
    { label: 'ĐỊA ĐIỂM THI CÔNG', width: 210, align: 'left' },
    { label: 'TRẠNG THÁI', width: 120, align: 'center' },
    { label: 'TIỀN CÔNG', width: 132, align: 'right' },
    { label: 'GHI CHÚ', width: contentWidth - 48 - 160 - 210 - 120 - 132, align: 'left' }
  ];

  // Table Header Bar
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, tableHeaderHeight, [8, 8, 0, 0]);
  ctx.fill();

  let colX = paddingX;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.letterSpacing = '0.3px';

  cols.forEach((col) => {
    let textX = colX + 12;
    if (col.align === 'center') textX = colX + col.width / 2;
    if (col.align === 'right') textX = colX + col.width - 12;

    ctx.textAlign = col.align;
    ctx.fillText(col.label, textX, y + 25);
    colX += col.width;
  });

  y += tableHeaderHeight;

  // Table Data Rows
  rows.forEach((row, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(paddingX, y, contentWidth, rowHeight);

    // Row bottom border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX, y + rowHeight);
    ctx.lineTo(paddingX + contentWidth, y + rowHeight);
    ctx.stroke();

    let curX = paddingX;

    // STT
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(String(i + 1), curX + cols[0].width / 2, y + 21);
    curX += cols[0].width;

    // Thứ / Ngày
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(`${row.dayOfWeek} (${row.dateStr})`, curX + 12, y + 21);
    curX += cols[1].width;

    // Địa điểm
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
    const locText = row.location.length > 28 ? row.location.slice(0, 26) + '...' : row.location;
    ctx.fillText(locText, curX + 12, y + 21);
    curX += cols[2].width;

    // Trạng thái badge
    ctx.textAlign = 'center';
    let badgeColor = '#64748b';
    let badgeBg = '#f1f5f9';
    let badgeBorder = '#e2e8f0';

    if (row.statusType === 'full') {
      badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#a7f3d0';
    } else if (row.statusType === 'half') {
      badgeColor = '#0284c7'; badgeBg = '#f0f9ff'; badgeBorder = '#bae6fd';
    } else if (row.statusType === 'absent') {
      badgeColor = '#dc2626'; badgeBg = '#fef2f2'; badgeBorder = '#fecaca';
    } else if (row.statusType === 'travel') {
      badgeColor = '#9333ea'; badgeBg = '#faf5ff'; badgeBorder = '#e9d5ff';
    } else if (row.statusType === 'holiday') {
      badgeColor = '#ea580c'; badgeBg = '#fff7ed'; badgeBorder = '#fed7aa';
    } else if (row.statusType === 'leave') {
      badgeColor = '#475569'; badgeBg = '#f1f5f9'; badgeBorder = '#e2e8f0';
    }

    const badgeW = 86;
    const badgeH = 22;
    const badgeX = curX + (cols[3].width - badgeW) / 2;
    const badgeY = y + (rowHeight - badgeH) / 2;

    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 11);
    ctx.fill();

    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 11px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(row.statusText, curX + cols[3].width / 2, y + 21);
    curX += cols[3].width;

    // Tiền công (clean formatted currency without double VNĐ)
    ctx.textAlign = 'right';
    ctx.fillStyle = row.wage > 0 ? '#0f766e' : '#94a3b8';
    ctx.font = '600 12.5px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(row.wage > 0 ? formatVndCurrency(row.wage) : '-', curX + cols[4].width - 12, y + 21);
    curX += cols[4].width;

    // Ghi chú
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 11.5px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(row.note || '-', curX + 12, y + 21);

    y += rowHeight;
  });

  // Table Summary Row
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, 40, [0, 0, 8, 8]);
  ctx.fill();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TỔNG CỘNG', paddingX + 16, y + 25);

  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 12.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(`Tổng ngày công: ${totalWorkDays} công`, paddingX + 150, y + 25);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
  // Use exact formatVndCurrency (returns '... ₫', no redundant VNĐ appended)
  ctx.fillText(formatVndCurrency(totalWage), paddingX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width - 12, y + 25);

  y += 54;

  // 4. Net Salary Banner (Tổng Lương Thực Nhận)
  const netBoxGrad = ctx.createLinearGradient(paddingX, y, paddingX + contentWidth, y);
  netBoxGrad.addColorStop(0, '#f0fdf4');
  netBoxGrad.addColorStop(1, '#ecfdf5');
  ctx.fillStyle = netBoxGrad;
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, netSalaryHeight, 10);
  ctx.fill();

  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.letterSpacing = '0.3px';
  ctx.fillText('TỔNG TIỀN LƯƠNG THỰC NHẬN:', paddingX + 22, y + 27);

  ctx.fillStyle = '#15803d';
  ctx.font = 'italic 11.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('(Khoản lương thực nhận đã bao gồm tất cả các ngày công trong kỳ)', paddingX + 22, y + 46);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#15803d';
  ctx.font = 'bold 24px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(formatVndCurrency(netSalary), paddingX + contentWidth - 22, y + 38);

  y += netSalaryHeight + 18;

  // 5. Payment Section (THÔNG TIN THANH TOÁN TIỀN LƯƠNG)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, paymentSectionHeight, 10);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Section Header inside card
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.letterSpacing = '0.4px';
  ctx.fillText('THÔNG TIN THANH TOÁN TIỀN LƯƠNG', paddingX + 20, y + 24);

  // Divider line below section title
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX + 20, y + 32);
  ctx.lineTo(paddingX + contentWidth - 20, y + 32);
  ctx.stroke();

  if (worker.bankAccount) {
    const bankName = worker.bankShortName
      ? `${worker.bankShortName} (${worker.bankName || ''})`
      : (worker.bankName || 'Ngân hàng thụ hưởng');

    const textOffsetX = qrImage ? (paddingX + qrBoxSize + 40) : (paddingX + 24);
    const textAvailableWidth = contentWidth - (qrImage ? (qrBoxSize + 60) : 48);

    if (qrImage) {
      // Layout with QR image on left, fields on right
      const qrBoxX = paddingX + 20;
      const qrBoxY = y + 42;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center square QR code inside the box
      const qrInnerPad = (qrBoxSize - qrImageSize) / 2;
      ctx.drawImage(qrImage, qrBoxX + qrInnerPad, qrBoxY + 8, qrImageSize, qrImageSize);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = '600 10.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.letterSpacing = '0.3px';
      ctx.fillText('QUÉT MÃ VIETQR ĐỂ CHUYỂN KHOẢN', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize - 8);

      // Payment info rows on Right
      let rowY = y + 54;

      // Ngân hàng
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('NGÂN HÀNG THỤ HƯỞNG:', textOffsetX, rowY);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(bankName, textOffsetX, rowY + 18);

      rowY += 46;

      // Số tài khoản
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('SỐ TÀI KHOẢN (STK):', textOffsetX, rowY);
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 20px "Consolas", monospace, Arial, sans-serif';
      ctx.fillText(worker.bankAccount, textOffsetX, rowY + 21);

      rowY += 48;

      // Tên người thụ hưởng
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('TÊN NGƯỜI THỤ HƯỞNG:', textOffsetX, rowY);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(worker.bankAccountHolder ? worker.bankAccountHolder.toUpperCase() : worker.name.toUpperCase(), textOffsetX, rowY + 19);

      rowY += 46;

      // Số tiền tham chiếu
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('SỐ TIỀN LƯƠNG CẦN CHUYỂN:', textOffsetX, rowY);
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 18px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(formatVndCurrency(netSalary), textOffsetX, rowY + 20);

    } else {
      // 2-Column layout when QR is not displayed
      const c1X = paddingX + 24;
      const c2X = paddingX + contentWidth / 2 + 16;
      let rY = y + 54;

      // Col 1 - Ngân hàng
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('NGÂN HÀNG THỤ HƯỞNG:', c1X, rY);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(bankName, c1X, rY + 18);

      // Col 2 - Tên người thụ hưởng
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('TÊN NGƯỜI THỤ HƯỞNG:', c2X, rY);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(worker.bankAccountHolder ? worker.bankAccountHolder.toUpperCase() : worker.name.toUpperCase(), c2X, rY + 18);

      rY += 46;

      // Col 1 - Số tài khoản
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('SỐ TÀI KHOẢN (STK):', c1X, rY);
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 18px "Consolas", monospace, Arial, sans-serif';
      ctx.fillText(worker.bankAccount, c1X, rY + 20);

      // Col 2 - Số tiền lương
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('SỐ TIỀN LƯƠNG CẦN CHUYỂN:', c2X, rY);
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 17px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(formatVndCurrency(netSalary), c2X, rY + 20);
    }
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('Hình thức chi trả: TIỀN MẶT TRỰC TIẾP', paddingX + 24, y + 58);
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('(Công nhân chưa cập nhật thông tin tài khoản ngân hàng để nhận chuyển khoản VietQR)', paddingX + 24, y + 80);
  }

  y += paymentSectionHeight + 22;

  // 6. Signature Block (CHỮ KÝ XÁC NHẬN - Chuẩn chứng từ kế toán)
  const signColWidth = contentWidth / 2;

  // Left: Người lập bảng lương
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('NGƯỜI LẬP PHIẾU', paddingX + signColWidth / 2, y + 16);

  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('(Ký và ghi rõ họ tên)', paddingX + signColWidth / 2, y + 32);

  // Right: Người nhận tiền lương
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('NGƯỜI NHẬN TIỀN LƯƠNG', paddingX + signColWidth + signColWidth / 2, y + 16);

  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('(Ký xác nhận đã nhận đủ tiền)', paddingX + signColWidth + signColWidth / 2, y + 32);

  y += signatureSectionHeight;

  // 7. Footer Divider & System Metadata (Zero icons)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX, y);
  ctx.lineTo(paddingX + contentWidth, y);
  ctx.stroke();

  y += 18;

  // Left Note
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Chứng từ nội bộ - Công ty TNHH Cơ Khí Xây Dựng Thương Mại Việt Thành', paddingX, y);

  // Right Timestamp
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(`Thời gian lập phiếu: ${dayjs().format('DD/MM/YYYY HH:mm')}`, paddingX + contentWidth, y);

  return canvas;
}

export async function downloadWorkerPayrollImage(worker, dateRange, attendance) {
  const canvas = await generateWorkerPayrollCanvas(worker, dateRange, attendance);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `Bang_Luong_${sanitizeFilename(worker.name)}_${dayjs(dateRange.start).format('DDMM')}_den_${dayjs(dateRange.end).format('DDMMYYYY')}.png`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve(true);
    }, 'image/png');
  });
}

export async function downloadMultipleWorkersPayrollImages(workersList, dateRange, attendance, onProgress) {
  for (let i = 0; i < workersList.length; i++) {
    const worker = workersList[i];
    if (onProgress) onProgress(i + 1, workersList.length, worker.name);
    await downloadWorkerPayrollImage(worker, dateRange, attendance);
    // Pause between downloads so browser does not throttle or drop downloads
    if (i < workersList.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}
