import React, { useState } from 'react';
import { downloadReport } from '../api';
import dayjs from 'dayjs';
import { FileSpreadsheet, Download, CalendarRange, FolderDown } from 'lucide-react';

const Reports = () => {
  const currentMonth = dayjs().format('MM');
  const currentYear = dayjs().format('YYYY');

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const handleExport = () => {
    if (!month || !year) {
      alert('Vui lòng chọn tháng và năm.');
      return;
    }

    downloadReport(month, year).catch((error) => {
      console.error('Error exporting report:', error);
      alert('Không thể tải file Excel. Vui lòng thử lại.');
    });
  };

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const currentYearNum = parseInt(currentYear, 10);
  const years = [currentYearNum - 1, currentYearNum, currentYearNum + 1];

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <div className="screen-kicker">Báo cáo</div>
          <h1 className="screen-title">Xuất bảng chấm công</h1>
          <p className="screen-subtitle">
            Tạo file Excel tổng hợp công, mức lương và thành tiền của toàn bộ công nhân theo tháng.
          </p>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <div className="metric-label">Định dạng xuất</div>
          <div className="metric-value">Excel</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Kỳ báo cáo hiện tại</div>
          <div className="metric-value">{currentMonth}/{currentYear}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Tải về</div>
          <div className="metric-value">1 chạm</div>
        </article>
      </section>

      <section className="panel reports-panel">
        <div className="panel-head">
          <div>
            <div className="panel-kicker">Tùy chọn xuất file</div>
            <h2 className="panel-title">Chọn tháng và năm cần tải</h2>
          </div>
        </div>

        <div className="reports-layout">
          <div className="report-info-card">
            <div className="report-info-icon">
              <FileSpreadsheet size={22} />
            </div>
            <h3>File dùng để đối soát lương</h3>
            <p>Hệ thống xuất sẵn bảng công chi tiết theo ngày, tổng công và thành tiền cho từng công nhân.</p>
            <div className="report-note-list">
              <span><CalendarRange size={14} /> Chọn đúng tháng cần tổng hợp</span>
              <span><FolderDown size={14} /> File sẽ tải trực tiếp về máy</span>
            </div>
          </div>

          <div className="report-form-card">
            <div className="form-row report-form-row">
              <div className="form-group report-select-group">
                <label className="form-label">Tháng</label>
                <select className="form-select" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {months.map((value) => (
                    <option key={value} value={value}>Tháng {value}</option>
                  ))}
                </select>
              </div>

              <div className="form-group report-select-group">
                <label className="form-label">Năm</label>
                <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
                  {years.map((value) => (
                    <option key={value} value={value}>Năm {value}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn btn-primary report-download-btn" onClick={handleExport}>
              <Download size={18} /> Tải về file Excel
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Reports;
