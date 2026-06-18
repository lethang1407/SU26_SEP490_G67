import { useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';

const data7days = [
    { day: 'T2', revenue: 1800000, import: 600000 },
    { day: 'T3', revenue: 2100000, import: 450000 },
    { day: 'T4', revenue: 2800000, import: 1200000 },
    { day: 'T5', revenue: 2400000, import: 300000 },
    { day: 'T6', revenue: 3200000, import: 850000 },
    { day: 'T7', revenue: 3800000, import: 700000 },
    { day: 'CN', revenue: 2350000, import: 0 },
];

const data30days = [
    { day: '1', revenue: 1500000, import: 500000 },
    { day: '5', revenue: 2200000, import: 800000 },
    { day: '10', revenue: 2800000, import: 600000 },
    { day: '15', revenue: 3100000, import: 1100000 },
    { day: '20', revenue: 2600000, import: 400000 },
    { day: '25', revenue: 3500000, import: 900000 },
    { day: '30', revenue: 2900000, import: 700000 },
];

const dataMonth = [
    { day: 'Tuần 1', revenue: 12000000, import: 4500000 },
    { day: 'Tuần 2', revenue: 15000000, import: 5200000 },
    { day: 'Tuần 3', revenue: 13500000, import: 3800000 },
    { day: 'Tuần 4', revenue: 16200000, import: 6100000 },
];

const datasets = {
    '7days': data7days,
    '30days': data30days,
    'month': dataMonth,
};

const periods = [
    { key: '7days', label: '7 ngày' },
    { key: '30days', label: '30 ngày' },
    { key: 'month', label: 'Tháng này' },
];

function formatVND(value) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)} tr`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="chart-tooltip__label">{label}</p>
                {payload.map((entry, i) => (
                    <div key={i} className="chart-tooltip__row">
                        <span
                            className="chart-tooltip__dot"
                            style={{ background: entry.color }}
                        />
                        <p className={`chart-tooltip__value ${entry.dataKey === 'revenue' ? 'chart-tooltip__value--blue' : 'chart-tooltip__value--orange'}`}>
                            {new Intl.NumberFormat('vi-VN').format(entry.value)}đ
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function RevenueTrendChart() {
    const [period, setPeriod] = useState('7days');
    const chartData = datasets[period];

    return (
        <div className="dashboard-card chart-card">
            <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">
                    Xu Hướng Doanh Thu 7 Ngày Gần Nhất
                </h3>
                <div className="chart-card__controls">
                    <div className="chart-period-toggle">
                        {periods.map((p) => (
                            <button
                                key={p.key}
                                className={`chart-period-btn ${period === p.key ? 'chart-period-btn--active' : ''}`}
                                onClick={() => setPeriod(p.key)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="chart-legend">
                <div className="chart-legend__item">
                    <span className="chart-legend__dot" style={{ background: '#3B82F6' }} />
                    Doanh thu
                </div>
                <div className="chart-legend__item">
                    <span className="chart-legend__dot" style={{ background: '#F59E0B' }} />
                    Tiền nhập hàng
                </div>
            </div>

            <div className="chart-card__body">
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 13 }}
                            dy={8}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={formatVND}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Doanh thu"
                            stroke="#3B82F6"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="import"
                            name="Tiền nhập hàng"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            dot={false}
                            activeDot={{ r: 4, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
