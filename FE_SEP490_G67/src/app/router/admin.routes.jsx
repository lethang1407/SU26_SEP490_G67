
import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import ProfilePage from '../../features/profile/pages/ProfilePage';
import StaffManagementPage from '../../features/staff/pages/StaffManagementPage';
const adminRoutes = [
    {
        path: '/admin/dashboard',
        element: <AdminDashboard />,
    },
    {
        path: '/admin/staff',
        element: <StaffManagementPage />,
    },
    {
        path: '/admin/profile',
        element: <ProfilePage />,
    },
    {
        path: '/admin',
        element: <AdminDashboard />,
    },
];

export default adminRoutes;