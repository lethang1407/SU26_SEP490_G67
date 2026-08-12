import { Outlet } from 'react-router-dom';
import SideBar from '../ui/sidebar/SideBar';
import '../../css/AdminDashboard.css';

export default function AdminLayout() {
    return (
        <div className="admin-layout">
            <SideBar />
            <Outlet />
        </div>
    );
}
