import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import StaffManagementPage from '../../features/staff/pages/StaffManagementPage';
import AddStaffPage from '../../features/staff/pages/AddStaffPage';
import StaffInfoPage from '../../features/staff/pages/StaffInfoPage';
import ProductListPage from '../../features/product/pages/ProductListPage';
import ProductDetailPage from '../../features/product/pages/ProductDetailPage';
import StoreInfor from '../../features/store/pages/StoreInfor';
import SupplierListPage from '../../features/supplier/pages/SupplierListPage';
import ProductImportPage from '../../features/product/pages/ProductImportPage';
import ProductCreatePage from '../../features/product/pages/ProductCreatePage';
import ProductEditPage from '../../features/product/pages/ProductEditPage';
import ImportHistoryPage from '../../features/importHistory/pages/ImportHistoryPage';
import CategoryListPage from '../../features/category/pages/CategoryListPage';
import ImportOrderListPage from '../../features/import-order/pages/ImportOrderListPage';
import POSScreen from '../../features/pos-screen/pages/POS';
import CustomerDebtPage from '../../features/customer/pages/CustomerDebtPage';
import CustomerDetailPage from '../../features/customer/pages/CustomerDetailPage';

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
        path: '/admin/products/:productId',
        element: <ProductDetailPage />,
    },
    {
        path: '/admin/products',
        element: <ProductListPage />,
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
        path: '/admin/warehouse/product-import',
        element: <ProductImportPage />,
    },
    {
        path: '/admin/warehouse/import-history',
        element: <ImportHistoryPage />,
    },
    {
        path: '/admin/warehouse/import',
        element: <ImportOrderListPage />,
    },
    {
        path: '/admin/pos',
        element: <POSScreen />,
    },
    {
        path: '/admin/customer/:customerId',
        element: <CustomerDetailPage />,
    },
    {
        path: '/admin/customer',
        element: <CustomerDebtPage />,
    },
];

export default adminRoutes;
