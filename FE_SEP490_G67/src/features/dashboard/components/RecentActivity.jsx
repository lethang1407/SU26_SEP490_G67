const activities = [
    {
        id: 1,
        time: '14:32',
        type: 'Bán hàng',
        customer: 'Khách lẻ',
        user: 'Lan Nguyễn',
        amount: '+ 125.000đ',
        amountType: 'income',
    },
    {
        id: 2,
        time: '14:15',
        type: 'Bán nợ',
        customer: 'Cô Lan',
        user: 'Lan Nguyễn',
        amount: '+ 45.000đ',
        amountType: 'warning',
    },
    {
        id: 3,
        time: '13:40',
        type: 'Nhập hàng',
        customer: 'Đại lý bia',
        user: 'Đức Thắng',
        amount: '- 850.000đ',
        amountType: 'expense',
    },
    {
        id: 4,
        time: '13:10',
        type: 'Hủy hóa đơn',
        customer: 'HD00128',
        user: 'Đức Thắng',
        amount: '65.000đ',
        amountType: 'alert-expense',
        alert: true,
    },
    {
        id: 5,
        time: '12:45',
        type: 'Bán hàng',
        customer: 'Khách lẻ',
        user: 'Lan Nguyễn',
        amount: '+ 210.000đ',
        amountType: 'income',
    },
    {
        id: 6,
        time: '12:10',
        type: 'Bán hàng',
        customer: 'Chú Tư',
        user: 'Lan Nguyễn',
        amount: '+ 55.000đ',
        amountType: 'income',
    },
];

export default function RecentActivity() {
    return (
        <section className="dashboard-card dashboard-card--compact recent-activity-card">
            <div className="dashboard-card_header">
                <h3 className="dashboard-card_title">Hoạt động gần đây</h3>
            </div>
            <div className="recent-tx_table-wrapper">
                <table className="recent-tx_table recent-tx_table--overview">
                    <thead>
                        <tr>
                            <th className="text-left">Giờ</th>
                            <th className="text-left">Hoạt động</th>
                            <th className="text-left">Người thực hiện</th>
                            <th className="text-right">Số tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activities.map((activity) => (
                            <tr
                                key={activity.id}
                                className={activity.alert ? 'recent-tx_row--alert' : undefined}
                            >
                                <td className="recent-tx_time">{activity.time}</td>
                                <td>
                                    <div className="recent-tx_activity">
                                        <span className="recent-tx_activity-type">
                                            {activity.alert && <span className="recent-tx_alert-dot">● </span>}
                                            {activity.type}
                                        </span>
                                        <span className="recent-tx_activity-customer">{activity.customer}</span>
                                    </div>
                                </td>
                                <td className="recent-tx_user">{activity.user}</td>
                                <td className={`recent-tx_amount recent-tx_amount--${activity.amountType}`}>
                                    {activity.amount}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="recent-activity-card_footer-wrap">
                <button className="recent-activity-card_footer" type="button">
                    Xem lịch sử đầy đủ
                </button>
            </div>
        </section>
    );
}