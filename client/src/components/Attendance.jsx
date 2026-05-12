import React, { useEffect, useMemo, useState } from 'react';
import { getWorkers, getAttendance, saveAttendanceRecord, getSettings } from '../api';
import dayjs from 'dayjs';
import { 
  CalendarCheck, ChevronLeft, ChevronRight, X, User, 
  Briefcase, MapPin, Wallet, StickyNote, CircleDollarSign,
  DollarSign, Truck
} from 'lucide-react';

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const num = String(val).replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('vi-VN');
};

const parseCurrency = (val) => {
  if (!val) return 0;
  return Number(String(val).replace(/\D/g, ''));
};

const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const getMonday = (date) => {
  const offset = (date.day() + 6) % 7;
  return date.subtract(offset, 'day');
};
const getPresetLabel = (preset) => {
  const base = [preset.position, preset.location].filter(Boolean).join(' - ');
  return base || 'Mẫu chưa đặt';
};

const Attendance = () => {
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedCell, setSelectedCell] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('Absent');
  const [editRate, setEditRate] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editTravelCost, setEditTravelCost] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('week');
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday(dayjs()));

  const daysInMonth = currentDate.daysInMonth();
  const year = currentDate.year();
  const month = currentDate.month() + 1;
  const monthText = currentDate.format('MM/YYYY');

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  useEffect(() => {
    const today = dayjs();
    const isCurrentMonth =
      currentDate.month() === today.month() &&
      currentDate.year() === today.year();

    setWeekStartDate(isCurrentMonth ? getMonday(today) : getMonday(currentDate.date(1)));
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch workers first as priority
      const workersRes = await getWorkers();
      setWorkers(workersRes || []);

      // Then try to fetch others
      try {
        const [attendanceRes, settingsRes] = await Promise.all([
          getAttendance(),
          getSettings()
        ]);
        setAttendance(attendanceRes || []);
        setPresets(settingsRes?.presetJobs || []);
      } catch (innerError) {
        console.error('Error fetching supplementary data:', innerError);
      }
    } catch (error) {
      console.error('Critical error fetching workers:', error);
      alert('Không thể tải danh sách công nhân. Vui lòng kiểm tra kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const getDayRecord = (workerId, dateStr) => {
    const dayData = attendance.find((item) => item.date === dateStr);
    return dayData?.records.find((record) => record.workerId === workerId) || null;
  };

  const summary = useMemo(() => {
    let full = 0;
    let half = 0;
    attendance.forEach((entry) => {
      if (!entry.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)) return;
      entry.records.forEach((record) => {
        if (record.status === 'Full') full += 1;
        if (record.status === 'Half') half += 1;
      });
    });
    return { full, half };
  }, [attendance, month, year]);

  const weekLabel = useMemo(() => {
    const endDate = weekStartDate.add(6, 'day');
    return `${weekStartDate.format('DD/MM')}-${endDate.format('DD/MM')}`;
  }, [weekStartDate]);

  const visibleDateHeaders = useMemo(() => {
    const dates = viewMode === 'month'
      ? Array.from({ length: daysInMonth }, (_, index) =>
          dayjs(`${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)
        )
      : Array.from({ length: 7 }, (_, index) => weekStartDate.add(index, 'day'));

    return dates.map((date) => {
      return {
        key: date.format('YYYY-MM-DD'),
        iso: date.format('YYYY-MM-DD'),
        weekday: weekdayLabels[date.day()],
        dateLabel: date.format('DD/MM'),
        isOutsideMonth: date.month() !== currentDate.month()
      };
    });
  }, [currentDate, daysInMonth, month, viewMode, weekStartDate, year]);

  const handleCellClick = (worker, dayLabel, dateStr) => {
    const record = getDayRecord(worker.id, dateStr);

    setSelectedCell({ worker, dateStr, day: dayLabel });
    setEditStatus(record ? record.status : 'Absent');
    setEditRate(record?.dailyRate ?? '');
    setEditPosition(record?.position ?? '');
    setEditLocation(record?.location ?? '');
    setEditNote(record?.note ?? '');
    setEditTravelCost(record?.travelCost ?? '');
    setSelectedPresetId('');
    setIsModalOpen(true);
  };

  const handleSaveCell = async () => {
    if (!selectedCell) return;
    setSaving(true);
    try {
      await saveAttendanceRecord(
        selectedCell.dateStr,
        selectedCell.worker.id,
        editStatus,
        Number(editRate) || 0,
        editPosition,
        editLocation,
        editNote,
        Number(editTravelCost) || 0
      );
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving record', error);
      alert('Có lỗi xảy ra khi lưu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="screen-page">
      <section className="panel compact-panel">
        <div className="toolbar-row">
          <div>
            <div className="panel-kicker">Bảng chấm công</div>
            <h1 className="page-title compact-title">
              <CalendarCheck size={22} color="var(--primary)" /> Chấm công tháng {monthText}
            </h1>
          </div>

          <div className="toolbar-actions">
            <div className="segmented-control">
              <button className={`segment-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>
                Theo tuần
              </button>
              <button className={`segment-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>
                Cả tháng
              </button>
            </div>
            <button className="btn btn-outline" onClick={() => setCurrentDate((value) => value.subtract(1, 'month'))}>
              <ChevronLeft size={16} /> Tháng trước
            </button>
            <div className="period-pill compact-pill">{monthText}</div>
            <button className="btn btn-outline" onClick={() => setCurrentDate((value) => value.add(1, 'month'))}>
              Tháng sau <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="toolbar-meta">
          <span>{workers.length} công nhân</span>
          <span>{summary.full} công đủ</span>
          <span>{summary.half} nửa công</span>
          <span>{viewMode === 'week' ? `Đang xem tuần ${weekLabel}` : 'Đang xem cả tháng'}</span>
        </div>

        <div className="attendance-legend">
          <span><i className="legend-box legend-full" /> Đủ công</span>
          <span><i className="legend-box legend-half" /> Nửa công</span>
          <span><i className="legend-box legend-holiday" /> Nghỉ lễ</span>
          <span><i className="legend-box legend-leave" /> Nghỉ phép</span>
          <span><i className="legend-box legend-empty" /> Chưa chấm</span>
        </div>
      </section>

      <section className="panel compact-panel">
        {viewMode === 'week' && (
          <div className="sub-toolbar">
            <button
              className="btn btn-outline"
              onClick={() => setWeekStartDate((current) => current.subtract(7, 'day'))}
            >
              <ChevronLeft size={16} /> Tuần trước
            </button>
            <div className="sub-toolbar-label">Tuần {weekLabel}</div>
            <button
              className="btn btn-outline"
              onClick={() => setWeekStartDate((current) => current.add(7, 'day'))}
            >
              Tuần sau <ChevronRight size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="empty-state">Đang tải dữ liệu chấm công...</div>
        ) : workers.length === 0 ? (
          <div className="empty-state">Chưa có công nhân. Hãy thêm công nhân trước khi chấm công.</div>
        ) : (
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-head worker-col-head">Công nhân</th>
                  {visibleDateHeaders.map((item) => (
                    <th key={item.key} className={`date-head-cell ${item.isOutsideMonth ? 'is-muted' : ''}`}>
                      <span className="date-head-weekday">{item.weekday}</span>
                      <span className="date-head-date">{item.dateLabel}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id}>
                    <td className="sticky-col worker-name-cell">
                      <div className="worker-name-inner">
                        <span className="worker-badge"><User size={14} /></span>
                        <div className="worker-cell-copy">
                          <strong>{worker.name}</strong>
                          <small>{worker.dailyRate ? `${Number(worker.dailyRate).toLocaleString('vi-VN')}đ/ngày` : 'Chưa có lương mặc định'}</small>
                        </div>
                      </div>
                    </td>
                    {visibleDateHeaders.map((item) => {
                      const record = getDayRecord(worker.id, item.iso);
                      const status = record?.status;
                      const tone = 
                        status === 'Leave' ? 'leave' : 
                        status === 'Absent' ? 'absent' : 
                        status === 'Travel' ? 'travel' : '';
                      
                      const label = 
                        status === 'Full' ? 'Đủ công' : 
                        status === 'Half' ? 'Nửa công' : 
                        status === 'Holiday' ? 'Nghỉ lễ' : 
                        status === 'Leave' ? 'Nghỉ phép' : 
                        status === 'Absent' ? 'Nghỉ' : 
                        status === 'Travel' ? 'Di chuyển' : '';

                      return (
                        <td key={item.key} className={item.isOutsideMonth ? 'date-cell-muted' : ''}>
                          <button
                            type="button"
                            className={`attendance-cell ${tone}`}
                            onClick={() => handleCellClick(worker, item.dateLabel, item.iso)}
                            title={`Chấm công ngày ${item.dateLabel}`}
                          >
                            {status ? (
                              <div className="cell-info-stack">
                                <div className="cell-status-badge">{label}</div>
                                {record.location && (
                                  <div className="cell-detail-line"><MapPin size={10} /> {record.location}</div>
                                )}
                                {record.position && (
                                  <div className="cell-detail-line"><Briefcase size={10} /> {record.position}</div>
                                )}
                                <div className="cell-amount">
                                  {Number(record.dailyRate || 0).toLocaleString('vi-VN')}đ
                                </div>
                                {record.note && (
                                  <div className="cell-note" title={record.note}>
                                    {record.note}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && selectedCell && (
        <div className="modal-overlay">
          <div className="modal-content attendance-modal">
            <div className="modal-header">
              <div>
                <div className="panel-kicker">Chấm công ngày {selectedCell.day}/{year}</div>
                <h3>{selectedCell.worker.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <div className="attendance-group">
                  <button type="button" className={`attendance-btn ${editStatus === 'Full' ? 'active-full' : ''}`} onClick={() => setEditStatus('Full')}>
                    Đủ công
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Half' ? 'active-half' : ''}`} onClick={() => setEditStatus('Half')}>
                    Nửa công
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Absent' ? 'active-absent' : ''}`} onClick={() => setEditStatus('Absent')}>
                    Nghỉ
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Holiday' ? 'active-holiday' : ''}`} onClick={() => setEditStatus('Holiday')}>
                    Nghỉ lễ
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Leave' ? 'active-leave' : ''}`} onClick={() => setEditStatus('Leave')}>
                    Phép
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Travel' ? 'active-travel' : ''}`} onClick={() => setEditStatus('Travel')}>
                    Di chuyển
                  </button>
                </div>
              </div>

              {(editStatus !== 'Absent' && editStatus !== 'Holiday' && editStatus !== 'Leave') && (
                <div className="attendance-form-stack">
                  {presets.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Mẫu công việc</label>
                      <select
                        className="form-input"
                        value={selectedPresetId}
                        onChange={(e) => {
                          setSelectedPresetId(e.target.value);
                          const preset = presets.find((item) => item.id === e.target.value);
                          if (preset) {
                            setEditPosition(preset.position);
                            setEditLocation(preset.location);
                            setEditRate(preset.rate);
                          }
                        }}
                      >
                        <option value="">-- Chọn mẫu đã lưu --</option>
                        {presets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {getPresetLabel(preset)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Vị trí công việc</label>
                    <div className="input-with-icon">
                      <Briefcase size={16} />
                      <input className="form-input embedded-input" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="Ví dụ: Thợ hàn" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Địa điểm</label>
                    <div className="input-with-icon">
                      <MapPin size={16} />
                      <input className="form-input embedded-input" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Ví dụ: Đắk Lắk" />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Mức lương / ngày</label>
                      <div className="input-with-icon">
                        <Wallet size={16} />
                        <input
                          className="form-input embedded-input"
                          value={formatCurrency(editRate)}
                          onChange={(e) => setEditRate(parseCurrency(e.target.value))}
                          placeholder="Ví dụ: 650,000"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tiền xe / Di chuyển</label>
                      <div className="input-with-icon">
                        <Truck size={16} />
                        <input
                          type="number"
                          className="form-input embedded-input"
                          value={editTravelCost}
                          onChange={(e) => setEditTravelCost(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ghi chú</label>
                    <textarea 
                      className="form-input" 
                      value={editNote} 
                      onChange={(e) => setEditNote(e.target.value)} 
                      placeholder="Ví dụ: Nghỉ lễ Giải phóng miền Nam"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {(editStatus === 'Holiday' || editStatus === 'Leave' || editStatus === 'Absent' || editStatus === 'Travel') && (
                <div className="attendance-form-stack">
                  <div className="form-group">
                    <label className="form-label">Tiền xe / Di chuyển</label>
                    <div className="input-with-icon">
                      <Truck size={16} />
                      <input
                        type="number"
                        className="form-input embedded-input"
                        value={editTravelCost}
                        onChange={(e) => setEditTravelCost(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ghi chú</label>
                    <textarea 
                      className="form-input" 
                      value={editNote} 
                      onChange={(e) => setEditNote(e.target.value)} 
                      placeholder="Lý do nghỉ, tên ngày lễ..."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveCell} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
