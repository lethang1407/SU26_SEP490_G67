import {
    AlertTriangle,
    Package,
    CreditCard,
    Clock,
    ShoppingBag,
} from 'lucide-react';

const problems = [
    {
        id: 1,
        severity: 'critical',
        icon: AlertTriangle,
        name: 'Sữa chua Vinamilk',
        desc: 'Hết hạn 2 ngày trước',
        cta: 'Điều chỉnh tồn kho',
    },
    {
        id: 2,
        severity: 'critical',
        icon: CreditCard,
        name: 'Nguyễn Thị Lan',
        desc: 'Nợ 450.000đ quá hạn 5 ngày',
        cta: 'Xem nợ',
    },
    {
        id: 3,
        severity: 'warning',
        icon: Package,
        name: 'Mì Hảo Hảo',
        desc: 'Còn 3 gói, dưới ngưỡng tối thiểu',
        cta: 'Nhập hàng',
    },
    {
        id: 4,
        severity: 'warning',
        icon: Clock,
        name: 'Bánh mì sandwich',
        desc: 'Hết hạn trong 1 ngày',
        cta: 'Xem chi tiết',
    },
    {
        id: 5,
        severity: 'caution',
        icon: ShoppingBag,
        name: 'Nước ngọt Pepsi',
        desc: 'Còn 8 lon, sắp hết',
        cta: 'Nhập hàng',
    },
];

export default function TodayProblems() {
    return (
        <div className="dashboard-card">
            <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">Cần Xử Lý Hôm Nay</h3>
                <button className="dashboard-card__link">
                    Xem tất cả →
                </button>
            </div>
            <div className="today-problems__list">
                {problems.map((problem) => {
                    const Icon = problem.icon;
                    return (
                        <div key={problem.id} className="today-problem-row">
                            <div className={`today-problem__icon today-problem__icon--${problem.severity}`}>
                                <Icon size={16} />
                            </div>
                            <div className="today-problem__info">
                                <span className="today-problem__name">{problem.name}</span>
                                <span className={`today-problem__desc today-problem__desc--${problem.severity}`}>
                                    {problem.desc}
                                </span>
                            </div>
                            <button className="today-problem__btn">
                                {problem.cta}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
