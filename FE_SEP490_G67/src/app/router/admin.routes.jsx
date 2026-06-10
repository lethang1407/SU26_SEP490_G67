
import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';

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