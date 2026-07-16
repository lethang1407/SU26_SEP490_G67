import { ShoppingCart, CreditCard, Package } from 'lucide-react';

const transactions = [
    {
        id: 1,
        time: '14:32',
        type: 'sale',
        typeLabel: 'Bán hàng',
        typeIcon: ShoppingCart,
        customer: 'Khách lẻ',
        amount: '45.000đ',
        status: 'done',
        statusLabel: 'Hoàn thành',
    },
    {
        id: 2,
        time: '14:15',
        type: 'debt',
        typeLabel: 'Bán nợ',
        typeIcon: CreditCard,
        customer: 'Nguyễn Văn A',
        amount: '120.000đ',
        status: 'debt',
        statusLabel: 'Ghi nợ',
    },
    {
        id: 3,
        time: '13:58',
        type: 'import',
        typeLabel: 'Nhập hàng',
        typeIcon: Package,
        customer: 'NCC Thành Đạt',
        amount: '850.000đ',
        status: 'imported',
        statusLabel: 'Đã nhập',
    },
    {
        id: 4,
        time: '13:20',
        type: 'sale',
        typeLabel: 'Bán hàng',
        typeIcon: ShoppingCart,
        customer: 'Khách lẻ',
        amount: '67.000đ',
        status: 'done',
        statusLabel: 'Hoàn thành',
    },
    {
        id: 5,
        time: '12:45',
        type: 'sale',
        typeLabel: 'Bán hàng',
        typeIcon: ShoppingCart,
        customer: 'Trần Thị B',
        amount: '235.000đ',
        status: 'done',
        statusLabel: 'Hoàn thành',
    },
];

export default function RecentActivity() {
    return (
        <div className="dashboard-card">
            <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">Giao Dịch Gần Đây</h3>
                <button className="dashboard-card__link">
                    Xem tất cả
                </button>
            </div>
            <div className="recent-tx__table-wrapper">
                <table className="recent-tx__table">
                    <thead>
                        <tr>
                            <th>Giờ</th>
                            <th>Loại</th>
                            <th>Khách hàng</th>
                            <th>Số tiền</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx) => (
                            <tr key={tx.id}>
                                <td className="recent-tx__time">{tx.time}</td>
                                <td>
                                    <span className={`recent-tx__type recent-tx__type--${tx.type}`}>
                                        <tx.typeIcon size={14} /> {tx.typeLabel}
                                    </span>
                                </td>
                                <td className="recent-tx__customer">{tx.customer}</td>
                                <td className="recent-tx__amount">{tx.amount}</td>
                                <td>
                                    <span className={`recent-tx__status recent-tx__status--${tx.status}`}>
                                        {tx.statusLabel}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
