import { Outlet } from 'react-router-dom';
import SideBar from '../ui/sidebar/SideBar';
import { SidebarCollapseProvider, useSidebarCollapse } from '../../app/providers/SidebarCollapseProvider';
import '../../css/AdminDashboard.css';

function AdminLayoutShell() {
    const { collapsed } = useSidebarCollapse();

    return (
        <div className={`admin-layout${collapsed ? ' admin-layout--sidebar-collapsed' : ''}`}>
            <SideBar />
            <Outlet />
        </div>
    );
}

export default function AdminLayout() {
    return (
        <SidebarCollapseProvider>
            <AdminLayoutShell />
        </SidebarCollapseProvider>
    );
}
