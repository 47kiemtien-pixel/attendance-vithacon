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
  let totalTravelCost = 0;

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

    const tCost = Number(rec?.travelCost || 0);
    totalTravelCost += tCost;
    totalWage += wage;

    rows.push({
      dateStr: current.format('DD/MM/YYYY'),
      dayOfWeek: getDayOfWeekName(current),
      location: rec?.location || '-',
      statusText,
      statusType,
      rate,
      wage,
      travelCost: tCost,
      note: rec?.note || ''
    });

    current = current.add(1, 'day');
  }

  const netSalary = totalWage + totalTravelCost;

  // Prepare QR Code if bank account exists
  let qrImage = null;
  if (worker.bankAccount && (worker.bankBin || worker.bankShortName)) {
    const cleanMemo = `Luong ${worker.name} ${dayjs(dateRange.start).format('DD/MM')}-${dayjs(dateRange.end).format('DD/MM')}`.slice(0, 25);
    const accountHolder = (worker.bankAccountHolder || worker.name || '').toUpperCase();
    const qrUrl = `https://img.vietqr.io/image/${worker.bankBin}-${worker.bankAccount}-compact2.png?amount=${netSalary > 0 ? netSalary : ''}&addInfo=${encodeURIComponent(cleanMemo)}&accountName=${encodeURIComponent(accountHolder)}`;
    qrImage = await loadQrImage(qrUrl);
  }

  // Calculate canvas dimensions
  const scale = 2; // Retina sharpness
  const canvasWidth = 840;
  const paddingX = 36;
  const contentWidth = canvasWidth - paddingX * 2;

  const headerHeight = 150;
  const workerInfoHeight = 84;
  const tableHeaderHeight = 38;
  const rowHeight = 32;
  const tableHeight = tableHeaderHeight + rows.length * rowHeight + 38; // + summary row
  const netSalaryHeight = 72;
  const bankSectionHeight = qrImage ? 190 : worker.bankAccount ? 120 : 60;
  const footerHeight = 60;

  const canvasHeight = headerHeight + workerInfoHeight + tableHeight + netSalaryHeight + bankSectionHeight + footerHeight + 40;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer border & shadow effect
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);

  // Top Accent Bar
  const grad = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  grad.addColorStop(0, '#0f766e');
  grad.addColorStop(1, '#0369a1');
  ctx.fillStyle = grad;
  ctx.fillRect(10, 10, canvasWidth - 20, 8);

  let y = 35;

  // 1. Company Name & Document Title
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 15px Inter, "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CÔNG TY TNHH MTV ĐẦU TƯ XÂY DỰNG VITHA CONS', canvasWidth / 2, y);

  y += 24;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('BẢNG THANH TOÁN TIỀN LƯƠNG', canvasWidth / 2, y);

  y += 22;
  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px Inter, "Segoe UI", Arial, sans-serif';
  const periodStr = `Kỳ tính lương: Từ ngày ${dayjs(dateRange.start).format('DD/MM/YYYY')}  đến ngày  ${dayjs(dateRange.end).format('DD/MM/YYYY')}`;
  ctx.fillText(periodStr, canvasWidth / 2, y);

  y += 30;

  // 2. Worker Information Box
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, 70, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.textAlign = 'left';
  // Row 1 inside box
  ctx.fillStyle = '#64748b';
  ctx.font = '600 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Họ và tên:', paddingX + 16, y + 26);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(worker.name.toUpperCase(), paddingX + 90, y + 26);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Lương thỏa thuận:', paddingX + 440, y + 26);

  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 15px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(formatVndCurrency(worker.dailyRate) + ' / ngày', paddingX + 575, y + 26);

  // Row 2 inside box
  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Số điện thoại:', paddingX + 16, y + 52);

  ctx.fillStyle = '#1e293b';
  ctx.font = '600 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(worker.phone || 'Chưa cập nhật', paddingX + 110, y + 52);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText('Số CCCD / CMND:', paddingX + 440, y + 52);

  ctx.fillStyle = '#1e293b';
  ctx.font = '600 13px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(worker.cccd || 'Chưa cập nhật', paddingX + 575, y + 52);

  y += 88;

  // 3. Attendance Table
  // Column definitions
  const cols = [
    { label: 'STT', width: 44, align: 'center' },
    { label: 'THỨ / NGÀY', width: 140, align: 'left' },
    { label: 'ĐỊA ĐIỂM', width: 160, align: 'left' },
    { label: 'TRẠNG THÁI', width: 104, align: 'center' },
    { label: 'TIỀN CÔNG', width: 110, align: 'right' },
    { label: 'TIỀN XE', width: 90, align: 'right' },
    { label: 'GHI CHÚ', width: contentWidth - 44 - 140 - 160 - 104 - 110 - 90, align: 'left' }
  ];

  // Draw Table Header
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(paddingX, y, contentWidth, tableHeaderHeight);

  let colX = paddingX;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Inter, "Segoe UI", Arial, sans-serif';

  cols.forEach((col) => {
    let textX = colX + 8;
    if (col.align === 'center') textX = colX + col.width / 2;
    if (col.align === 'right') textX = colX + col.width - 8;

    ctx.textAlign = col.align;
    ctx.fillText(col.label, textX, y + 23);
    colX += col.width;
  });

  y += tableHeaderHeight;

  // Draw Table Rows
  rows.forEach((row, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(paddingX, y, contentWidth, rowHeight);

    // Border line bottom
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
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 12px Inter, Arial, sans-serif';
    ctx.fillText(`${row.dayOfWeek} (${row.dateStr})`, curX + 8, y + 20);
    curX += cols[1].width;

    // Địa điểm
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '12px Inter, Arial, sans-serif';
    const locText = row.location.length > 20 ? row.location.slice(0, 18) + '...' : row.location;
    ctx.fillText(locText, curX + 8, y + 20);
    curX += cols[2].width;

    // Trạng thái badge
    ctx.textAlign = 'center';
    let badgeColor = '#64748b';
    let badgeBg = '#f1f5f9';
    if (row.statusType === 'full') { badgeColor = '#15803d'; badgeBg = '#dcfce7'; }
    else if (row.statusType === 'half') { badgeColor = '#0369a1'; badgeBg = '#e0f2fe'; }
    else if (row.statusType === 'absent') { badgeColor = '#b91c1c'; badgeBg = '#fee2e2'; }
    else if (row.statusType === 'travel') { badgeColor = '#7e22ce'; badgeBg = '#f3e8ff'; }

    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(curX + (cols[3].width - 80) / 2, y + 5, 80, 20, 10);
    ctx.fill();

    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 11px Inter, Arial, sans-serif';
    ctx.fillText(row.statusText, curX + cols[3].width / 2, y + 19);
    curX += cols[3].width;

    // Tiền công
    ctx.textAlign = 'right';
    ctx.fillStyle = row.wage > 0 ? '#0f766e' : '#94a3b8';
    ctx.font = '600 12px Inter, Arial, sans-serif';
    ctx.fillText(row.wage > 0 ? formatVndCurrency(row.wage) : '-', curX + cols[4].width - 8, y + 20);
    curX += cols[4].width;

    // Tiền xe
    ctx.textAlign = 'right';
    ctx.fillStyle = row.travelCost > 0 ? '#b45309' : '#94a3b8';
    ctx.font = '600 12px Inter, Arial, sans-serif';
    ctx.fillText(row.travelCost > 0 ? formatVndCurrency(row.travelCost) : '-', curX + cols[5].width - 8, y + 20);
    curX += cols[5].width;

    // Ghi chú
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 11px Inter, Arial, sans-serif';
    ctx.fillText(row.note || '-', curX + 8, y + 20);

    y += rowHeight;
  });

  // Summary Row inside Table
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(paddingX, y, contentWidth, 36);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(paddingX, y);
  ctx.lineTo(paddingX + contentWidth, y);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TỔNG CỘNG', paddingX + 16, y + 23);

  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 13px Inter, Arial, sans-serif';
  ctx.fillText(`Số ngày công: ${totalWorkDays} công`, paddingX + 160, y + 23);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f766e';
  ctx.fillText(formatVndCurrency(totalWage), paddingX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width - 8, y + 23);

  ctx.fillStyle = '#b45309';
  ctx.fillText(formatVndCurrency(totalTravelCost), paddingX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width + cols[5].width - 8, y + 23);

  y += 48;

  // 4. Highlighted Net Salary Box (Thực Nhận)
  const netBoxGrad = ctx.createLinearGradient(paddingX, y, paddingX + contentWidth, y);
  netBoxGrad.addColorStop(0, '#f0fdf4');
  netBoxGrad.addColorStop(1, '#ecfdf5');
  ctx.fillStyle = netBoxGrad;
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, 60, 10);
  ctx.fill();
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 15px Inter, Arial, sans-serif';
  ctx.fillText('TỔNG TIỀN LƯƠNG THỰC NHẬN:', paddingX + 20, y + 36);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#15803d';
  ctx.font = 'bold 24px Inter, Arial, sans-serif';
  ctx.fillText(formatVndCurrency(netSalary) + ' VNĐ', paddingX + contentWidth - 20, y + 38);

  y += 76;

  // 5. Bank Account & VietQR Section
  const bankCardHeight = qrImage ? 170 : worker.bankAccount ? 110 : 50;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(paddingX, y, contentWidth, bankCardHeight, 10);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  if (worker.bankAccount) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 14px Inter, Arial, sans-serif';
    ctx.fillText('💳 THÔNG TIN CHUYỂN KHOẢN LƯƠNG', paddingX + 18, y + 28);

    const bankName = worker.bankShortName
      ? `${worker.bankShortName} - ${worker.bankName || ''}`
      : (worker.bankName || 'Ngân hàng');

    ctx.fillStyle = '#475569';
    ctx.font = '500 13px Inter, Arial, sans-serif';

    const textOffset = qrImage ? 190 : 20;

    ctx.fillText('Ngân hàng thụ hưởng:', paddingX + textOffset, y + 56);
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px Inter, Arial, sans-serif';
    ctx.fillText(bankName, paddingX + textOffset + 155, y + 56);

    ctx.fillStyle = '#475569';
    ctx.font = '500 13px Inter, Arial, sans-serif';
    ctx.fillText('Số tài khoản (STK):', paddingX + textOffset, y + 82);
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 16px monospace, Inter, Arial, sans-serif';
    ctx.fillText(worker.bankAccount, paddingX + textOffset + 155, y + 82);

    ctx.fillStyle = '#475569';
    ctx.font = '500 13px Inter, Arial, sans-serif';
    ctx.fillText('Chủ tài khoản:', paddingX + textOffset, y + 108);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Inter, Arial, sans-serif';
    ctx.fillText((worker.bankAccountHolder || worker.name || '').toUpperCase(), paddingX + textOffset + 155, y + 108);

    ctx.fillStyle = '#475569';
    ctx.font = '500 13px Inter, Arial, sans-serif';
    ctx.fillText('Nội dung chuyển tiền:', paddingX + textOffset, y + 134);
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 13px Inter, Arial, sans-serif';
    ctx.fillText(`Luong ${worker.name}`, paddingX + textOffset + 155, y + 134);

    // Draw QR Code on the left side
    if (qrImage) {
      const qrBoxX = paddingX + 18;
      const qrBoxY = y + 36;
      const qrSize = 120;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrSize, qrSize, 8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      ctx.drawImage(qrImage, qrBoxX + 4, qrBoxY + 4, qrSize - 8, qrSize - 8);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 10px Inter, Arial, sans-serif';
      ctx.fillText('QUÉT MÃ VIETQR', qrBoxX + qrSize / 2, qrBoxY + qrSize + 14);
    }
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px Inter, Arial, sans-serif';
    ctx.fillText('Hình thức thanh toán: Tiền mặt (Chưa cập nhật tài khoản ngân hàng)', paddingX + 18, y + 30);
  }

  y += bankCardHeight + 20;

  // 6. Signatures / Footer
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 11px Inter, Arial, sans-serif';
  ctx.fillText(`Xuất từ Hệ thống Chấm công & Bảng lương Vitha Cons • ${dayjs().format('DD/MM/YYYY HH:mm')}`, paddingX, y + 14);

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
