
import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import ProfilePage from '../../features/profile/pages/ProfilePage';
import EditProfilePage from '../../features/profile/pages/EditProfilePage';
import StaffManagementPage from '../../features/staff/pages/StaffManagementPage';
import StoreInfor from '../../features/store/pages/StoreInfor';

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
        path: '/admin/profile/edit',
        element: <EditProfilePage />,
    },
    {
        path: '/admin',
        element: <AdminDashboard />,
    },
    {
        path: '/admin/store',
        element: <StoreInfor />,
    }
];

export default adminRoutes;
