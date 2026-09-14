import React, { useState, useEffect, useCallback, useRef } from 'react';

export function showOfflineToast() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-offline-toast'));
    }
}

export default function OfflineToast({ duration = 5000 }) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const timerRef = useRef(null);
    const exitTimerRef = useRef(null);

    const handleDismiss = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setExiting(true);
        exitTimerRef.current = setTimeout(() => {
            setVisible(false);
            setExiting(false);
        }, 250);
    }, []);

    useEffect(() => {
        const handleShow = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
            setExiting(false);
            setVisible(true);

            timerRef.current = setTimeout(() => {
                handleDismiss();
            }, duration);
        };

        window.addEventListener('show-offline-toast', handleShow);
        return () => {
            window.removeEventListener('show-offline-toast', handleShow);
            if (timerRef.current) clearTimeout(timerRef.current);
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        };
    }, [duration, handleDismiss]);

    if (!visible) return null;

    return (
        <div
            className={`pos-offline-toast${exiting ? ' pos-offline-toast--exit' : ''}`}
            onClick={handleDismiss}
            role="status"
            aria-live="polite"
            title="Bấm để đóng thông báo"
        >
            <div className="pos-offline-toast__icon">
                {/* Thick right arrow matching KiotViet's circular badge */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 11h11.17l-4.58-4.59L12 5l7 7-7 7-1.41-1.41L15.17 13H4v-2z" />
                </svg>
            </div>
            <div className="pos-offline-toast__text">
                <div>Không có kết nối internet. Giao dịch</div>
                <div>được lưu offline</div>
            </div>
        </div>
    );
}
