import axios from 'axios';
import { clearAuthSession, getStoredToken } from './auth';

function resolveApiUrl() {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const runtimeApiUrl = params.get('apiUrl');
        if (runtimeApiUrl) return runtimeApiUrl;
    }

    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    return 'http://127.0.0.1:5005/api';
}

const API_URL = resolveApiUrl();
const apiClient = axios.create({
    baseURL: API_URL
});

const FILE_PREFIX = 'Viet_Thanh';

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
    return `${[FILE_PREFIX, ...parts.map(sanitizeFilenamePart).filter(Boolean)].join('_')}.${extension}`;
}

apiClient.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            clearAuthSession();
        }
        return Promise.reject(error);
    }
);

export const getApiUrl = () => API_URL;

export const getAuthStatus = async () => {
    const response = await apiClient.get('/auth/status');
    return response.data;
};

export const bootstrapAdmin = async (payload) => {
    const response = await apiClient.post('/auth/bootstrap', payload);
    return response.data;
};

export const login = async (payload) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
};

export const getWorkers = async () => {
    const response = await apiClient.get('/workers');
    return response.data;
};

export const addWorker = async (workerData) => {
    const response = await apiClient.post('/workers', workerData);
    return response.data;
};

export const updateWorker = async (id, workerData) => {
    const response = await apiClient.put(`/workers/${id}`, workerData);
    return response.data;
};

export const getAttendance = async () => {
    const response = await apiClient.get('/attendance');
    return response.data;
};

export const saveAttendance = async (date, records) => {
    const response = await apiClient.post('/attendance', { date, records });
    return response.data;
};

export const saveAttendanceRecord = async (date, workerId, status, dailyRate, position, location, note, travelCost) => {
    const response = await apiClient.post('/attendance/record', { 
        date, workerId, status, dailyRate, position, location, note, travelCost 
    });
    return response.data;
};

export const getSettings = async () => {
    const response = await apiClient.get('/settings');
    return response.data;
};

export const saveSettings = async (settings) => {
    const response = await apiClient.post('/settings', settings);
    return response.data;
};

export const getExportUrl = (month, year) => {
    return `${API_URL}/export?month=${month}&year=${year}`;
};

export const downloadReport = async (month, year) => {
    const response = await apiClient.get('/export', {
        params: { month, year },
        responseType: 'blob'
    });

    const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = buildReportFilename(['Bang_Cong_Thang', month, year], 'xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const downloadWorkerReport = async (workerId, startDate, endDate, label) => {
    try {
        const response = await apiClient.get('/export/worker', {
            params: { workerId, startDate, endDate, label },
            responseType: 'blob'
        });

        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = buildReportFilename(['Bao_Cao_Ca_Nhan', dateRangePart(startDate, endDate)], 'xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        if (error.response && error.response.data instanceof Blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorData = JSON.parse(reader.result);
                        const msg = errorData.message || errorData.error || 'Lỗi không xác định từ máy chủ';
                        alert(`LỖI HỆ THỐNG: ${msg}`);
                        reject(new Error(msg));
                    } catch (e) {
                        alert(`Lỗi máy chủ (500). Vui lòng kiểm tra lại dữ liệu.`);
                        reject(error);
                    }
                };
                reader.onerror = () => reject(error);
                reader.readAsText(error.response.data);
            });
        } else {
            throw error;
        }
    }
};

export const downloadWorkersReport = async (workerIds, startDate, endDate, label) => {
    const response = await apiClient.get('/export/workers', {
        params: { workerIds: workerIds.join(','), startDate, endDate, label },
        responseType: 'blob'
    });

    const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = buildReportFilename(['Bao_Cao_Nhieu_Nguoi', dateRangePart(startDate, endDate)], 'xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const downloadWorkerReportDocx = async (workerId, startDate, endDate, label) => {
    try {
        const response = await apiClient.get('/export/worker/docx', {
            params: { workerId, startDate, endDate, label },
            responseType: 'blob'
        });

        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = buildReportFilename(['Bao_Cao_Ca_Nhan', dateRangePart(startDate, endDate)], 'docx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        throw error;
    }
};

export const downloadWorkersReportDocx = async (workerIds, startDate, endDate, label) => {
    try {
        const response = await apiClient.get('/export/workers/docx', {
            params: { workerIds: workerIds.join(','), startDate, endDate, label },
            responseType: 'blob'
        });

        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = buildReportFilename(['Bao_Cao_Nhieu_Nguoi', dateRangePart(startDate, endDate)], 'docx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        throw error;
    }
};

export const exportBackup = async () => {
    const response = await apiClient.get('/backup');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchorNode.setAttribute("download", `attendance_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

export const importBackup = async (jsonData) => {
    const response = await apiClient.post('/restore', jsonData);
    return response.data;
};
