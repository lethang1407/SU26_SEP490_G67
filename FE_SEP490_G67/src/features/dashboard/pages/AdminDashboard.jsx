import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import AlertBanner from '../components/AlertBanner';
import StatCards from '../components/StatCards';
import RevenueTrendChart from '../components/RevenueTrendChart';
import TodayProblems from '../components/TodayProblems';
import TopProducts from '../components/TopProducts';
import RecentActivity from '../components/RecentActivity';
import '../../../css/AdminDashboard.css';

export default function AdminDashboard() {
    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container">
                        {/* Section 1 — Alert Banner */}
                        <AlertBanner />

                        {/* Section 2 — KPI Cards */}
                        <StatCards />

                        {/* Section 3 — Revenue Chart + Today's Problems */}
                        <div className="dashboard-row dashboard-row--section3">
                            <RevenueTrendChart />
                            <TodayProblems />
                        </div>

                        {/* Section 4 — Top Products + Recent Transactions */}
                        <div className="dashboard-row dashboard-row--section4">
                            <TopProducts />
                            <RecentActivity />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
