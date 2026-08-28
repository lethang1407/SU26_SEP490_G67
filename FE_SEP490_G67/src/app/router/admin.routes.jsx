import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import StaffManagementPage from '../../features/staff/pages/StaffManagementPage';
import AddStaffPage from '../../features/staff/pages/AddStaffPage';
import StaffInfoPage from '../../features/staff/pages/StaffInfoPage';
import ProductDetailPage from '../../features/product/pages/ProductDetailPage';
import StoreInfor from '../../features/store/pages/StoreInfor';
import SupplierListPage from '../../features/supplier/pages/SupplierListPage';
import ProductImportPage from '../../features/product/pages/ProductImportPage';
import ProductCreatePage from '../../features/product/pages/ProductCreatePage';
import ProductEditPage from '../../features/product/pages/ProductEditPage';
import ImportHistoryPage from '../../features/importHistory/pages/ImportHistoryPage';
import CategoryListPage from '../../features/category/pages/CategoryListPage';
import SupplierDetailPage from '../../features/supplier/pages/SupplierDetailPage';
import InventoryCheckListPage from '../../features/inventory-check/pages/InventoryCheckListPage';
import InventoryCheckDetailPage from '../../features/inventory-check/pages/InventoryCheckDetailPage';
import CreateInventoryCheckPage from '../../features/inventory-check/pages/CreateInventoryCheckPage';
import StorageLocationListPage from '../../features/storage-location/pages/StorageLocationListPage';
import CreateImportOrderPage from '../../features/import-order/pages/CreateImportOrderPage';
import ImportOrderDetailPage from '../../features/import-order/pages/ImportOrderDetailPage';
import ImportReturnPage from '../../features/import-return/pages/ImportReturnPage';
import ImportOrderListPage from '../../features/import-order/pages/ImportOrderListPage';
import POSScreen from '../../features/pos-screen/pages/POS';
import ExchangeOrder from '../../features/pos-screen/components/ExchangeOrder';
import ExchangeOrderRedirect from '../../features/pos-screen/components/ExchangeOrderRedirect';
import CustomerDebtPage from '../../features/customer/pages/CustomerDebtPage';
import CustomerDetailPage from '../../features/customer/pages/CustomerDetailPage';
import SalesOrderDetailPage from '../../features/sales-order/pages/SalesOrderDetailPage';
import ApiPermissionsPage from '../../features/permission/pages/ApiPermissionsPage';
import ProtectedRoute from './ProtectedRoute';

const adminRoutes = [
    {
        path: '/admin/dashboard',
        element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
    },
    {
        path: '/admin/api-permissions',
        element: <ProtectedRoute><ApiPermissionsPage /></ProtectedRoute>,
    },
    {
        path: '/admin/staff/create',
        element: <ProtectedRoute><AddStaffPage /></ProtectedRoute>,
    },
    {
        path: '/admin/staff/:staffId',
        element: <ProtectedRoute><StaffInfoPage /></ProtectedRoute>,
    },
    {
        path: '/admin/staff',
        element: <ProtectedRoute><StaffManagementPage /></ProtectedRoute>,
    },
    {
        path: '/admin/products/create',
        element: <ProtectedRoute><ProductCreatePage /></ProtectedRoute>,
    },
    {
        path: '/admin/products/categories',
        element: <ProtectedRoute><CategoryListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/products/:productId/edit',
        element: <ProtectedRoute><ProductEditPage /></ProtectedRoute>,
    },
    {
        path: '/admin/products/:productId',
        element: <ProtectedRoute><ProductDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/products',
        element: <ProtectedRoute><ProductImportPage /></ProtectedRoute>,
    },
    {
        path: '/admin',
        element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
    },
    {
        path: '/admin/store',
        element: <ProtectedRoute><StoreInfor /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/locations',
        element: <ProtectedRoute><StorageLocationListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/check',
        element: <ProtectedRoute><CreateInventoryCheckPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/check/create',
        element: <ProtectedRoute><CreateInventoryCheckPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/check/history',
        element: <ProtectedRoute><InventoryCheckListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/check/:checkId',
        element: <ProtectedRoute><InventoryCheckDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import/create',
        element: <ProtectedRoute><CreateImportOrderPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import/:id/edit',
        element: <ProtectedRoute><CreateImportOrderPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/product-import',
        element: <ProtectedRoute><ProductImportPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import-history',
        element: <ProtectedRoute><ImportHistoryPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import',
        element: <ProtectedRoute><ImportOrderListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import/:orderId',
        element: <ProtectedRoute><ImportOrderDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/return',
        element: <ProtectedRoute><ImportReturnPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/supplier',
        element: <ProtectedRoute><SupplierListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/supplier/:id',
        element: <ProtectedRoute><SupplierDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/orders/:orderId',
        element: <ProtectedRoute><SalesOrderDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/customer/:customerId',
        element: <ProtectedRoute><CustomerDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/customer',
        element: <ProtectedRoute><CustomerDebtPage /></ProtectedRoute>,
    },
];

export const posRoutes = [
    {
        path: '/admin/pos',
        element: <ProtectedRoute><POSScreen /></ProtectedRoute>,
    },
    {
        path: '/admin/exchange-order/:orderId',
        element: <ProtectedRoute><ExchangeOrderRedirect /></ProtectedRoute>,
    },
    {
        path: '/admin/exchange-order',
        element: <ProtectedRoute><ExchangeOrder /></ProtectedRoute>,
    },
];

export default adminRoutes;
