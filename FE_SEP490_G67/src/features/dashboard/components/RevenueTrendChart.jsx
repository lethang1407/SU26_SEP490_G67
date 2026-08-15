import { useEffect, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';

/** YYYY-MM-DD theo giờ máy — API nhận LocalDate, không phải Instant. */
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
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const orderCount = payload[0].payload?.orderCount;

    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip_label">{label}</p>
            <div className="chart-tooltip_row">
                <span className="chart-tooltip_dot" style={{ background: '#2563eb' }} />
                <p className="chart-tooltip_value">
                    {new Intl.NumberFormat('vi-VN').format(payload[0].value)}đ
                    {orderCount ? ` · ${orderCount} hóa đơn` : ''}
                </p>
            </div>
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
                        orderCount: row.orderCount ?? 0,
                    })),
                );
            } catch {
                // Biểu đồ chỉ là chỉ số hiển thị: lỗi tải thì giữ đường 0, không chặn dashboard.
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
                    <LineChart data={salesByHour} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="hour"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            dy={6}
                            // 24 khung giờ mà nhãn nào cũng vẽ thì chồng chữ, chỉ ghi 3 giờ một lần.
                            interval={2}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickFormatter={formatVND}
                            // Trục tự co theo dữ liệu. Trần cứng 500k sẽ cắt mất đỉnh
                            // của những giờ bán chạy, biểu đồ trông như đang đi ngang.
                            domain={[0, 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#bfdbfe' }} />
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={false}
                            name="Doanh thu theo giờ"
                        />
                    </LineChart>
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