
import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import ProfilePage from '../../features/profile/pages/ProfilePage';

const adminRoutes = [
    {
        path: '/admin/dashboard',
        element: <AdminDashboard />,
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