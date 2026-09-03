import { useEffect, useState } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';

/** YYYY-MM-DD theo LocalDate. */
const toIsoDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Khung giờ rỗng để trục hoành không nhảy khi dữ liệu chưa về. */
const EMPTY_HOURS = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}h`,
    revenue: 0,
}));

function formatVND(value) {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(0)}M`;
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}₫`;
    return value;
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const row = payload[0].payload ?? {};
    const orderCount = row.orderCount;
    const refund = Number(row.refundAmount ?? 0);

    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip_label">{label}</p>
            <div className="chart-tooltip_row">
                <span className="chart-tooltip_dot" style={{ background: '#2563eb' }} />
                <p className="chart-tooltip_value">
                    {new Intl.NumberFormat('vi-VN').format(payload[0].value)}₫
                    {orderCount ? ` · ${orderCount} hóa đơn` : ''}
                </p>
            </div>
            {refund > 0 && (
                <div className="chart-tooltip_row">
                    <span className="chart-tooltip_dot" style={{ background: '#94a3b8' }} />
                    <p className="chart-tooltip_value chart-tooltip_value--muted">
                        Đã trừ hoàn trả -{new Intl.NumberFormat('vi-VN').format(refund)}₫
                    </p>
                </div>
            )}
        </div>
    );
};

export default function RevenueTrendChart() {
    const [salesByHour, setSalesByHour] = useState(EMPTY_HOURS);

    useEffect(() => {
        let cancelled = false;
        const today = toIsoDate(new Date());
        (async () => {
            try {
                const rows = await dashboardApi.getHourlyRevenue({ date: today });
                if (cancelled || !rows?.length) return;
                setSalesByHour(
                    rows.map((row) => ({
                        hour: row.label,
                        revenue: Number(row.revenue ?? 0),
                        refundAmount: Number(row.refundAmount ?? 0),
                        orderCount: row.orderCount ?? 0,
                    })),
                );
            } catch {
                // Biểu đồ chỉ là chỉ số hiển thị: lỗi tải thì giữ cột 0, không chặn dashboard.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className="dashboard-card dashboard-card--compact chart-card sales-chart-card">
            <div className="dashboard-card_header">
                <h3 className="dashboard-card_title">Diễn biến bán hàng hôm nay</h3>
            </div>

            <div className="chart-card_body sales-chart-card_body">
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={salesByHour} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="hour"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            dy={6}
                            interval={2}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickFormatter={formatVND}
                            // Trục tự co theo dữ liệu. Giữ mốc 0 làm đáy trong ngày bán
                            // bình thường, chỉ hạ xuống khi có khung giờ âm vì hoàn trả
                            // vượt doanh thu bán trong giờ đó.
                            domain={[(dataMin) => Math.min(0, dataMin), 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eff6ff' }} />
                        <Bar
                            dataKey="revenue"
                            fill="#2563eb"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={18}
                            name="Doanh thu theo giờ"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="chart-legend chart-legend--center">
                <div className="chart-legend_item">
                    <span className="chart-legend_dot" style={{ background: '#2563eb' }} />
                    Doanh thu theo giờ
                </div>
            </div>
        </section>
    );
}