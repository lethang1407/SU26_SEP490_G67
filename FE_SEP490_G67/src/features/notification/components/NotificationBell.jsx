import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
} from '../api';
import { openNotificationStream } from '../api/stream';
import {
    NOTIFICATION_PAGE_SIZE,
    NOTIFICATION_TYPE_FILTERS,
    NOTIFICATION_TYPE_LABELS,
} from '../constants';
import { formatRelativeTime, resolveNotificationTarget } from '../utils/notificationRoute';
import '../../../css/NotificationBell.css';

const POLL_INTERVAL_MS = 60_000;

const NO_FILTER = { isRead: null, type: null };

export default function NotificationBell() {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [items, setItems] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [filter, setFilter] = useState(NO_FILTER);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const panelRef = useRef(null);
    const viewRef = useRef({ isOpen: false, filter: NO_FILTER });

    const refreshUnreadCount = useCallback(async () => {
        try {
            setUnreadCount(await getUnreadNotificationCount());
        } catch (error) {
            console.error("Failed to fetch unread notification count:", error);
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
        viewRef.current = { isOpen, filter };
    }, [isOpen, filter]);

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

    const loadNotifications = useCallback(async (targetFilter, targetPage, append) => {
        if (append) setIsLoadingMore(true);
        else setIsLoading(true);
        setLoadError(null);
        try {
            const result = await getNotifications({
                page: targetPage,
                size: NOTIFICATION_PAGE_SIZE,
                types: targetFilter.type ? [targetFilter.type] : undefined,
                isRead: targetFilter.isRead,
            });
            const rows = result.content ?? [];
            setItems(prev => (append ? [...prev, ...rows] : rows));
            setPage(result.page ?? targetPage);
            setTotalPages(result.totalPages ?? 0);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
            setLoadError('Không tải được thông báo. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        return openNotificationStream({
            onCreated: () => {
                refreshUnreadCount();
                const { isOpen: panelOpen, filter: activeFilter } = viewRef.current;
                if (panelOpen) loadNotifications(activeFilter, 1, false);
            },
            // Đọc ở tab khác thì badge tab này phải giảm theo.
            onRead: () => refreshUnreadCount(),
        });
    }, [refreshUnreadCount, loadNotifications]);

    const handleToggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next) {
            setFilter(NO_FILTER);
            loadNotifications(NO_FILTER, 1, false);
        }
    };

    const applyFilter = (nextFilter) => {
        setFilter(nextFilter);
        setPage(1);
        loadNotifications(nextFilter, 1, false);
    };

    const handleSelect = async (notification) => {
        setIsOpen(false);

        if (!notification.isRead) {
            setItems(prev => prev.map(item =>
                item.id === notification.id ? { ...item, isRead: true } : item));
            setUnreadCount(prev => Math.max(0, prev - 1));
            try {
                await markNotificationRead(notification.id);
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
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
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
            refreshUnreadCount();
            loadNotifications(filter, 1, false);
        }
        if (filter.isRead === false) loadNotifications(filter, 1, false);
    };

    const isActive = (candidate) =>
        filter.isRead === candidate.isRead && filter.type === candidate.type;

    const hasMore = page < totalPages;

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
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>

                    <div className="notification-panel__filters">
                        <button
                            type="button"
                            className={`notification-chip${isActive(NO_FILTER) ? ' notification-chip--active' : ''}`}
                            onClick={() => applyFilter(NO_FILTER)}
                        >
                            Tất cả
                        </button>
                        <button
                            type="button"
                            className={`notification-chip${isActive({ isRead: false, type: null }) ? ' notification-chip--active' : ''}`}
                            onClick={() => applyFilter({ isRead: false, type: null })}
                        >
                            Chưa đọc
                        </button>
                        {NOTIFICATION_TYPE_FILTERS.map((type) => (
                            <button
                                key={type}
                                type="button"
                                className={`notification-chip${isActive({ isRead: null, type }) ? ' notification-chip--active' : ''}`}
                                onClick={() => applyFilter({ isRead: null, type })}
                            >
                                {NOTIFICATION_TYPE_LABELS[type]}
                            </button>
                        ))}
                    </div>

                    <div className="notification-panel__body">
                        {isLoading && (
                            <div className="notification-panel__empty">Đang tải...</div>
                        )}
                        {!isLoading && loadError && (
                            <div className="notification-panel__empty">{loadError}</div>
                        )}
                        {!isLoading && !loadError && items.length === 0 && (
                            <div className="notification-panel__empty">
                                {isActive(NO_FILTER)
                                    ? 'Chưa có thông báo nào.'
                                    : 'Không có thông báo nào khớp bộ lọc.'}
                            </div>
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
                        {!isLoading && !loadError && hasMore && (
                            <button
                                type="button"
                                className="notification-panel__more"
                                disabled={isLoadingMore}
                                onClick={() => loadNotifications(filter, page + 1, true)}
                            >
                                {isLoadingMore ? 'Đang tải...' : 'Xem thêm'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
