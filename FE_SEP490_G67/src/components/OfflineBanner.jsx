import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { db } from '@/lib/db';

export default function OfflineBanner() {
    const { isOnline, checkNow } = useOnlineStatus();
    const [pendingCount, setPendingCount] = useState(0);
    const [isChecking, setIsChecking] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);
    const [showRestored, setShowRestored] = useState(false);

    // Watch pending queue count via events (no 3s interval polling)
    useEffect(() => {
        let mounted = true;
        const checkQueue = async () => {
            try {
                const count = await db.offline_queue
                    .where('status')
                    .anyOf(['PENDING', 'FAILED'])
                    .count();
                if (mounted) setPendingCount(count);
            } catch {
                // Ignore DB errors
            }
        };

        checkQueue();
        window.addEventListener('offline-queue-changed', checkQueue);
        return () => {
            mounted = false;
            window.removeEventListener('offline-queue-changed', checkQueue);
        };
    }, []);

    // Handle offline -> online transition message
    useEffect(() => {
        if (!isOnline) {
            setWasOffline(true);
            setShowRestored(false);
        } else if (wasOffline) {
            setShowRestored(true);
            const timer = setTimeout(() => {
                setShowRestored(false);
                setWasOffline(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, wasOffline]);

    const handleRetry = async () => {
        setIsChecking(true);
        try {
            await checkNow();
        } finally {
            setIsChecking(false);
        }
    };

    if (isOnline && !showRestored && pendingCount === 0) {
        return null;
    }

    if (showRestored && isOnline) {
        return (
            <div className="bg-emerald-600 text-white px-4 py-2 text-sm shadow-md transition-all duration-300 flex items-center justify-between z-[9999] relative">
                <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
                    <Wifi className="w-4 h-4 text-emerald-200 animate-pulse" />
                    <span>
                        <strong>Đã có kết nối Internet trở lại!</strong> Hệ thống đang hoạt động ở chế độ trực tuyến.
                        {pendingCount > 0 && ` Đang chuẩn bị đồng bộ ${pendingCount} đơn hàng...`}
                    </span>
                </div>
            </div>
        );
    }

    if (!isOnline) {
        return (
            <div className="bg-amber-600 text-white px-4 py-2 text-sm shadow-md transition-all duration-300 flex items-center justify-between z-[9999] relative">
                <div className="flex items-center justify-between max-w-7xl mx-auto w-full flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <WifiOff className="w-4 h-4 text-amber-200 animate-pulse flex-shrink-0" />
                        <span>
                            <strong>Chế độ Ngoại tuyến (Offline):</strong> Mất kết nối Internet. Bạn vẫn có thể tiếp tục bán hàng tại POS và xem dữ liệu đã lưu.
                        </span>
                        {pendingCount > 0 && (
                            <span className="bg-amber-800 text-amber-100 text-xs px-2 py-0.5 rounded-full font-medium ml-2">
                                {pendingCount} đơn chờ đồng bộ
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleRetry}
                        disabled={isChecking}
                        className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white px-3 py-1 rounded text-xs font-medium transition cursor-pointer disabled:opacity-50 ml-auto"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                        {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                    </button>
                </div>
            </div>
        );
    }

    // Still has pending orders while online
    if (pendingCount > 0) {
        return (
            <div className="bg-blue-600 text-white px-4 py-1.5 text-xs shadow-sm flex items-center justify-between z-[9999] relative">
                <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-200" />
                        <span>Có <strong>{pendingCount}</strong> đơn hàng ngoại tuyến đang chờ đồng bộ lên máy chủ.</span>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
