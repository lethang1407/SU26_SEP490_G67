import { CalendarDays, Plus } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import TodayProblems from '../components/TodayProblems';
import TopProducts from '../components/TopProducts';
import RecentActivity from '../components/RecentActivity';
import TodayStats from '../components/TodayStats';
import RevenueTrendChart from '../components/RevenueTrendChart';
import '../../../css/AdminDashboard.css';

export default function AdminDashboard() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="admin-content admin-dashboard-page">
            <AdminHeader />
            <main className="admin-main dashboard-main-surface">
                <div className="dashboard-container dashboard-container--full dashboard-overview">
                    <div className="db-page-header db-page-header--overview">
                        <div>
                            <h1 className="db-page-header_title">Tổng quan cửa hàng</h1>
                            <p className="db-page-header_subtitle">
                                <CalendarDays size={14} className="db-page-header_icon" />
                                Hôm nay, {dateStr} - Cập nhật lúc {timeStr}
                            </p>
                        </div>
                    </div>

                    <TodayProblems />
                    <TodayStats />

                    <div className="dashboard-work-grid">
                        <div className="dashboard-work-stack">
                            <TopProducts />
                            <RevenueTrendChart />
                        </div>
                        <RecentActivity />
                    </div>
                </div>
            </main>
        </div>
    );
}