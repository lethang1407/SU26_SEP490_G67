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
import SalesOrderListPage from '../../features/sales-order/pages/SalesOrderListPage';
import SalesOrderDetailPage from '../../features/sales-order/pages/SalesOrderDetailPage';
import OrderReconciliationPage from '../../features/sales-order/pages/OrderReconciliationPage';
import ProtectedRoute from './ProtectedRoute';

const adminRoutes = [
    {
        path: '/admin/dashboard',
        element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
    },
    {
        path: '/admin/staff/create',
        element: <ProtectedRoute requiredPermission="STAFF:CREATE"><AddStaffPage /></ProtectedRoute>,
    },
    {
        path: '/admin/staff/:staffId',
        element: <ProtectedRoute requiredPermission="STAFF:VIEW"><StaffInfoPage /></ProtectedRoute>,
    },
    {
        path: '/admin/staff',
        element: <ProtectedRoute requiredPermission="STAFF:VIEW"><StaffManagementPage /></ProtectedRoute>,
    },
    {
        path: '/admin/products/create',
        element: <ProtectedRoute requiredPermission="PRODUCT:CREATE"><ProductCreatePage /></ProtectedRoute>,
    },
    {
        path: '/admin/products/categories',
        element: <ProtectedRoute requiredPermission="PRODUCT:VIEW"><CategoryListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/products/:productId/edit',
        element: <ProtectedRoute requiredPermission="PRODUCT:UPDATE"><ProductEditPage /></ProtectedRoute>,
    },
    {
        path: '/admin/products/:productId',
        element: <ProtectedRoute requiredPermission="PRODUCT:VIEW"><ProductDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/products',
        element: <ProtectedRoute requiredPermission="PRODUCT:VIEW"><ProductImportPage /></ProtectedRoute>,
    },
    {
        path: '/admin',
        element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
    },
    {
        path: '/admin/store',
        element: <ProtectedRoute requiredPermission="STORE:VIEW"><StoreInfor /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/locations',
        element: <ProtectedRoute requiredPermission="WAREHOUSE:VIEW"><StorageLocationListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/check',
        element: <ProtectedRoute requiredPermission="WAREHOUSE:CHECK_VIEW"><InventoryCheckListPage /></ProtectedRoute>,
        element: <CreateInventoryCheckPage />,
    },
    {
        path: '/admin/warehouse/check/history',
        element: <InventoryCheckListPage />,
    },
    {
        path: '/admin/warehouse/check/create',
        element: <ProtectedRoute requiredPermission="WAREHOUSE:CHECK_CREATE"><CreateInventoryCheckPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/check/:checkId',
        element: <ProtectedRoute requiredPermission="WAREHOUSE:CHECK_VIEW"><InventoryCheckDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import/create',
        element: <ProtectedRoute requiredPermission="IMPORT:CREATE"><CreateImportOrderPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import/:id/edit',
        element: <ProtectedRoute requiredPermission="IMPORT:UPDATE"><CreateImportOrderPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/product-import',
        element: <ProtectedRoute requiredPermission="IMPORT:CREATE"><ProductImportPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import-history',
        element: <ProtectedRoute requiredPermission="IMPORT:VIEW"><ImportHistoryPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import',
        element: <ProtectedRoute requiredPermission="IMPORT:VIEW"><ImportOrderListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/import/:orderId',
        element: <ProtectedRoute requiredPermission="IMPORT:VIEW"><ImportOrderDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/return',
        element: <ProtectedRoute requiredPermission="IMPORT:VIEW"><ImportReturnPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/supplier',
        element: <ProtectedRoute requiredPermission="SUPPLIER:VIEW"><SupplierListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/warehouse/supplier/:id',
        element: <ProtectedRoute requiredPermission="SUPPLIER:VIEW"><SupplierDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/pos',
        element: <ProtectedRoute requiredPermission="POS:SALE"><POSScreen /></ProtectedRoute>,
    },
    {
        path: '/admin/orders/:orderId',
        element: <ProtectedRoute requiredPermission={["SALES_ORDER:VIEW_ALL", "SALES_ORDER:VIEW_OWN"]}><SalesOrderDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/orders',
        element: <ProtectedRoute requiredPermission={["SALES_ORDER:VIEW_ALL", "SALES_ORDER:VIEW_OWN"]}><SalesOrderListPage /></ProtectedRoute>,
    },
    {
        path: '/admin/orders/reconciliation',
        element: <ProtectedRoute requiredPermission="AUDIT:VIEW"><OrderReconciliationPage /></ProtectedRoute>,
    },
    {
        path: '/admin/exchange-order/:orderId',
        element: <ProtectedRoute requiredPermission="POS:EXCHANGE"><ExchangeOrder /></ProtectedRoute>,
    },
    {
        path: '/admin/exchange-order',
        element: <ExchangeOrder />,
    },
    {
        path: '/admin/exchange-order/:orderId',
        element: <ExchangeOrderRedirect />,
    },
    {
        path: '/admin/customer/:customerId',
        element: <ProtectedRoute requiredPermission="CUSTOMER:VIEW"><CustomerDetailPage /></ProtectedRoute>,
    },
    {
        path: '/admin/customer',
        element: <ProtectedRoute requiredPermission="CUSTOMER:VIEW"><CustomerDebtPage /></ProtectedRoute>,
    },
];

export default adminRoutes;
