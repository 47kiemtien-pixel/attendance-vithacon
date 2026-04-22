import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

export const getWorkers = async () => {
    const response = await axios.get(`${API_URL}/workers`);
    return response.data;
};

export const addWorker = async (workerData) => {
    const response = await axios.post(`${API_URL}/workers`, workerData);
    return response.data;
};

export const updateWorker = async (id, workerData) => {
    const response = await axios.put(`${API_URL}/workers/${id}`, workerData);
    return response.data;
};

export const getAttendance = async () => {
    const response = await axios.get(`${API_URL}/attendance`);
    return response.data;
};

export const saveAttendance = async (date, records) => {
    const response = await axios.post(`${API_URL}/attendance`, { date, records });
    return response.data;
};

export const saveAttendanceRecord = async (date, workerId, status, dailyRate, position, location) => {
    const response = await axios.post(`${API_URL}/attendance/record`, { 
        date, workerId, status, dailyRate, position, location 
    });
    return response.data;
};

export const getSettings = async () => {
    const response = await axios.get(`${API_URL}/settings`);
    return response.data;
};

export const saveSettings = async (settings) => {
    const response = await axios.post(`${API_URL}/settings`, settings);
    return response.data;
};

export const getExportUrl = (month, year) => {
    return `${API_URL}/export?month=${month}&year=${year}`;
};

export const downloadReport = async (month, year) => {
    const response = await axios.get(`${API_URL}/export`, {
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

export const exportBackup = async () => {
    const response = await axios.get(`${API_URL}/backup`);
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
    const response = await axios.post(`${API_URL}/restore`, jsonData);
    return response.data;
};
