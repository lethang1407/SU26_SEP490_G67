import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getOverviewCustomer } from '@/features/customer/api';
import { importHistoryApi } from '@/features/importHistory/api/importHistoryApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';

/** YYYY-MM-DD theo giờ máy — API nhận LocalDate, không phải Instant. */
const toIsoDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatCompactCurrency = (value) => {
    if (value === null || value === undefined) return '0đ';
    return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
};

const baseMetrics = [
    {
        label: 'Doanh thu bán hàng',
        value: '—',
        note: null,
        tone: 'default',
    },
    {
        label: 'Tiền thực thu',
        value: '—',
        note: null,
        tone: 'default',
    },
    {
        label: 'Công nợ phát sinh',
        value: '—',
        note: null,
        tone: 'warning',
    },
    {
        label: 'Giá trị nhập hàng',
        value: '—',
        note: null,
        tone: 'default',
    },
    {
        label: 'Tiền mặt tại quầy',
        value: '3.450.000đ',
        tone: 'default',
        warningBox: {
            title: 'Tiền lẻ 180.000đ',
            subtitle: 'Dưới ngưỡng an toàn 200.000đ',
        },
    },
];

export default function TodayStats() {
    const [debtOverview, setDebtOverview] = useState(null);
    const [importSummary, setImportSummary] = useState(null);
    const [salesSummary, setSalesSummary] = useState(null);
    const [reconciliation, setReconciliation] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const overview = await getOverviewCustomer();
                if (!cancelled) setDebtOverview(overview);
            } catch {
                // Thẻ công nợ chỉ là chỉ số hiển thị: lỗi tải thì giữ giá trị rỗng,
                // không chặn phần còn lại của dashboard.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Cả dải là HÔM NAY. Bỏ trống from/to thì backend mặc định lấy trọn tháng
    // (ImportHistoryService.resolveRange), sai hẳn ý nghĩa của thẻ "Chỉ số hôm nay".
    useEffect(() => {
        let cancelled = false;
        const today = toIsoDate(new Date());
        (async () => {
            try {
                const result = await importHistoryApi.getSummary({ from: today, to: today });
                if (!cancelled) setImportSummary(result ?? null);
            } catch {
                // Chỉ là chỉ số hiển thị: lỗi tải thì giữ dấu "—".
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const today = toIsoDate(new Date());
        (async () => {
            try {
                const result = await dashboardApi.getSalesSummary({ from: today, to: today });
                if (!cancelled) setSalesSummary(result ?? null);
            } catch {
                // Chỉ là chỉ số hiển thị: lỗi tải thì giữ dấu "—".
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const today = toIsoDate(new Date());
        (async () => {
            try {
                const result = await dashboardApi.getReconciliationSummary({ date: today });
                if (!cancelled) setReconciliation(result ?? null);
            } catch {
                // Chỉ là chỉ số hiển thị: lỗi tải thì giữ dấu "—".
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const metrics = baseMetrics.map((metric) => {
        if (metric.label === 'Doanh thu bán hàng') {
            // Đơn nợ tính doanh thu ngay khi bán, không đợi khách trả tiền —
            // totalRevenue cộng lineTotal của mọi đơn chưa huỷ, bất kể hình thức
            // thanh toán. Nên số này KHÁC "Tiền thực thu" ngay bên cạnh, và
            // chênh lệch chính là phần bán nợ.
            if (!salesSummary) return metric;
            return {
                ...metric,
                value: formatCompactCurrency(salesSummary.totalRevenue),
                note: `${salesSummary.totalOrders ?? 0} hóa đơn`,
            };
        }

        if (metric.label === 'Tiền thực thu') {
            if (!reconciliation) return metric;
            const cash = Number(reconciliation.cashSales ?? 0);
            const bank = Number(reconciliation.bankTransferConfirmed ?? 0);
            return {
                ...metric,
                value: formatCompactCurrency(cash + bank),
                note: `Tiền mặt: ${formatCompactCurrency(cash)} · CK: ${formatCompactCurrency(bank)}`,
            };
        }

        if (metric.label === 'Công nợ phát sinh') {
            return {
                ...metric,
                value: formatCompactCurrency(debtOverview?.totalDebtAmountIncurredToday),
                note: debtOverview ? `${debtOverview.totalDebtSalesCount ?? 0} đơn bán nợ` : null,
            };
        }

        if (metric.label === 'Giá trị nhập hàng') {
            if (!importSummary) return metric;
            return {
                ...metric,
                value: formatCompactCurrency(importSummary.totalCost),
                note: `${importSummary.totalOrders ?? 0} phiếu nhập`,
            };
        }

        return metric;
    });

    return (
        <section className="metric-grid" aria-label="Chỉ số hôm nay">
            {metrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                    <div className="metric-card_label">{metric.label}</div>
                    <div className={`metric-card_value metric-card_value--${metric.tone}`}>{metric.value}</div>
                    {metric.note && <div className="metric-card_note">{metric.note}</div>}
                    {metric.warningBox && (
                        <div className="metric-warning-box">
                            <div className="metric-warning-box_title">
                                <AlertTriangle size={12} className="metric-warning-box_icon" />
                                <span>{metric.warningBox.title}</span>
                            </div>
                            <div className="metric-warning-box_subtitle">{metric.warningBox.subtitle}</div>
                        </div>
                    )}
                </article>
            ))}
        </section>
    );
}
