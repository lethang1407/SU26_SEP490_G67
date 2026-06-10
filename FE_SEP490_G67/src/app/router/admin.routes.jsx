
import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import ProfilePage from '../../features/profile/pages/ProfilePage';
import EditProfilePage from '../../features/profile/pages/EditProfilePage';

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
        path: '/admin/profile/edit',
        element: <EditProfilePage />,
    },
    {
        path: '/admin',
        element: <AdminDashboard />,
    },
];

export default adminRoutes;