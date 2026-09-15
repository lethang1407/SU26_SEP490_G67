/**
 * Centralized Dynamic Route Permission Registry
 * Modify permissions/roles for any page path in this single file.
 */

export const ROUTE_PERMISSIONS = [
  // Dashboard & System Config
  { path: '/admin/dashboard', permission: null },
  { path: '/admin/api-permissions', role: ['ADMIN', 'MANAGER'] },
  { path: '/admin/store-info', role: ['ADMIN', 'MANAGER'] },

  // Staff Management
  { path: '/admin/staff/add', role: ['ADMIN', 'MANAGER'], permission: 'STAFF:CREATE' },
  { path: '/admin/staff/:id', permission: 'STAFF:VIEW' },
  { path: '/admin/staff', permission: 'STAFF:VIEW' },

  // Products & Categories
  { path: '/admin/warehouse/products/create', permission: 'PRODUCT:CREATE' },
  { path: '/admin/warehouse/products/import-excel', permission: 'PRODUCT:CREATE' },
  { path: '/admin/warehouse/products/edit/:id', permission: 'PRODUCT:UPDATE' },
  { path: '/admin/warehouse/products/:id', permission: 'PRODUCT:VIEW' },
  { path: '/admin/warehouse/products', permission: 'PRODUCT:VIEW' },
  { path: '/admin/warehouse/category', permission: 'PRODUCT:VIEW' },

  // Inventory & Warehouse Operations
  { path: '/admin/warehouse/check/create', permission: ['WAREHOUSE:CHECK_VIEW', 'WAREHOUSE:CHECK_CREATE'] },
  { path: '/admin/warehouse/check/history', permission: 'WAREHOUSE:CHECK_VIEW' },
  { path: '/admin/warehouse/check/:checkId', permission: 'WAREHOUSE:CHECK_VIEW' },
  { path: '/admin/warehouse/check', permission: ['WAREHOUSE:CHECK_VIEW', 'WAREHOUSE:CHECK_CREATE'] },
  { path: '/admin/warehouse/locations', permission: 'WAREHOUSE:VIEW' },
  { path: '/admin/storage-locations', permission: 'WAREHOUSE:VIEW' },
  { path: '/admin/import-history', permission: 'IMPORT:VIEW' },

  // Import Orders
  { path: '/admin/import-orders/create', permission: 'IMPORT:CREATE' },
  { path: '/admin/import-orders/return', permission: 'IMPORT:CREATE' },
  { path: '/admin/import-orders/:id', permission: 'IMPORT:VIEW' },
  { path: '/admin/import-orders', permission: 'IMPORT:VIEW' },

  // Suppliers
  { path: '/admin/warehouse/supplier/:id', permission: 'SUPPLIER:VIEW' },
  { path: '/admin/warehouse/supplier', permission: 'SUPPLIER:VIEW' },

  // POS & Sales Orders
  { path: '/admin/pos', permission: 'POS:SALE' },
  { path: '/admin/exchange-order/:orderId', permission: 'POS:EXCHANGE' },
  { path: '/admin/exchange-order', permission: 'POS:EXCHANGE' },
  { path: '/admin/orders/reconciliation', permission: 'AUDIT:VIEW' },
  { path: '/admin/orders/:orderId', permission: ['SALES_ORDER:VIEW_ALL', 'SALES_ORDER:VIEW_OWN'] },
  { path: '/admin/orders', permission: ['SALES_ORDER:VIEW_ALL', 'SALES_ORDER:VIEW_OWN'] },

  // Customers & Debt
  { path: '/admin/customer/:customerId', permission: 'CUSTOMER:VIEW' },
  { path: '/admin/customer', permission: 'CUSTOMER:VIEW' },

  // Reports
  { path: '/admin/reports/warehouse', permission: 'WAREHOUSE:VIEW' },
];

/**
 * Match current URL pathname against route permission registry patterns
 */
export function getRoutePermissionConfig(pathname) {
  for (const config of ROUTE_PERMISSIONS) {
    const pattern = config.path.replace(/:[^\s/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(pathname)) {
      return config;
    }
  }
  return null;
}
