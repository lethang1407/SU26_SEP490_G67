/**
 * Centralized Dynamic Route Permission Registry
 * Maps every frontend application route to required permissions and roles.
 */

export const ROUTE_PERMISSIONS = [
  // Dashboard & System Config (Chỉ Quản lý)
  { path: '/admin/dashboard', role: ['MANAGER'] },
  { path: '/admin', role: ['MANAGER'] },
  { path: '/admin/api-permissions', role: ['MANAGER'] },
  { path: '/admin/store', role: ['MANAGER'] },
  { path: '/admin/store-info', role: ['MANAGER'] },

  // Staff Management (Chỉ Quản lý)
  { path: '/admin/staff/create', role: ['MANAGER'] },
  { path: '/admin/staff/add', role: ['MANAGER'] },
  { path: '/admin/staff/:staffId', role: ['MANAGER'] },
  { path: '/admin/staff', role: ['MANAGER'] },

  // Products & Categories
  { path: '/admin/products/create', permission: 'PRODUCT:CREATE' },
  { path: '/admin/products/:productId/edit', permission: 'PRODUCT:UPDATE' },
  { path: '/admin/products/:productId', permission: 'PRODUCT:VIEW' },
  { path: '/admin/products', permission: 'PRODUCT:VIEW' },
  { path: '/admin/warehouse/product-import', permission: 'PRODUCT:VIEW' },
  { path: '/admin/warehouse/products/create', permission: 'PRODUCT:CREATE' },
  { path: '/admin/warehouse/products/edit/:id', permission: 'PRODUCT:UPDATE' },
  { path: '/admin/warehouse/products/:id', permission: 'PRODUCT:VIEW' },
  { path: '/admin/warehouse/products', permission: 'PRODUCT:VIEW' },
  { path: '/admin/warehouse/category', permission: 'PRODUCT:VIEW' },

  // Inventory & Warehouse Operations
  { path: '/admin/warehouse/locations', permission: 'WAREHOUSE:VIEW' },
  { path: '/admin/storage-locations', permission: 'WAREHOUSE:VIEW' },
  { path: '/admin/warehouse/check/create', permission: ['WAREHOUSE:CHECK_CREATE', 'WAREHOUSE:CHECK_VIEW'] },
  { path: '/admin/warehouse/check/history', permission: 'WAREHOUSE:CHECK_VIEW' },
  { path: '/admin/warehouse/check/:checkId', permission: 'WAREHOUSE:CHECK_VIEW' },
  { path: '/admin/warehouse/check', permission: ['WAREHOUSE:CHECK_VIEW', 'WAREHOUSE:CHECK_CREATE'] },

  // Import Orders & Returns
  { path: '/admin/warehouse/import/create', permission: 'IMPORT:CREATE' },
  { path: '/admin/warehouse/import/:id/edit', permission: 'IMPORT:UPDATE' },
  { path: '/admin/warehouse/import-history', permission: 'IMPORT:VIEW' },
  { path: '/admin/import-history', permission: 'IMPORT:VIEW' },
  { path: '/admin/warehouse/import/:orderId', permission: 'IMPORT:VIEW' },
  { path: '/admin/warehouse/import', permission: 'IMPORT:VIEW' },
  { path: '/admin/warehouse/return', permission: ['IMPORT:CREATE', 'IMPORT:VIEW'] },
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
  { path: '/admin/orders/reconciliation', role: ['MANAGER'] },
  { path: '/admin/orders/:orderId', permission: ['SALES_ORDER:VIEW_ALL', 'SALES_ORDER:VIEW_OWN'] },
  { path: '/admin/orders', permission: ['SALES_ORDER:VIEW_ALL', 'SALES_ORDER:VIEW_OWN'] },

  // Customers & Debt
  { path: '/admin/customer/:customerId', permission: 'CUSTOMER:VIEW' },
  { path: '/admin/customer', permission: 'CUSTOMER:VIEW' },

  // Reports & Accounting (Chỉ Quản lý)
  { path: '/admin/reports/revenue', role: ['MANAGER'] },
  { path: '/admin/reports/warehouse', role: ['MANAGER'] },
  { path: '/admin/accounting', role: ['MANAGER'] },

  // User Profile
  { path: '/profile', permission: null },
  { path: '/profile/edit', permission: null },
  { path: '/profile/change-password', permission: null },
];

/**
 * Match current URL pathname against route permission registry patterns
 */
export function getRoutePermissionConfig(pathname) {
  if (!pathname) return null;
  for (const config of ROUTE_PERMISSIONS) {
    const pattern = config.path.replace(/:[^\s/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(pathname)) {
      return config;
    }
  }
  return null;
}

/**
 * Default fallback / landing path based on user role and permissions
 */
export function getDefaultLandingPath(hasRole, hasPermission, user) {
  // 1. Quản lý / Admin -> Dashboard
  const isManager = (typeof hasRole === 'function' && (hasRole('MANAGER') || hasRole('ADMIN'))) ||
    (user?.roles && (
      (Array.isArray(user.roles) && user.roles.some(r => {
        const clean = String(r).replace(/^ROLE_/, '').toUpperCase();
        return clean === 'MANAGER' || clean === 'ADMIN';
      })) ||
      (typeof user.roles.has === 'function' && (user.roles.has('MANAGER') || user.roles.has('ROLE_MANAGER') || user.roles.has('ADMIN') || user.roles.has('ROLE_ADMIN')))
    ));

  if (isManager) {
    return '/admin/dashboard';
  }

  // 2. Nhân viên (STAFF) / Thu ngân -> Màn hình bán hàng POS
  const isStaff = (typeof hasRole === 'function' && hasRole('STAFF')) ||
    (user?.roles && (
      (Array.isArray(user.roles) && user.roles.some(r => {
        const clean = String(r).replace(/^ROLE_/, '').toUpperCase();
        return clean === 'STAFF';
      })) ||
      (typeof user.roles.has === 'function' && (user.roles.has('STAFF') || user.roles.has('ROLE_STAFF')))
    ));

  if (isStaff) {
    return '/admin/pos';
  }

  // 3. Fallback theo quyền
  if (typeof hasPermission === 'function') {
    if (hasPermission('POS:SALE')) return '/admin/pos';
    if (hasPermission('PRODUCT:VIEW')) return '/admin/products';
    if (hasPermission('IMPORT:VIEW')) return '/admin/warehouse/import';
    if (hasPermission('WAREHOUSE:VIEW')) return '/admin/warehouse/locations';
    if (hasPermission('CUSTOMER:VIEW')) return '/admin/customer';
    if (hasPermission('SUPPLIER:VIEW')) return '/admin/warehouse/supplier';
  }

  return '/admin/pos';
}
