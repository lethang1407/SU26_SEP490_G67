import { useEffect, useState } from 'react';
import { dashboardApi, toLocalDateKey } from '@/features/dashboard/api/dashboardApi';

const ACTIVITY_LIMIT = 8;

const formatTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatAmount = (amount) =>
    `${new Intl.NumberFormat('vi-VN').format(Math.abs(amount ?? 0))}đ`;

/** Số mili giây tới 00:00:01 ngày mai theo giờ máy. */
const msUntilNextDay = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    return next.getTime() - now.getTime();
};

export default function RecentActivity() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Ngày đang hiển thị — đổi sang ngày mới là bảng tự tải lại hoạt động của ngày đó.
    const [day, setDay] = useState(() => toLocalDateKey());

    // Sang ngày mới: hẹn giờ tới nửa đêm. Máy ngủ / tab ẩn thì timer có thể trễ, nên khi tab
    // hiện lại cũng kiểm tra ngày một lần nữa.
    useEffect(() => {
        const syncDay = () => setDay(toLocalDateKey());
        const timer = setTimeout(syncDay, msUntilNextDay());
        const onVisible = () => {
            if (document.visibilityState === 'visible') syncDay();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [day]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const rows = await dashboardApi.getRecentActivities({ limit: ACTIVITY_LIMIT, date: day });
                if (!cancelled) {
                    setActivities(rows);
                    setError(null);
                }
            } catch (error) {
                console.error("Failed to fetch recent activities:", error);
                if (!cancelled) setError('Không tải được hoạt động gần đây.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [day]);

    return (
        <section className="dashboard-card dashboard-card--compact recent-activity-card">
            <div className="dashboard-card_header">
                <h3 className="dashboard-card_title">Hoạt động gần đây</h3>
                <span className="dashboard-card_subtitle">Hôm nay</span>
            </div>
            <div className="recent-tx_table-wrapper">
                <table className="recent-tx_table recent-tx_table--overview">
                    <thead>
                        <tr>
                            <th className="text-left">Thời gian</th>
                            <th className="text-left">Hoạt động</th>
                            <th className="text-left">Người thực hiện</th>
                            <th className="text-right">Giá trị</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={4} className="text-center">Đang tải...</td>
                            </tr>
                        )}
                        {!loading && error && (
                            <tr>
                                <td colSpan={4} className="text-center">{error}</td>
                            </tr>
                        )}
                        {!loading && !error && activities.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center">Hôm nay chưa có hoạt động nào.</td>
                            </tr>
                        )}
                        {!loading && !error && activities.map((activity) => (
                            <tr key={activity.id}>
                                <td className="recent-tx_time">{formatTime(activity.at)}</td>
                                <td>
                                    <div className="recent-tx_activity">
                                        <span className={`recent-tx_activity-type recent-tx_activity-type--${activity.tone}`}>
                                            {activity.type}
                                        </span>
                                        <span className="recent-tx_activity-customer">{activity.partner}</span>
                                    </div>
                                </td>
                                <td className="recent-tx_user">{activity.user}</td>
                                <td className={`recent-tx_amount recent-tx_amount--${activity.tone}`}>
                                    {formatAmount(activity.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
