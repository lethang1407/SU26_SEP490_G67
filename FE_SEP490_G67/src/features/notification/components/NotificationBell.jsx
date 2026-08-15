import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
} from '../api';
import { formatRelativeTime, resolveNotificationTarget } from '../utils/notificationRoute';
import '../../../css/NotificationBell.css';

const POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 10;

/**
 * Chuông thông báo trên header. Số chưa đọc được nạp lại theo chu kỳ; danh sách
 * chỉ tải khi mở dropdown để không gọi API thừa ở mọi trang.
 */
export default function NotificationBell() {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [items, setItems] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const panelRef = useRef(null);

    const refreshUnreadCount = useCallback(async () => {
        try {
            setUnreadCount(await getUnreadNotificationCount());
        } catch {
            // Thông báo là thông tin phụ trợ: lỗi mạng không nên làm ồn header.
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            if (!cancelled) await refreshUnreadCount();
        };
        tick();
        const timer = setInterval(tick, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [refreshUnreadCount]);

    useEffect(() => {
        if (!isOpen) return undefined;
        function handleClickOutside(event) {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const page = await getNotifications({ page: 1, size: PAGE_SIZE });
            setItems(page.content ?? []);
        } catch {
            setLoadError('Không tải được thông báo. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleToggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next) loadNotifications();
    };

    const handleSelect = async (notification) => {
        setIsOpen(false);

        if (!notification.isRead) {
            setItems(prev => prev.map(item =>
                item.id === notification.id ? { ...item, isRead: true } : item));
            setUnreadCount(prev => Math.max(0, prev - 1));
            try {
                await markNotificationRead(notification.id);
            } catch {
                refreshUnreadCount();
            }
        }

        const target = resolveNotificationTarget(notification);
        if (target) navigate(target);
    };

    const handleMarkAllRead = async () => {
        setItems(prev => prev.map(item => ({ ...item, isRead: true })));
        setUnreadCount(0);
        try {
            await markAllNotificationsRead();
        } catch {
            refreshUnreadCount();
            loadNotifications();
        }
    };

    return (
        <div className="notification-bell" ref={panelRef}>
            <button
                className="header-btn"
                aria-label="Thông báo"
                aria-expanded={isOpen}
                onClick={handleToggle}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-panel">
                    <div className="notification-panel__header">
                        <span className="notification-panel__title">Thông báo</span>
                        {unreadCount > 0 && (
                            <button
                                className="notification-panel__mark-all"
                                onClick={handleMarkAllRead}
                            >
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>

                    <div className="notification-panel__body">
                        {isLoading && (
                            <div className="notification-panel__empty">Đang tải...</div>
                        )}
                        {!isLoading && loadError && (
                            <div className="notification-panel__empty">{loadError}</div>
                        )}
                        {!isLoading && !loadError && items.length === 0 && (
                            <div className="notification-panel__empty">Chưa có thông báo nào.</div>
                        )}
                        {!isLoading && !loadError && items.map((item) => (
                            <button
                                key={item.id}
                                className={`notification-item${item.isRead ? '' : ' notification-item--unread'}`}
                                onClick={() => handleSelect(item)}
                            >
                                <span className="notification-item__title">{item.title}</span>
                                <span className="notification-item__message">{item.message}</span>
                                <span className="notification-item__time">
                                    {formatRelativeTime(item.createdAt)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
