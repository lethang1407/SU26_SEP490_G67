import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { MoreVertical } from 'lucide-react';

const data = [
    { day: 'T2', revenue: 2800000 },
    { day: 'T3', revenue: 3200000 },
    { day: 'T4', revenue: 3800000 },
    { day: 'T5', revenue: 3100000 },
    { day: 'T6', revenue: 4200000 },
    { day: 'T7', revenue: 4800000 },
    { day: 'CN', revenue: 5240000 },
];

function formatVND(value) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}tr`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="chart-tooltip__label">{label}</p>
                <p className="chart-tooltip__value">
                    {new Intl.NumberFormat('vi-VN').format(payload[0].value)}đ
                </p>
            </div>
        );
    }
    return null;
};

export default function RevenueTrendChart() {
    return (
        <div className="dashboard-card chart-card">
            <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">
                    Xu hướng doanh thu (7 ngày qua)
                </h3>
                <button className="dashboard-card__menu" aria-label="More options">
                    <MoreVertical size={18} />
                </button>
            </div>
            <div className="chart-card__body">
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 13 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 12 }}
                            tickFormatter={formatVND}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            fill="url(#revenueGradient)"
                            dot={false}
                            activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
