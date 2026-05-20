import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, RefreshCw } from 'lucide-react';

const INITIAL_STATE = {
    status: 'idle',
    progress: 0,
    updateInfo: null,
    appVersion: '',
    errorMessage: ''
};

const UpdateBanner = () => {
    const [state, setState] = useState(INITIAL_STATE);

    useEffect(() => {
        const updater = window.electronAPI;
        if (!updater) return undefined;

        updater.getAppVersion?.().then((version) => {
            setState((current) => ({ ...current, appVersion: version || '' }));
        });

        const cleanups = [
            updater.onUpdateChecking?.(() => {
                setState((current) => ({
                    ...current,
                    status: 'checking',
                    errorMessage: ''
                }));
            }),
            updater.onUpdateAvailable((info) => {
                setState((current) => ({
                    ...current,
                    status: 'available',
                    updateInfo: info,
                    errorMessage: ''
                }));
            }),
            updater.onUpdateNotAvailable?.(() => {
                setState((current) => (
                    current.status === 'checking'
                        ? { ...current, status: 'idle', errorMessage: '' }
                        : current
                ));
            }),
            updater.onDownloadProgress((progress) => {
                setState((current) => ({
                    ...current,
                    status: 'downloading',
                    progress: Math.round(progress?.percent || 0),
                    errorMessage: ''
                }));
            }),
            updater.onUpdateDownloaded((info) => {
                setState((current) => ({
                    ...current,
                    status: 'downloaded',
                    progress: 100,
                    updateInfo: info || current.updateInfo,
                    errorMessage: ''
                }));
            }),
            updater.onUpdateError((error) => {
                setState((current) => ({
                    ...current,
                    status: 'error',
                    errorMessage: error?.message || 'Khong the cap nhat ung dung.'
                }));
            })
        ];

        return () => {
            cleanups.forEach((cleanup) => cleanup?.());
        };
    }, []);

    if (state.status === 'idle') return null;

    const isChecking = state.status === 'checking';
    const isDownloaded = state.status === 'downloaded';
    const isDownloading = state.status === 'downloading';
    const isError = state.status === 'error';
    const version = state.updateInfo?.version;

    return (
        <div className={`update-banner update-banner-${state.status}`} role="status">
            <div className="update-banner-icon">
                {isError ? <AlertTriangle size={20} /> : isDownloaded ? <CheckCircle2 size={20} /> : <Download size={20} />}
            </div>

            <div className="update-banner-copy">
                <strong>
                    {isChecking && 'Dang kiem tra cap nhat'}
                    {state.status === 'available' && 'Co ban cap nhat moi'}
                    {isDownloading && 'Dang tai ban cap nhat'}
                    {isDownloaded && 'Ban cap nhat da san sang'}
                    {isError && 'Cap nhat chua hoan tat'}
                </strong>
                <span>
                    {isDownloaded
                        ? 'Hay tat app bang nut ben duoi de cai dat. Ung dung se tu mo lai sau khi cap nhat xong.'
                        : isError
                            ? state.errorMessage
                            : isChecking
                                ? `Phien ban hien tai ${state.appVersion || ''}`.trim()
                                : `Phien ban ${version || 'moi'} se duoc tai tu dong.`}
                </span>

                {(isDownloading || isDownloaded) && (
                    <div className="update-progress-track" aria-label={`Tien do tai ${state.progress}%`}>
                        <div className="update-progress-fill" style={{ width: `${state.progress}%` }} />
                    </div>
                )}
            </div>

            {isDownloaded && (
                <button type="button" className="update-banner-action" onClick={() => window.electronAPI?.restartApp()}>
                    <RefreshCw size={16} />
                    Tat app va cap nhat
                </button>
            )}
        </div>
    );
};

export default UpdateBanner;
