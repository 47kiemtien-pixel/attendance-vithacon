import React, { useEffect, useMemo, useState } from 'react';
import { getWorkers, getAttendance, saveAttendanceRecord, getSettings } from '../api';
import dayjs from 'dayjs';
import { 
  CalendarCheck, ChevronLeft, ChevronRight, X, User, 
  Briefcase, MapPin, Wallet, Truck, Search
} from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import { parseVndAmount } from '../utils/currency';

const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const getMonday = (date) => {
  const offset = (date.day() + 6) % 7;
  return date.subtract(offset, 'day');
};
const getPresetLabel = (preset) => {
  const base = [preset.position, preset.location].filter(Boolean).join(' - ');
  return base || 'Mẫu chưa đặt';
};

const WORK_DETAIL_STATUSES = new Set(['Full', 'Half']);
const quickStatuses = [
  { value: 'Full', label: 'Công' },
  { value: 'Half', label: '1/2' },
  { value: 'Absent', label: 'Nghỉ' },
  { value: 'Leave', label: 'Phép' },
  { value: 'Holiday', label: 'Lễ' },
  { value: 'Travel', label: 'Đi' }
];

const buildAttendancePayload = ({ status, dailyRate, position, location, note, travelCost }) => {
  const normalizedNote = typeof note === 'string' ? note.trim() : '';
  const normalizedTravelCost = parseVndAmount(travelCost);

  if (WORK_DETAIL_STATUSES.has(status)) {
    return {
      status,
      dailyRate: parseVndAmount(dailyRate),
      position: typeof position === 'string' ? position.trim() : '',
      location: typeof location === 'string' ? location.trim() : '',
      note: normalizedNote,
      travelCost: normalizedTravelCost
    };
  }

  if (status === 'Travel') {
    return {
      status,
      dailyRate: 0,
      position: '',
      location: '',
      note: normalizedNote,
      travelCost: normalizedTravelCost
    };
  }

  return {
    status,
    dailyRate: 0,
    position: '',
    location: '',
    note: normalizedNote,
    travelCost: 0
  };
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
  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const [mobileStatusFilter, setMobileStatusFilter] = useState('all');
  const [quickSavingKey, setQuickSavingKey] = useState('');

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

  const activeWorkers = useMemo(() => {
    return workers
      .filter((worker) => worker.status !== 'resigned')
      .sort((firstWorker, secondWorker) => String(firstWorker.name || '').localeCompare(
        String(secondWorker.name || ''),
        'vi',
        { sensitivity: 'base' }
      ));
  }, [workers]);

  const summary = useMemo(() => {
    let full = 0;
    let half = 0;
    attendance.forEach((entry) => {
      if (!entry.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)) return;
      entry.records.forEach((record) => {
        const isActive = activeWorkers.some((w) => String(w.id) === String(record.workerId));
        if (isActive) {
          if (record.status === 'Full') full += 1;
          if (record.status === 'Half') half += 1;
        }
      });
    });
    return { full, half };
  }, [attendance, month, year, activeWorkers]);

  const weekLabel = useMemo(() => {
    const endDate = weekStartDate.add(6, 'day');
    return `${weekStartDate.format('DD/MM')}-${endDate.format('DD/MM')}`;
  }, [weekStartDate]);

  const mobileDateIso = currentDate.format('YYYY-MM-DD');

  const mobileDaySummary = useMemo(() => {
    let completed = 0;
    activeWorkers.forEach((worker) => {
      if (getDayRecord(worker.id, mobileDateIso)) completed += 1;
    });
    return { completed, total: activeWorkers.length };
  }, [attendance, mobileDateIso, activeWorkers]);

  const mobileWorkers = useMemo(() => {
    const keyword = mobileSearchTerm.trim().toLowerCase();
    return activeWorkers.filter((worker) => {
      const record = getDayRecord(worker.id, mobileDateIso);
      const status = record?.status || 'empty';
      const matchesSearch = !keyword || String(worker.name || '').toLowerCase().includes(keyword);
      const matchesFilter =
        mobileStatusFilter === 'all' ||
        (mobileStatusFilter === 'empty' && !record) ||
        (mobileStatusFilter === 'done' && Boolean(record)) ||
        status === mobileStatusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [attendance, mobileDateIso, mobileSearchTerm, mobileStatusFilter, activeWorkers]);

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
    setEditRate(record?.dailyRate || worker.dailyRate || '');
    setEditPosition(record?.position ?? '');
    setEditLocation(record?.location ?? '');
    setEditNote(record?.note ?? '');
    setEditTravelCost(record?.travelCost ?? '');
    setSelectedPresetId('');
    setIsModalOpen(true);
  };

  const handleEditStatusChange = (status) => {
    setEditStatus(status);
    if (
      WORK_DETAIL_STATUSES.has(status)
      && parseVndAmount(editRate) <= 0
      && Number(selectedCell?.worker?.dailyRate || 0) > 0
    ) {
      setEditRate(selectedCell.worker.dailyRate);
    }
  };

  const handleQuickStatus = async (worker, status) => {
    const key = `${worker.id}-${mobileDateIso}-${status}`;
    setQuickSavingKey(key);
    try {
      const currentRecord = getDayRecord(worker.id, mobileDateIso);
      const recordPayload = buildAttendancePayload({
        status,
        dailyRate: WORK_DETAIL_STATUSES.has(status) ? (currentRecord?.dailyRate || worker.dailyRate || '') : '',
        position: currentRecord?.position || '',
        location: currentRecord?.location || '',
        note: currentRecord?.note || '',
        travelCost: currentRecord?.travelCost || ''
      });

      await saveAttendanceRecord(
        mobileDateIso,
        worker.id,
        recordPayload.status,
        recordPayload.dailyRate,
        recordPayload.position,
        recordPayload.location,
        recordPayload.note,
        recordPayload.travelCost
      );
      await fetchData();
    } catch (error) {
      console.error('Error quick saving record', error);
      alert('Không thể lưu chấm công nhanh. Vui lòng thử lại.');
    } finally {
      setQuickSavingKey('');
    }
  };

  const handleSaveCell = async () => {
    if (!selectedCell) return;
    setSaving(true);
    try {
      const recordPayload = buildAttendancePayload({
        status: editStatus,
        dailyRate: WORK_DETAIL_STATUSES.has(editStatus)
          ? (parseVndAmount(editRate) || selectedCell.worker.dailyRate || '')
          : editRate,
        position: editPosition,
        location: editLocation,
        note: editNote,
        travelCost: editTravelCost
      });

      await saveAttendanceRecord(
        selectedCell.dateStr,
        selectedCell.worker.id,
        recordPayload.status,
        recordPayload.dailyRate,
        recordPayload.position,
        recordPayload.location,
        recordPayload.note,
        recordPayload.travelCost
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

  const showWorkDetailForm = WORK_DETAIL_STATUSES.has(editStatus);
  const showSupplementaryForm = !showWorkDetailForm;

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
          <span>{activeWorkers.length} công nhân</span>
          <span>{summary.full} công đủ</span>
          <span>{summary.half} nửa công</span>
          <span>{viewMode === 'week' ? `Đang xem tuần ${weekLabel}` : 'Đang xem cả tháng'}</span>
        </div>

        <div className="mobile-attendance-controls">
          <div className="mobile-date-row">
            <button className="btn btn-outline" type="button" onClick={() => setCurrentDate((value) => value.subtract(1, 'day'))}>
              <ChevronLeft size={16} />
            </button>
            <input
              className="form-input mobile-date-input"
              type="date"
              value={mobileDateIso}
              onChange={(event) => setCurrentDate(dayjs(event.target.value))}
            />
            <button className="btn btn-outline" type="button" onClick={() => setCurrentDate((value) => value.add(1, 'day'))}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mobile-progress">
            <div className="mobile-progress-copy">
              <strong>{mobileDaySummary.completed}/{mobileDaySummary.total}</strong>
              <span>đã chấm ngày {currentDate.format('DD/MM/YYYY')}</span>
            </div>
            <div className="mobile-progress-track">
              <div
                className="mobile-progress-fill"
                style={{ width: `${mobileDaySummary.total ? (mobileDaySummary.completed / mobileDaySummary.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="mobile-search-box">
            <Search size={17} />
            <input
              value={mobileSearchTerm}
              onChange={(event) => setMobileSearchTerm(event.target.value)}
              placeholder="Tìm công nhân"
            />
          </div>
          <div className="mobile-filter-scroll">
            {[
              ['all', 'Tất cả'],
              ['empty', 'Chưa chấm'],
              ['done', 'Đã chấm'],
              ['Absent', 'Nghỉ'],
              ['Leave', 'Phép']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`mobile-filter-chip ${mobileStatusFilter === value ? 'active' : ''}`}
                onClick={() => setMobileStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
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
        ) : activeWorkers.length === 0 ? (
          <div className="empty-state">Chưa có công nhân. Hãy thêm công nhân trước khi chấm công.</div>
        ) : (
          <>
          <div className="mobile-attendance-list">
            {mobileWorkers.length === 0 ? (
              <div className="empty-state">Không có công nhân phù hợp bộ lọc.</div>
            ) : mobileWorkers.map((worker) => {
              const record = getDayRecord(worker.id, mobileDateIso);
              const statusLabel = quickStatuses.find((item) => item.value === record?.status)?.label || 'Chưa chấm';
              const travelCost = Number(record?.travelCost || 0);
              return (
                <article key={worker.id} className={`mobile-attendance-card ${record ? 'is-done' : ''}`}>
                  <div className="mobile-attendance-card-head">
                    <div className="worker-avatar">{(worker.name || '?').trim().charAt(0).toUpperCase()}</div>
                    <div>
                      <h3>{worker.name}</h3>
                      <p>{worker.dailyRate ? `${Number(worker.dailyRate).toLocaleString('vi-VN')}đ/ngày` : 'Chưa có lương mặc định'}</p>
                    </div>
                    <span className="mobile-status-pill">{statusLabel}</span>
                  </div>

                  {(record?.location || record?.position || record?.note || travelCost > 0) && (
                    <div className="mobile-attendance-details">
                      {record.location && <span><MapPin size={13} /> {record.location}</span>}
                      {record.position && <span><Briefcase size={13} /> {record.position}</span>}
                      {travelCost > 0 && <span><Truck size={13} /> {travelCost.toLocaleString('vi-VN')}đ</span>}
                      {record.note && <span>{record.note}</span>}
                    </div>
                  )}

                  <div className="mobile-quick-status-grid">
                    {quickStatuses.map((status) => {
                      const key = `${worker.id}-${mobileDateIso}-${status.value}`;
                      return (
                        <button
                          key={status.value}
                          type="button"
                          className={`quick-status-btn ${record?.status === status.value ? 'active' : ''}`}
                          onClick={() => handleQuickStatus(worker, status.value)}
                          disabled={Boolean(quickSavingKey)}
                        >
                          {quickSavingKey === key ? '...' : status.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="btn btn-outline mobile-detail-btn"
                    type="button"
                    onClick={() => handleCellClick(worker, currentDate.format('DD/MM'), mobileDateIso)}
                  >
                    Nhập chi tiết
                  </button>
                </article>
              );
            })}
          </div>

          <div className="attendance-table-wrap desktop-attendance-table">
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
                {activeWorkers.map((worker) => (
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
                      const showWorkDetails = WORK_DETAIL_STATUSES.has(status);
                      const travelCost = Number(record?.travelCost || 0);
                      const dailyRate = Number(record?.dailyRate || 0);
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
                                {showWorkDetails && record.location && (
                                  <div className="cell-detail-line"><MapPin size={10} /> {record.location}</div>
                                )}
                                {showWorkDetails && record.position && (
                                  <div className="cell-detail-line"><Briefcase size={10} /> {record.position}</div>
                                )}
                                {showWorkDetails && dailyRate > 0 && (
                                  <div className="cell-amount">
                                    {dailyRate.toLocaleString('vi-VN')}đ
                                  </div>
                                )}
                                {travelCost > 0 && (
                                  <div className="cell-detail-line"><Truck size={10} /> {travelCost.toLocaleString('vi-VN')}đ</div>
                                )}
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
          </>
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
                  <button type="button" className={`attendance-btn ${editStatus === 'Full' ? 'active-full' : ''}`} onClick={() => handleEditStatusChange('Full')}>
                    Đủ công
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Half' ? 'active-half' : ''}`} onClick={() => handleEditStatusChange('Half')}>
                    Nửa công
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Absent' ? 'active-absent' : ''}`} onClick={() => handleEditStatusChange('Absent')}>
                    Nghỉ
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Holiday' ? 'active-holiday' : ''}`} onClick={() => handleEditStatusChange('Holiday')}>
                    Nghỉ lễ
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Leave' ? 'active-leave' : ''}`} onClick={() => handleEditStatusChange('Leave')}>
                    Phép
                  </button>
                  <button type="button" className={`attendance-btn ${editStatus === 'Travel' ? 'active-travel' : ''}`} onClick={() => handleEditStatusChange('Travel')}>
                    Di chuyển
                  </button>
                </div>
              </div>

              {showWorkDetailForm && (
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
                      <CurrencyInput
                        value={editRate}
                        onValueChange={setEditRate}
                        icon={Wallet}
                        wrapperClassName="input-with-icon"
                        inputClassName="form-input embedded-input"
                        placeholder="650.000"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tiền xe / Di chuyển</label>
                      <CurrencyInput
                        value={editTravelCost}
                        onValueChange={setEditTravelCost}
                        icon={Truck}
                        wrapperClassName="input-with-icon"
                        inputClassName="form-input embedded-input"
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
                      placeholder="Ví dụ: Nghỉ lễ Giải phóng miền Nam"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {showSupplementaryForm && (
                <div className="attendance-form-stack">
                  {editStatus === 'Travel' && (
                    <div className="form-group">
                    <label className="form-label">Tiền xe / Di chuyển</label>
                      <CurrencyInput
                        value={editTravelCost}
                        onValueChange={setEditTravelCost}
                        icon={Truck}
                        wrapperClassName="input-with-icon"
                        inputClassName="form-input embedded-input"
                        placeholder="0"
                      />
                    </div>
                  )}
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
