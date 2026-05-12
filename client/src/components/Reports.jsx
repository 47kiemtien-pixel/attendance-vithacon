import React, { useEffect, useState } from 'react';
import { downloadReport, downloadWorkerReport, getWorkers } from '../api';
import dayjs from 'dayjs';
import { FileSpreadsheet, Download, CalendarRange, FolderDown, User, Calendar } from 'lucide-react';

const Reports = () => {
  const currentMonth = dayjs().format('MM');
  const currentYear = dayjs().format('YYYY');

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  
  // State for individual report
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [startDate, setStartDate] = useState(dayjs().startOf('week').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('week').format('YYYY-MM-DD'));
  const [exportType, setExportType] = useState('week'); // 'week', 'month', 'custom'

  useEffect(() => {
    getWorkers().then(setWorkers).catch(console.error);
  }, []);

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

  const handleWorkerExport = () => {
    if (!selectedWorkerId) {
      alert('Vui lòng chọn công nhân.');
      return;
    }

    let label = '';
    if (exportType === 'week') {
      label = `Tuần ${dayjs(startDate).format('DD/MM')} - ${dayjs(endDate).format('DD/MM/YYYY')}`;
    } else if (exportType === 'month') {
      label = `Tháng ${dayjs(startDate).format('MM/YYYY')}`;
    }

    downloadWorkerReport(selectedWorkerId, startDate, endDate, label).catch((error) => {
      console.error('Error exporting worker report:', error);
      alert('Không thể tải file Excel. Vui lòng thử lại.');
    });
  };

  const handleExportTypeChange = (type) => {
    setExportType(type);
    if (type === 'week') {
      setStartDate(dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD')); // Monday
      setEndDate(dayjs().startOf('week').add(7, 'day').format('YYYY-MM-DD')); // Sunday
    } else if (type === 'month') {
      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
      setEndDate(dayjs().endOf('month').format('YYYY-MM-DD'));
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const currentYearNum = parseInt(currentYear, 10);
  const years = [currentYearNum - 1, currentYearNum, currentYearNum + 1];

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <div className="screen-kicker">Báo cáo</div>
          <h1 className="screen-title">Xuất file báo cáo</h1>
          <p className="screen-subtitle">
            Hỗ trợ xuất bảng công tổng hợp hàng tháng hoặc báo cáo chi tiết cho từng cá nhân.
          </p>
        </div>
      </section>

      <section className="panel reports-panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-head">
          <div>
            <div className="panel-kicker">Báo cáo cá nhân</div>
            <h2 className="panel-title">Xuất báo cáo chi tiết cho 1 người</h2>
          </div>
        </div>

        <div className="reports-layout">
          <div className="report-info-card" style={{ background: 'var(--bg-alt)' }}>
            <div className="report-info-icon" style={{ background: 'var(--primary)', color: 'white' }}>
              <User size={22} />
            </div>
            <h3>Báo cáo chi tiết theo mẫu</h3>
            <p>Xuất file Excel theo mẫu Vitha Cons, hiển thị chi tiết địa điểm, trạng thái và ghi chú hàng ngày.</p>
            <div className="report-note-list">
              <span><CalendarRange size={14} /> Chọn công nhân và khoảng thời gian</span>
              <span><Download size={14} /> Tải file Excel chuyên nghiệp</span>
            </div>
          </div>

          <div className="report-form-card">
            <div className="form-group">
              <label className="form-label">Chọn công nhân</label>
              <select 
                className="form-select" 
                value={selectedWorkerId} 
                onChange={(e) => setSelectedWorkerId(e.target.value)}
              >
                <option value="">-- Chọn công nhân --</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Khoảng thời gian</label>
              <div className="segmented-control" style={{ marginBottom: '1rem' }}>
                <button 
                  className={`segment-btn ${exportType === 'week' ? 'active' : ''}`} 
                  onClick={() => handleExportTypeChange('week')}
                >
                  Theo tuần
                </button>
                <button 
                  className={`segment-btn ${exportType === 'month' ? 'active' : ''}`} 
                  onClick={() => handleExportTypeChange('month')}
                >
                  Theo tháng
                </button>
                <button 
                  className={`segment-btn ${exportType === 'custom' ? 'active' : ''}`} 
                  onClick={() => setExportType('custom')}
                >
                  Tùy chỉnh
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Từ ngày</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đến ngày</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <button className="btn btn-primary report-download-btn" style={{ marginTop: '1.5rem' }} onClick={handleWorkerExport}>
              <Download size={18} /> Tải báo cáo cá nhân
            </button>
          </div>
        </div>
      </section>

      <section className="panel reports-panel">
        <div className="panel-head">
          <div>
            <div className="panel-kicker">Báo cáo tổng hợp</div>
            <h2 className="panel-title">Xuất bảng công toàn bộ tháng</h2>
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

            <button className="btn btn-outline report-download-btn" onClick={handleExport}>
              <Download size={18} /> Tải về bảng công tháng
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Reports;
