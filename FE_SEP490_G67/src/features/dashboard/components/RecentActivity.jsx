import { ShoppingCart, Box, RefreshCw } from 'lucide-react';

const activities = [
    {
        id: 1,
        time: '10:45 - Hôm nay',
        user: 'Staff',
        avatar: 'ST',
        avatarColor: '#86aae8',
        badgeLabel: 'Bán hàng',
        badgeIcon: ShoppingCart,
        badgeColor: '#e8f5e9',
        badgeTextColor: '#2e7d32',
        action: 'Bán đơn hàng #1234 - 450.000đ',
    },
    {
        id: 2,
        time: '09:12 - Hôm nay',
        user: 'Admin',
        avatar: 'AD',
        avatarColor: '#6d82a2',
        badgeLabel: 'Nhập kho',
        badgeIcon: Box,
        badgeColor: '#D8E3FB',
        badgeTextColor: '#434655',
        action: 'Nhập hàng từ NCC A - Phiếu nhập #PN882',
    },
    {
        id: 3,
        time: '08:30 - Hôm nay',
        user: 'Staff',
        avatar: 'ST',
        avatarColor: '#86aae8',
        badgeLabel: 'Bán hàng',
        badgeIcon: ShoppingCart,
        badgeColor: '#e8f5e9',
        badgeTextColor: '#2e7d32',
        action: 'Bán đơn hàng #1233 - 125.000đ',
    },
    {
        id: 4,
        time: '23:45 - Hôm qua',
        user: 'Hệ thống',
        avatar: 'HT',
        avatarColor: '#e65100',
        badgeLabel: 'Tự động',
        badgeIcon: RefreshCw,
        badgeColor: '#fff3e0',
        badgeTextColor: '#e65100',
        action: 'Đóng ca và tổng hợp báo cáo cuối ngày',
    },
];

export default function RecentActivity() {
    return (
        <div className="dashboard-card recent-activity-card">
            <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">Hoạt động gần đây</h3>
                <button className="recent-activity__view-all">Xem tất cả</button>
            </div>
            <div className="recent-activity__table-wrapper">
                <table className="recent-activity__table">
                    <thead>
                        <tr>
                            <th>Thời gian</th>
                            <th>Người dùng</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activities.map((act) => (
                            <tr key={act.id}>
                                <td className="recent-activity__time">{act.time}</td>
                                <td>
                                    <div className="recent-activity__user">
                                        <span
                                            className="recent-activity__avatar"
                                            style={{ background: act.avatarColor }}
                                        >
                                            {act.avatar}
                                        </span>
                                        <span className="recent-activity__username">{act.user}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="recent-activity__action">
                                        <span
                                            className="recent-activity__badge"
                                            style={{
                                                background: act.badgeColor,
                                                color: act.badgeTextColor,
                                            }}
                                        >
                                            <act.badgeIcon size={14} /> {act.badgeLabel}
                                        </span>
                                        <span className="recent-activity__desc">{act.action}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
