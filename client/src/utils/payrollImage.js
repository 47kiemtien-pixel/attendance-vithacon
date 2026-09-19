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
      statusText = 'CÔNG';
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

  // Prepare QR Code if bank account exists (without pre-filled amount and memo)
  let qrImage = null;
  if (worker.bankAccount && (worker.bankBin || worker.bankShortName)) {
    const accountHolder = (worker.bankAccountHolder || '').toUpperCase();
    const query = accountHolder ? `?accountName=${encodeURIComponent(accountHolder)}` : '';
    const qrUrl = `https://img.vietqr.io/image/${worker.bankBin}-${worker.bankAccount}-compact2.png${query}`;
    qrImage = await loadQrImage(qrUrl);
  }

  // Layout Dimensions & Scale
  const scale = 2; // High-resolution retina export
  const canvasWidth = 860;
  const paddingX = 36;
  const contentWidth = canvasWidth - paddingX * 2;

  // Natural aspect ratio of VietQR compact2 image (~540x640 => ~1.185)
  const naturalAspect = (qrImage && qrImage.height && qrImage.width)
    ? (qrImage.height / qrImage.width)
    : (640 / 540);

  const qrDrawWidth = 280;
  const qrDrawHeight = Math.round(qrDrawWidth * naturalAspect); // ~332px
  const qrBoxWidth = qrDrawWidth + 24; // 304px
  const qrBoxHeight = qrDrawHeight + 24; // ~356px

  const topPadding = 32;
  const headerSectionHeight = 84;
  const workerCardHeight = 82;
  const tableHeaderHeight = 38;
  const rowHeight = 32;
  const tableTotalHeight = tableHeaderHeight + rows.length * rowHeight + 38;
  const netSalaryHeight = 64;
  const paymentSectionHeight = qrImage ? (qrBoxHeight + 52) : (worker.bankAccount ? 150 : 64);
  const footerHeight = 44;

  const canvasHeight = topPadding + headerSectionHeight + workerCardHeight + tableTotalHeight + netSalaryHeight + paymentSectionHeight + footerHeight + 48;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer subtle border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, canvasWidth - 24, canvasHeight - 24);

  // Top Accent Brand Line
  const topGrad = ctx.createLinearGradient(12, 12, canvasWidth - 12, 12);
  topGrad.addColorStop(0, '#0f766e');
  topGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = topGrad;
  ctx.fillRect(12, 12, canvasWidth - 24, 6);

  let y = topPadding + 10;

  // 1. Header Section: Company Name & Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 13.5px Inter, "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '0.5px';
  ctx.fillText('CÔNG TY TNHH CƠ KHÍ XÂY DỰNG THƯƠNG MẠI VIỆT THÀNH', canvasWidth / 2, y);

  y += 26;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Inter, "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '0.2px';
  ctx.fillText('BẢNG THANH TOÁN TIỀN LƯƠNG', canvasWidth / 2, y);

  y += 22;
  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(`Kỳ tính lương: Từ ngày ${dayjs(dateRange.start).format('DD/MM/YYYY')} đến ngày ${dayjs(dateRange.end).format('DD/MM/YYYY')}`, canvasWidth / 2, y);

  y += 28;

  // 2. Worker Information Card (Clean, modern 4-cell grid)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, 72, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  // Row 1
  ctx.fillStyle = '#64748b';
  ctx.font = '600 12.5px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Họ và tên:', paddingX + 20, y + 27);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15.5px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(worker.name.toUpperCase(), paddingX + 95, y + 27);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12.5px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Mức lương ngày:', paddingX + 450, y + 27);

  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 15px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(formatVndCurrency(worker.dailyRate) + ' / ngày', paddingX + 575, y + 27);

  // Row 2
  ctx.fillStyle = '#64748b';
  ctx.font = '500 12.5px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Số điện thoại:', paddingX + 20, y + 53);

  ctx.fillStyle = '#1e293b';
  ctx.font = '600 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(worker.phone || 'Chưa cập nhật', paddingX + 115, y + 53);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 12.5px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Số CCCD / CMND:', paddingX + 450, y + 53);

  ctx.fillStyle = '#1e293b';
  ctx.font = '600 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(worker.cccd || 'Chưa cập nhật', paddingX + 575, y + 53);

  y += 86;

  // 3. Attendance Table
  const cols = [
    { label: 'STT', width: 46, align: 'center' },
    { label: 'THỨ / NGÀY', width: 154, align: 'left' },
    { label: 'ĐỊA ĐIỂM THI CÔNG', width: 190, align: 'left' },
    { label: 'TRẠNG THÁI', width: 110, align: 'center' },
    { label: 'TIỀN CÔNG', width: 130, align: 'right' },
    { label: 'GHI CHÚ', width: contentWidth - 46 - 154 - 190 - 110 - 130, align: 'left' }
  ];

  // Table Header
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, tableHeaderHeight, [6, 6, 0, 0]);
  ctx.fill();

  let colX = paddingX;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11.5px Inter, "Segoe UI", Arial, sans-serif';

  cols.forEach((col) => {
    let textX = colX + 10;
    if (col.align === 'center') textX = colX + col.width / 2;
    if (col.align === 'right') textX = colX + col.width - 10;

    ctx.textAlign = col.align;
    ctx.fillText(col.label, textX, y + 23);
    colX += col.width;
  });

  y += tableHeaderHeight;

  // Table Rows
  rows.forEach((row, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(paddingX, y, contentWidth, rowHeight);

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
    ctx.font = '12px Inter, Arial, sans-serif';
    ctx.fillText(String(i + 1), curX + cols[0].width / 2, y + 20);
    curX += cols[0].width;

    // Thứ / Ngày
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 12px Inter, Arial, sans-serif';
    ctx.fillText(`${row.dayOfWeek} (${row.dateStr})`, curX + 10, y + 20);
    curX += cols[1].width;

    // Địa điểm
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '12px Inter, Arial, sans-serif';
    const locText = row.location.length > 25 ? row.location.slice(0, 23) + '...' : row.location;
    ctx.fillText(locText, curX + 10, y + 20);
    curX += cols[2].width;

    // Trạng thái badge
    ctx.textAlign = 'center';
    let badgeColor = '#64748b';
    let badgeBg = '#f1f5f9';
    if (row.statusType === 'full') { badgeColor = '#15803d'; badgeBg = '#dcfce7'; }
    else if (row.statusType === 'half') { badgeColor = '#0369a1'; badgeBg = '#e0f2fe'; }
    else if (row.statusType === 'absent') { badgeColor = '#b91c1c'; badgeBg = '#fee2e2'; }
    else if (row.statusType === 'travel') { badgeColor = '#7e22ce'; badgeBg = '#f3e8ff'; }
    else if (row.statusType === 'holiday') { badgeColor = '#c2410c'; badgeBg = '#ffedd5'; }
    else if (row.statusType === 'leave') { badgeColor = '#475569'; badgeBg = '#f1f5f9'; }

    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(curX + (cols[3].width - 80) / 2, y + 6, 80, 20, 10);
    ctx.fill();

    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 10.5px Inter, Arial, sans-serif';
    ctx.fillText(row.statusText, curX + cols[3].width / 2, y + 20);
    curX += cols[3].width;

    // Tiền công
    ctx.textAlign = 'right';
    ctx.fillStyle = row.wage > 0 ? '#0f766e' : '#94a3b8';
    ctx.font = '600 12px Inter, Arial, sans-serif';
    ctx.fillText(row.wage > 0 ? formatVndCurrency(row.wage) : '-', curX + cols[4].width - 10, y + 20);
    curX += cols[4].width;

    // Ghi chú
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 11px Inter, Arial, sans-serif';
    ctx.fillText(row.note || '-', curX + 10, y + 20);

    y += rowHeight;
  });

  // Table Summary Row
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, 38, [0, 0, 6, 6]);
  ctx.fill();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12.5px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TỔNG CỘNG', paddingX + 16, y + 24);

  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 12.5px Inter, Arial, sans-serif';
  ctx.fillText(`Tổng ngày công: ${totalWorkDays} công`, paddingX + 160, y + 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 13.5px Inter, Arial, sans-serif';
  ctx.fillText(formatVndCurrency(totalWage) + ' VNĐ', paddingX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width - 10, y + 24);

  y += 52;

  // 4. Net Salary Banner (Clean corporate highlight banner)
  const netBoxGrad = ctx.createLinearGradient(paddingX, y, paddingX + contentWidth, y);
  netBoxGrad.addColorStop(0, '#f0fdf4');
  netBoxGrad.addColorStop(1, '#ecfdf5');
  ctx.fillStyle = netBoxGrad;
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, 54, 8);
  ctx.fill();
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 14px Inter, Arial, sans-serif';
  ctx.fillText('TỔNG LƯƠNG THỰC NHẬN:', paddingX + 20, y + 33);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#15803d';
  ctx.font = 'bold 22px Inter, Arial, sans-serif';
  ctx.fillText(formatVndCurrency(netSalary) + ' VNĐ', paddingX + contentWidth - 20, y + 35);

  y += 68;

  // 5. Payment Section (Structured card layout without icons)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, paymentSectionHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Section Label
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 12px Inter, Arial, sans-serif';
  ctx.fillText('THÔNG TIN THANH TOÁN', paddingX + 18, y + 24);

  // Line below title
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX + 18, y + 32);
  ctx.lineTo(paddingX + contentWidth - 18, y + 32);
  ctx.stroke();

  if (worker.bankAccount) {
    const bankName = worker.bankShortName
      ? `${worker.bankShortName} - ${worker.bankName || ''}`
      : (worker.bankName || 'Ngân hàng');

    const textOffset = qrImage ? (qrBoxWidth + 36) : 24;

    const rowY1 = qrImage ? y + 68 : y + 56;
    const rowY2 = qrImage ? y + 130 : y + 84;
    const rowY3 = qrImage ? y + 192 : y + 112;
    const rowY4 = qrImage ? y + 254 : y + 140;

    // Ngân hàng
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12.5px Inter, Arial, sans-serif';
    ctx.fillText('Ngân hàng thụ hưởng:', paddingX + textOffset, rowY1);
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13.5px Inter, Arial, sans-serif';
    ctx.fillText(bankName, paddingX + textOffset, rowY1 + 18);

    // Số tài khoản
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12.5px Inter, Arial, sans-serif';
    ctx.fillText('Số tài khoản (STK):', paddingX + textOffset, rowY2);
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 19px monospace, Inter, Arial, sans-serif';
    ctx.fillText(worker.bankAccount, paddingX + textOffset, rowY2 + 20);

    // Người thụ hưởng
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12.5px Inter, Arial, sans-serif';
    ctx.fillText('Tên người thụ hưởng:', paddingX + textOffset, rowY3);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px Inter, Arial, sans-serif';
    ctx.fillText(worker.bankAccountHolder ? worker.bankAccountHolder.toUpperCase() : '-', paddingX + textOffset, rowY3 + 18);

    // Số tiền lương cần chuyển
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12.5px Inter, Arial, sans-serif';
    ctx.fillText('Số tiền chuyển lương:', paddingX + textOffset, rowY4);
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 17px Inter, Arial, sans-serif';
    ctx.fillText(formatVndCurrency(netSalary) + ' VNĐ', paddingX + textOffset, rowY4 + 20);

    // QR Image Card on Left Side
    if (qrImage) {
      const qrBoxX = paddingX + 18;
      const qrBoxY = y + 46;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxWidth, qrBoxHeight, 8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.drawImage(qrImage, qrBoxX + 12, qrBoxY + 12, qrDrawWidth, qrDrawHeight);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#475569';
      ctx.font = '600 11px Inter, Arial, sans-serif';
      ctx.fillText('QUÉT MÃ VIETQR QUA APP NGÂN HÀNG', qrBoxX + qrBoxWidth / 2, qrBoxY + qrBoxHeight + 18);
    }
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px Inter, Arial, sans-serif';
    ctx.fillText('Hình thức thanh toán: Tiền mặt (Chưa cập nhật số tài khoản ngân hàng)', paddingX + 20, y + 54);
  }

  y += paymentSectionHeight + 20;

  // 6. Professional Footer Divider & Metadata (NO icons)
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
  ctx.font = '500 11.5px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Chứng từ nội bộ - Công ty TNHH Cơ Khí Xây Dựng Thương Mại Việt Thành', paddingX, y);

  // Right Generation Timestamp
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '500 11.5px Inter, "Segoe UI", Arial, sans-serif';
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
    // Slight pause between downloads so browser doesn't block them
    if (i < workersList.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}
