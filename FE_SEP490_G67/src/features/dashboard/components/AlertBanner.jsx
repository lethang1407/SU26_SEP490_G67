import { useState } from 'react';
import { X, AlertTriangle, Package, CreditCard, Clock } from 'lucide-react';

const alerts = [
    {
        id: 'expired',
        icon: <AlertTriangle size={14} />,
        label: '3 sản phẩm ĐÃ HẾT HẠN',
        variant: 'critical',
        link: '/admin/warehouse/inventory?filter=expired',
    },
    {
        id: 'low-stock',
        icon: <Package size={14} />,
        label: '5 sản phẩm SẮP HẾT HÀNG',
        variant: 'warning',
        link: '/admin/warehouse/inventory?filter=low-stock',
    },
    {
        id: 'expiring-soon',
        icon: <Clock size={14} />,
        label: '7 sản phẩm SẮP HẾT HẠN',
        variant: 'caution',
        link: '/admin/warehouse/inventory?filter=expiring-soon',
    },
];

export default function AlertBanner() {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="alert-banner" role="alert">
            <div className="alert-banner__pills">
                {alerts.map((alert) => (
                    <button
                        key={alert.id}
                        className={`alert-pill alert-pill--${alert.variant}`}
                        onClick={() => {
                            // In production: navigate(alert.link)
                            console.log('Navigate to:', alert.link);
                        }}
                        title={`Xem chi tiết: ${alert.label}`}
                    >
                        {alert.icon}
                        {alert.label}
                    </button>
                ))}
            </div>
            <button
                className="alert-banner__dismiss"
                onClick={() => setDismissed(true)}
                aria-label="Đóng thông báo"
            >
                <X size={16} />
            </button>
        </div>
    );
}
