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

    return 'http://127.0.0.1:5000/api';
}

const API_URL = resolveApiUrl();
const apiClient = axios.create({
    baseURL: API_URL
});

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

export const saveAttendanceRecord = async (date, workerId, status, dailyRate, position, location, note) => {
    const response = await apiClient.post('/attendance/record', { 
        date, workerId, status, dailyRate, position, location, note 
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
    link.download = `Bang_Cham_Cong_${month}_${year}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const downloadWorkerReport = async (workerId, startDate, endDate, label) => {
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
    link.download = `Bao_Cao_Ca_Nhan.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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
