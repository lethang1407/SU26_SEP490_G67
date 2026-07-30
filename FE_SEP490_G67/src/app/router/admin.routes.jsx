
import AdminDashboard from '../../features/dashboard/pages/AdminDashboard';
import StaffManagementPage from '../../features/staff/pages/StaffManagementPage';
import AddStaffPage from '../../features/staff/pages/AddStaffPage';
import StaffInfoPage from '../../features/staff/pages/StaffInfoPage';
import ProductListPage from '../../features/product/pages/ProductListPage';
import AddProductPage from '../../features/product/pages/AddProductPage';
import EditProductPage from '../../features/product/pages/EditProductPage';
import ProductDetailPage from '../../features/product/pages/ProductDetailPage';
import StoreInfor from '../../features/store/pages/StoreInfor';
import SupplierListPage from '../../features/supplier/pages/SupplierListPage';
import SupplierDetailPage from '../../features/supplier/pages/SupplierDetailPage';
import InventoryCheckListPage from '../../features/inventory-check/pages/InventoryCheckListPage';
import InventoryCheckDetailPage from '../../features/inventory-check/pages/InventoryCheckDetailPage';
import CreateInventoryCheckPage from '../../features/inventory-check/pages/CreateInventoryCheckPage';
import StorageLocationListPage from '../../features/storage-location/pages/StorageLocationListPage';
import ImportOrderListPage from '../../features/import-order/pages/ImportOrderListPage';
import CreateImportOrderPage from '../../features/import-order/pages/CreateImportOrderPage';
import ImportOrderDetailPage from '../../features/import-order/pages/ImportOrderDetailPage';
import ImportReturnPage from '../../features/import-return/pages/ImportReturnPage';
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
        path: '/admin/products',
        element: <ProductListPage />,
    },
    {
        path: '/admin/products/create',
        element: <AddProductPage />,
    },
    {
        path: '/admin/products/:productId/edit',
        element: <EditProductPage />,
    },
    {
        path: '/admin/products/:productId',
        element: <ProductDetailPage />,
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
        path: '/admin/warehouse/import',
        element: <ImportOrderListPage />,
    },
    {
        path: '/admin/warehouse/import/create',
        element: <CreateImportOrderPage />,
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
        path: '/admin/customer/:customerId',
        element: <CustomerDetailPage />,
    },
    {
        path: '/admin/customer',
        element: <CustomerDebtPage />,
    }
];

export default adminRoutes;

