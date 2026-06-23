
import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import StaffManagementPage from '../../features/staff/pages/StaffManagementPage';
import AddStaffPage from '../../features/staff/pages/AddStaffPage';
import StaffInfoPage from '../../features/staff/pages/StaffInfoPage';
import StoreInfor from '../../features/store/pages/StoreInfor';
import SupplierListPage from '../../features/supplier/pages/SupplierListPage';
import SupplierDetailPage from '../../features/supplier/pages/SupplierDetailPage';

const adminRoutes = [
    {
        path: '/admin/dashboard',
        element: <AdminDashboard />,
    },
    {
        path: '/admin/staff/create',
        element: <AddStaffPage />,
    },
    {
        path: '/admin/staff/:staffId',
        element: <StaffInfoPage />,
    },
    {
        path: '/admin/staff',
        element: <StaffManagementPage />,
    },
    {
        path: '/admin',
        element: <AdminDashboard />,
    },
    {
        path: '/admin/store',
        element: <StoreInfor />,
    },
    {
        path: '/admin/warehouse/supplier',
        element: <SupplierListPage />,
    },
    {
        path: '/admin/warehouse/supplier/:id',
        element: <SupplierDetailPage />,
    },
];

export default adminRoutes;

