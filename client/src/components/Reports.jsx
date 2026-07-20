import React, { useEffect, useState } from 'react';
import { downloadReport, downloadWorkersReport, downloadWorkersReportDocx, getWorkers } from '../api';
import dayjs from 'dayjs';
import { FileSpreadsheet, Download, CalendarRange, FolderDown, User, Calendar, FileText } from 'lucide-react';

const Reports = () => {
  const currentMonth = dayjs().format('MM');
  const currentYear = dayjs().format('YYYY');

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  
  // State for individual report
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'week').startOf('week').add(1, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().subtract(1, 'week').startOf('week').add(7, 'day').format('YYYY-MM-DD'));
  const [exportType, setExportType] = useState('previousWeek'); // 'week', 'previousWeek', 'month'

  useEffect(() => {
    getWorkers().then(setWorkers).catch(console.error);
  }, []);

  const selectedCount = selectedWorkerIds.length;
  const allWorkersSelected = workers.length > 0 && selectedCount === workers.length;

  const toggleWorkerSelection = (workerId) => {
    const normalizedId = String(workerId);
    setSelectedWorkerIds((current) => (
      current.includes(normalizedId)
        ? current.filter((id) => id !== normalizedId)
        : [...current, normalizedId]
    ));
  };

  const toggleAllWorkers = () => {
    setSelectedWorkerIds(allWorkersSelected ? [] : workers.map((worker) => String(worker.id)));
  };

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
    const workerIds = selectedWorkerIds.filter(Boolean);
    if (!workerIds.length) {
      alert('Vui lòng chọn công nhân.');
      return;
    }

    let label = '';
    if (exportType === 'week' || exportType === 'previousWeek') {
      label = `Tuần ${dayjs(startDate).format('DD/MM')} - ${dayjs(endDate).format('DD/MM/YYYY')}`;
    } else if (exportType === 'month') {
      label = `Tháng ${dayjs(startDate).format('MM/YYYY')}`;
    }

    downloadWorkersReport(workerIds, startDate, endDate, label).catch((error) => {
      console.error('Error exporting worker report:', error);
      alert('Không thể tải file Excel. Vui lòng thử lại.');
    });
  };

  const handleWorkerExportDocx = () => {
    const workerIds = selectedWorkerIds.filter(Boolean);
    if (!workerIds.length) {
      alert('Vui lòng chọn công nhân.');
      return;
    }

    let label = '';
    if (exportType === 'week' || exportType === 'previousWeek') {
      label = `Tuần ${dayjs(startDate).format('DD/MM')} - ${dayjs(endDate).format('DD/MM/YYYY')}`;
    } else if (exportType === 'month') {
      label = `Tháng ${dayjs(startDate).format('MM/YYYY')}`;
    }

    downloadWorkersReportDocx(workerIds, startDate, endDate, label).catch((error) => {
      console.error('Error exporting worker Word report:', error);
      if (error?.response?.status === 404) {
        alert('Server chưa cập nhật chức năng xuất Word nhiều người. Vui lòng tắt app và chạy lại start-lan.bat.');
        return;
      }
      alert('Không thể tải file Word. Vui lòng thử lại.');
    });
  };

  const handleExportTypeChange = (type) => {
    setExportType(type);
    if (type === 'week') {
      setStartDate(dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
      setEndDate(dayjs().startOf('week').add(7, 'day').format('YYYY-MM-DD'));
    } else if (type === 'previousWeek') {
      setStartDate(dayjs().subtract(1, 'week').startOf('week').add(1, 'day').format('YYYY-MM-DD'));
      setEndDate(dayjs().subtract(1, 'week').startOf('week').add(7, 'day').format('YYYY-MM-DD'));
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
            <h2 className="panel-title">Xuất báo cáo chi tiết cho nhiều người</h2>
          </div>
        </div>

        <div className="reports-layout">
          <div className="report-info-card" style={{ background: 'var(--bg-alt)' }}>
            <div className="report-info-icon" style={{ background: 'var(--primary)', color: 'white' }}>
              <User size={22} />
            </div>
            <h3>Báo cáo chi tiết theo mẫu</h3>
            <p>Xuất file Excel theo mẫu Vitha Cons, hiển thị chi tiết địa điểm, trạng thái, ghi chú, tổng số công và tổng lương.</p>
            <div className="report-note-list">
              <span><CalendarRange size={14} /> Chọn công nhân và khoảng thời gian</span>
              <span><Download size={14} /> Tải file Excel chuyên nghiệp</span>
            </div>
          </div>

          <div className="report-form-card">
            <div className="form-group">
              <label className="form-label">Chọn công nhân</label>
              <div style={{ marginTop: '0.75rem', maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                {workers.map(w => {
                  const workerId = String(w.id);
                  return (
                    <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedWorkerIds.includes(workerId)}
                        onChange={() => toggleWorkerSelection(workerId)}
                      />
                      <span>
                        {w.name} {w.status === 'resigned' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>(Đã nghỉ làm)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Đã chọn {selectedCount} / {workers.length} công nhân
                </span>
                <button type="button" className="btn btn-outline" style={{ padding: '8px 12px' }} onClick={toggleAllWorkers}>
                  {allWorkersSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
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
                  className={`segment-btn ${exportType === 'previousWeek' ? 'active' : ''}`}
                  onClick={() => handleExportTypeChange('previousWeek')}
                >
                  Tuần trước
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

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button className="btn btn-primary report-download-btn" style={{ flex: 1 }} onClick={handleWorkerExport}>
                <FileSpreadsheet size={18} /> Tải Excel
              </button>
              <button className="btn btn-outline report-download-btn" style={{ flex: 1 }} onClick={handleWorkerExportDocx}>
                <FileText size={18} /> Tải Word (Mới)
              </button>
            </div>
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
