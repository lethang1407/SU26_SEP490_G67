import { Calendar } from 'lucide-react';
import SideBar from '../../../components/ui/header-footer/SideBar';
import AdminHeader from '../components/AdminHeader';
import StatCards from '../components/StatCards';
import RevenueTrendChart from '../components/RevenueTrendChart';
import TopProducts from '../components/TopProducts';
import RecentActivity from '../components/RecentActivity';
import '../../../css/AdminDashboard.css';

export default function AdminDashboard() {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('vi-VN', {
        weekday: undefined,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container">
                        {/* Page Header */}
                        <div className="dashboard-header">
                            <div className="dashboard-header__left">
                                <h1>Tổng quan Hệ thống</h1>
                                <p>Hôm nay, {formattedDate}</p>
                            </div>
                            <button className="dashboard-header__today-btn">
                                <Calendar size={16} />
                                Hôm nay
                            </button>
                        </div>

                        {/* Stat Cards Row */}
                        <StatCards />

                        {/* Chart + Top Products Row */}
                        <div className="dashboard-row dashboard-row--charts">
                            <RevenueTrendChart />
                            <TopProducts />
                        </div>

                        {/* Recent Activity */}
                        <RecentActivity />
                    </div>
                </main>
            </div>
        </div>
    );
}
