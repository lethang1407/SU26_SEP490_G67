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
import CustomerDebtPage from '../../features/customer/pages/CustomerDebtPage';
import CustomerDetailPage from '../../features/customer/pages/CustomerDetailPage';
import SalesOrderListPage from '../../features/sales-order/pages/SalesOrderListPage';
import SalesOrderDetailPage from '../../features/sales-order/pages/SalesOrderDetailPage';

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
        path: '/admin/warehouse/locations',
        element: <StorageLocationListPage />,
    },
    {
        path: '/admin/warehouse/check',
        element: <InventoryCheckListPage />,
    },
    {
        path: '/admin/warehouse/check/create',
        element: <CreateInventoryCheckPage />,
    },
    {
        path: '/admin/warehouse/check/:checkId',
        element: <InventoryCheckDetailPage />,
    },
    {
        path: '/admin/warehouse/import/create',
        element: <CreateImportOrderPage />,
    },
    {
        path: '/admin/warehouse/import/:id/edit',
        element: <CreateImportOrderPage />,
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
        path: '/admin/warehouse/import/:orderId',
        element: <ImportOrderDetailPage />,
    },
    {
        path: '/admin/warehouse/return',
        element: <ImportReturnPage />,
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
        path: '/admin/pos',
        element: <POSScreen />,
    },
    {
        path: '/admin/orders/:orderId',
        element: <SalesOrderDetailPage />,
    },
    {
        path: '/admin/orders',
        element: <SalesOrderListPage />,
    },
    {
        path: '/admin/exchange-order/:orderId',
        element: <ExchangeOrder />,
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
