import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Zap, Sparkles } from 'lucide-react';

const UpdateBanner = () => {
    const [status, setStatus] = useState('idle'); // idle, available, downloading, downloaded
    const [progress, setProgress] = useState(0);
    const [updateInfo, setUpdateInfo] = useState(null);

    useEffect(() => {
        if (!window.electron) return;

        window.electron.onUpdateAvailable((info) => {
            setStatus('available');
            setUpdateInfo(info);
        });

        window.electron.onDownloadProgress((progressObj) => {
            setStatus('downloading');
            setProgress(Math.round(progressObj.percent));
        });

        window.electron.onUpdateDownloaded(() => {
            setStatus('downloaded');
            setProgress(100);
        });
    }, []);

    const handleInstall = () => {
        if (window.electron) {
            window.electron.restartApp();
        }
    };

    if (status === 'idle') return null;

    return (
        <div className={`update-banner ${status !== 'idle' ? 'show' : ''}`}>
            <div className="update-header">
                <div className="update-icon-box">
                    {status === 'downloaded' ? (
                        <Sparkles className="text-white w-6 h-6" />
                    ) : (
                        <Zap className="text-white w-6 h-6" />
                    )}
                </div>
                <div className="update-info">
                    <div className="update-status-title">
                        {status === 'available' && 'Có bản cập nhật mới!'}
                        {status === 'downloading' && 'Đang tải bản cập nhật...'}
                        {status === 'downloaded' && 'Đã sẵn sàng nâng cấp!'}
                    </div>
                    {updateInfo && (
                        <span className="update-version-tag">
                            Phiên bản {updateInfo.version}
                        </span>
                    )}
                </div>
            </div>

            <div className="update-body">
                {(status === 'downloading' || status === 'downloaded') && (
                    <>
                        <div className="update-progress-info">
                            <span>Tiến độ</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="update-progress-track">
                            <div 
                                className="update-progress-fill" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </>
                )}
            </div>

            <div className="update-actions">
                {status === 'available' && (
                    <div className="text-xs text-slate-400 italic">
                        Bản cập nhật đang được tải xuống tự động...
                    </div>
                )}
                {status === 'downloaded' && (
                    <button onClick={handleInstall} className="update-btn-primary">
                        Cập nhật ngay
                    </button>
                )}
            </div>
        </div>
    );
};

export default UpdateBanner;
