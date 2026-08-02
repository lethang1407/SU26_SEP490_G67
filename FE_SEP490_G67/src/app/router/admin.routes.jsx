import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import StaffManagementPage from '../../features/staff/pages/StaffManagementPage';
import AddStaffPage from '../../features/staff/pages/AddStaffPage';
import StaffInfoPage from '../../features/staff/pages/StaffInfoPage';
import StoreInfor from '../../features/store/pages/StoreInfor';
import SupplierListPage from '../../features/supplier/pages/SupplierListPage';
import SupplierDetailPage from '../../features/supplier/pages/SupplierDetailPage';
import ProductImportPage from '../../features/product/pages/ProductImportPage';
import ProductCreatePage from '../../features/product/pages/ProductCreatePage';
import ProductEditPage from '../../features/product/pages/ProductEditPage';
import ImportHistoryPage from '../../features/importHistory/pages/ImportHistoryPage';
import CategoryListPage from '../../features/category/pages/CategoryListPage';

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
    {
        path: '/admin/warehouse/import',
        element: <ImportHistoryPage />,
    },
    {
        path: '/admin/products/create',
        element: <ProductCreatePage />,
    },
    {
        path: '/admin/products/categories',
        element: <CategoryListPage />,
    },
    {
        path: '/admin/products/:productId/edit',
        element: <ProductEditPage />,
    },
    {
        path: '/admin/products',
        element: <ProductImportPage />,
    },
];

export default adminRoutes;
