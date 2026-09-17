import React from 'react';
import { Clock, Info } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function CachedDataBanner({ timestamp, className = '' }) {
    const { isOnline } = useOnlineStatus();

    if (isOnline && !timestamp) return null;

    const formattedTime = timestamp
        ? new Date(timestamp).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
          })
        : null;

    if (!isOnline) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs mb-4 ${className}`}>
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                    <strong>Chế độ xem ngoại tuyến:</strong> Đang hiển thị dữ liệu đã lưu trong bộ nhớ đệm
                    {formattedTime && ` (lúc ${formattedTime})`}. Bạn chỉ có thể xem, không thể thực hiện thao tác tạo mới hay chỉnh sửa.
                </span>
            </div>
        );
    }

    return null;
}
