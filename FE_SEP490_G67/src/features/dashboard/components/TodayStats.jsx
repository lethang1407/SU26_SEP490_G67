import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getOverviewCustomer } from '@/features/customer/api';
import { importHistoryApi } from '@/features/importHistory/api/importHistoryApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';

/** YYYY-MM-DD theo giờ máy - API nhận LocalDate, không phải Instant. */
const toIsoDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatCompactCurrency = (value) => {
    if (value === null || value === undefined) return '0đ';
    return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
};

/**
 * Chú thích hoàn trả cho thẻ doanh thu.
 */
const buildRefundBadge = (salesSummary) => {
    const hasNetRevenue = salesSummary.netRevenue !== null && salesSummary.netRevenue !== undefined;
    const refund = Number(salesSummary.refundAmount ?? 0);
    const returnCount = Number(salesSummary.returnOrderCount ?? 0);

    if (returnCount <= 0) return null;

    if (!hasNetRevenue) {
        return { text: 'Chưa bao gồm hoàn trả', tone: 'muted' };
    }

    return {
        text: `Đã bao gồm hoàn trả - ${formatCompactCurrency(refund)} · ${returnCount} phiếu`,
        tone: 'refund',
    };
};

/**
 * Chú thích cho thẻ tiền thu công nợ: bao nhiêu khách đã trả và các khoản nợ được
 * trả đủ hay mới trả một phần. Đếm khoản theo hóa đơn nợ, không theo phiếu thu.
 */
const buildDebtCollectionNote = (overview) => {
    const customers = Number(overview.todayPayingCustomerCount ?? 0);
    const full = Number(overview.todayFullSettlementCount ?? 0);
    const partial = Number(overview.todayPartialPaymentCount ?? 0);

    if (customers <= 0) return 'Chưa có khách trả nợ';

    const parts = [`${customers} khách đã thanh toán`];
    // if (full > 0) parts.push(`${full} khoản trả đủ`);
    // if (partial > 0) parts.push(`${partial} khoản trả 1 phần`);
    return parts.join(' N/A ');
};

const baseMetrics = [
    {
        label: 'Doanh thu bán hàng',
        value: 'N/A',
        note: null,
        tone: 'default',
    },
    {
        label: 'Tiền thực thu',
        value: 'N/A',
        note: null,
        tone: 'default',
    },
    {
        label: 'Công nợ mới hôm nay',
        value: 'N/A',
        note: null,
        tone: 'warning',
    },

    {
        label: "Tiền thu từ công nợ cũ",
        value: 'N/A',
        note: null,
        tone: 'default',
    },
    {
        label: 'Giá trị nhập hàng hôm nay',
        value: 'N/A',
        note: null,
        tone: 'default',
    }
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
                const result = await importHistoryApi.getSummary({ from: today, to: today });
                if (!cancelled) setImportSummary(result ?? null);
            } catch {
                // Chỉ là chỉ số hiển thị: lỗi tải thì giữ dấu "-".
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
                // chỉ số hiển thị: lỗi tải thì hiển thị n/a.
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
                // chỉ số hiển thị: lỗi tải thì hiển thị n/a.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const metrics = baseMetrics.map((metric) => {
        if (metric.label === 'Doanh thu bán hàng') {
            if (!salesSummary) return metric;
            const revenue = salesSummary.netRevenue ?? salesSummary.totalRevenue;
            return {
                ...metric,
                value: formatCompactCurrency(revenue),
                note: `${salesSummary.totalOrders ?? 0} hóa đơn`,
                badge: buildRefundBadge(salesSummary),
            };
        }

        if (metric.label === 'Tiền thực thu') {
            if (!reconciliation) return metric;
            const cash = Number(reconciliation.cashSales ?? 0);
            const bank = Number(reconciliation.bankSales ?? 0);
            // Hai khoản phải trừ khỏi tiền thu: tiền mặt hoàn cho khách (đã ra khỏi két),
            // và phần hàng trả cấn sang đơn đổi (đơn đổi ghi vào paidAmount nên đang nằm
            // trong cash/bank ở trên, dù chưa bao giờ là tiền vào).
            const cashRefunded = Number(reconciliation.cashRefunded ?? 0);
            const exchangeCredit = Number(reconciliation.exchangeCreditApplied ?? 0);
            const deductions = [];
            if (cashRefunded > 0) deductions.push(`hoàn khách -${formatCompactCurrency(cashRefunded)}`);
            if (exchangeCredit > 0) deductions.push(`cấn hàng đổi -${formatCompactCurrency(exchangeCredit)}`);
            return {
                ...metric,
                value: formatCompactCurrency(cash + bank - cashRefunded - exchangeCredit),
                note: `Tiền mặt: ${formatCompactCurrency(cash)} - Chuyển khoản: ${formatCompactCurrency(bank)}`,
                badge: deductions.length
                    ? { text: `Đã trừ ${deductions.join(' - ')}`, tone: 'refund' }
                    : null,
            };
        }

        if (metric.label === 'Công nợ mới hôm nay') {
            return {
                ...metric,
                value: formatCompactCurrency(debtOverview?.totalDebtAmountIncurredToday),
                note: debtOverview ? `${debtOverview.totalDebtSalesCount ?? 0} đơn hàng ghi nợ` : null,
            };
        }

        if (metric.label === 'Giá trị nhập hàng hôm nay') {
            if (!importSummary) return metric;
            return {
                ...metric,
                value: formatCompactCurrency(importSummary.totalCost),
                note: `${importSummary.totalOrders ?? 0} phiếu nhập`,
            };
        }

        if (metric.label === 'Tiền thu từ công nợ cũ') {
            if (!debtOverview) return metric;
            return {
                ...metric,
                value: formatCompactCurrency(debtOverview.todayCollectedAmount),
                note: buildDebtCollectionNote(debtOverview),
            };
        }

        return metric;
    });

    return (
        <>
            <h2 className="attention-section_title">Tình hình hôm nay</h2>
            <section className="metric-grid" aria-label="Chỉ số hôm nay">

                {metrics.map((metric) => (
                    <article key={metric.label} className="metric-card">
                        <div className="metric-card_label">{metric.label}</div>
                        <div className={`metric-card_value metric-card_value--${metric.tone}`}>{metric.value}</div>
                        {metric.badge && (
                            <div className={`metric-card_badge metric-card_badge--${metric.badge.tone}`}>
                                {metric.badge.text}
                            </div>
                        )}
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
        </>
    );
}
