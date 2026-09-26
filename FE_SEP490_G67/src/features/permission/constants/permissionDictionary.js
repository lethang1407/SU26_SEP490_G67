/**
 * Từ điển phân quyền thân thiện cho Chủ cửa hàng bán lẻ (Retail Store Owner)
 * Ánh xạ toàn bộ mã quyền kỹ thuật (Permission Code) sang thuật ngữ tiếng Việt dễ hiểu
 */

export const PERMISSION_MODULES = [
  {
    id: 'pos',
    name: 'Bán hàng & Thu ngân',
    icon: 'ShoppingCart',
    description: 'Bán hàng tại quầy, đổi trả hàng, in hóa đơn và tra cứu đơn bán.',
  },
  {
    id: 'warehouse',
    name: 'Kho & Hàng hóa',
    icon: 'Package',
    description: 'Quản lý thông tin sản phẩm, tồn kho, vị trí kệ hàng và kiểm kê kho.',
  },
  {
    id: 'import_supplier',
    name: 'Nhập hàng & Nhà cung cấp',
    icon: 'Truck',
    description: 'Lập đơn nhập hàng, nhập kho từ nhà cung cấp và thanh toán nợ NCC.',
  },
  {
    id: 'customer_debt',
    name: 'Khách hàng & Sổ nợ',
    icon: 'Users',
    description: 'Tra cứu khách hàng, theo dõi công nợ và thu tiền nợ khách hàng.',
  },
];

export const PERMISSION_DICTIONARY = {
  // ─── 1. BÁN HÀNG & THU NGÂN (POS) ───
  'POS:SALE': {
    code: 'POS:SALE',
    title: 'Bán hàng tại quầy (POS)',
    description: 'Quét mã vạch sản phẩm, tạo đơn bán lẻ, áp mã giảm giá và tính tiền tại quầy.',
    module: 'pos',
    badge: 'Cơ bản',
  },
  'POS:EXCHANGE': {
    code: 'POS:EXCHANGE',
    title: 'Xử lý đổi / trả hàng',
    description: 'Nhận hàng khách trả lại, đổi sang mặt hàng khác và hoàn tiền trực tiếp.',
    module: 'pos',
    badge: 'Quầy bán',
  },
  'SALES_ORDER:VIEW_OWN': {
    code: 'SALES_ORDER:VIEW_OWN',
    title: 'Xem đơn bán của mình',
    description: 'Chỉ xem lại lịch sử các đơn hàng do chính tài khoản này tạo ra.',
    module: 'pos',
    badge: 'Nhân viên',
  },
  'SALES_ORDER:VIEW_ALL': {
    code: 'SALES_ORDER:VIEW_ALL',
    title: 'Xem tất cả đơn bán hàng',
    description: 'Xem toàn bộ danh sách đơn bán hàng của tất cả nhân viên trong cửa hàng.',
    module: 'pos',
    badge: 'Toàn cửa hàng',
  },
  'SALES_ORDER:INVOICE': {
    code: 'SALES_ORDER:INVOICE',
    title: 'In & tải lại hóa đơn',
    description: 'Xem bản in, in lại hóa đơn tính tiền cho các đơn hàng cũ.',
    module: 'pos',
    badge: 'In ấn',
  },

  // ─── 2. KHO & HÀNG HÓA (WAREHOUSE & PRODUCT) ───
  'PRODUCT:VIEW': {
    code: 'PRODUCT:VIEW',
    title: 'Xem danh sách sản phẩm',
    description: 'Tra cứu danh mục, bảng giá bán lẻ, giá vốn, quy cách đơn vị và mã vạch.',
    module: 'warehouse',
    badge: 'Cơ bản',
  },
  'PRODUCT:CREATE': {
    code: 'PRODUCT:CREATE',
    title: 'Thêm sản phẩm mới',
    description: 'Khai báo hàng hóa mới, tạo các thuộc tính phân loại (màu, size) và đơn vị quy đổi.',
    module: 'warehouse',
    badge: 'Kho hàng',
  },
  'PRODUCT:UPDATE': {
    code: 'PRODUCT:UPDATE',
    title: 'Sửa thông tin sản phẩm',
    description: 'Thay đổi tên hàng, giá bán, giá vốn, ảnh đại diện và nhóm hàng hóa.',
    module: 'warehouse',
    badge: 'Kho hàng',
  },
  'PRODUCT:DELETE': {
    code: 'PRODUCT:DELETE',
    title: 'Xóa hàng hóa',
    description: 'Xóa hoặc ngừng kinh doanh mặt hàng (nên hạn chế cấp cho nhân viên thường).',
    module: 'warehouse',
    badge: 'Quan trọng',
  },
  'WAREHOUSE:VIEW': {
    code: 'WAREHOUSE:VIEW',
    title: 'Xem tồn kho & sơ đồ kệ',
    description: 'Xem số lượng tồn kho theo thời gian thực và vị trí ô kệ chứa hàng trong kho.',
    module: 'warehouse',
    badge: 'Cơ bản',
  },
  'WAREHOUSE:LOCATION_MANAGE': {
    code: 'WAREHOUSE:LOCATION_MANAGE',
    title: 'Quản lý ô kệ & xếp kho',
    description: 'Thêm sửa xóa khu vực, tạo ô kệ mới và điều chuyển vị trí hàng hóa trong kho.',
    module: 'warehouse',
    badge: 'Thủ kho',
  },
  'WAREHOUSE:CHECK_VIEW': {
    code: 'WAREHOUSE:CHECK_VIEW',
    title: 'Xem lịch sử kiểm kho',
    description: 'Tra cứu danh sách và biên bản các đợt kiểm kê hàng hóa đã thực hiện.',
    module: 'warehouse',
    badge: 'Kiểm kê',
  },
  'WAREHOUSE:CHECK_CREATE': {
    code: 'WAREHOUSE:CHECK_CREATE',
    title: 'Tạo & chốt phiếu kiểm kê',
    description: 'Tạo đợt kiểm kho, nhập số lượng đếm thực tế và chốt cân bằng lại tồn kho.',
    module: 'warehouse',
    badge: 'Kiểm kê',
  },

  // ─── 3. NHẬP HÀNG & NHÀ CUNG CẤP (IMPORT & SUPPLIER) ───
  'IMPORT:VIEW': {
    code: 'IMPORT:VIEW',
    title: 'Xem danh sách nhập hàng',
    description: 'Xem lịch sử các đơn đặt hàng nhập và phiếu nhập kho từ nhà cung cấp.',
    module: 'import_supplier',
    badge: 'Nhập hàng',
  },
  'IMPORT:CREATE': {
    code: 'IMPORT:CREATE',
    title: 'Lập đơn & nhập kho hàng',
    description: 'Tạo đơn đặt hàng nhập (PO) và thực hiện nhập kho hàng hóa từ nhà cung cấp.',
    module: 'import_supplier',
    badge: 'Nhập hàng',
  },
  'IMPORT:UPDATE': {
    code: 'IMPORT:UPDATE',
    title: 'Sửa phiếu nhập hàng',
    description: 'Chỉnh sửa số lượng, giá nhập và thông tin lô hàng khi phiếu đang ở trạng thái nháp.',
    module: 'import_supplier',
    badge: 'Nhập hàng',
  },
  'IMPORT:CANCEL': {
    code: 'IMPORT:CANCEL',
    title: 'Hủy phiếu nhập nháp',
    description: 'Hủy các đơn đặt hàng nhập đang nháp hoặc chưa nhập kho.',
    module: 'import_supplier',
    badge: 'Nhập hàng',
  },
  'SUPPLIER:VIEW': {
    code: 'SUPPLIER:VIEW',
    title: 'Xem danh sách nhà cung cấp',
    description: 'Tra cứu thông tin liên hệ, bảng giá và công nợ với các nhà cung cấp.',
    module: 'import_supplier',
    badge: 'NCC',
  },
  'SUPPLIER:CREATE': {
    code: 'SUPPLIER:CREATE',
    title: 'Thêm nhà cung cấp mới',
    description: 'Khai báo thêm đối tác phân phối hoặc nhà cung cấp mới vào hệ thống.',
    module: 'import_supplier',
    badge: 'NCC',
  },
  'SUPPLIER:UPDATE': {
    code: 'SUPPLIER:UPDATE',
    title: 'Sửa thông tin nhà cung cấp',
    description: 'Cập nhật số điện thoại, địa chỉ, thời gian giao hàng của nhà cung cấp.',
    module: 'import_supplier',
    badge: 'NCC',
  },
  'SUPPLIER:DELETE': {
    code: 'SUPPLIER:DELETE',
    title: 'Xóa nhà cung cấp',
    description: 'Xóa hoặc ngừng hợp tác với nhà cung cấp.',
    module: 'import_supplier',
    badge: 'NCC',
  },
  'SUPPLIER:PAYMENT': {
    code: 'SUPPLIER:PAYMENT',
    title: 'Thanh toán nợ nhà cung cấp',
    description: 'Lập phiếu chi tiền thanh toán công nợ tiền hàng cho nhà cung cấp.',
    module: 'import_supplier',
    badge: 'Thu chi',
  },

  // ─── 4. KHÁCH HÀNG & SỔ NỢ (CUSTOMER & DEBT) ───
  'CUSTOMER:VIEW': {
    code: 'CUSTOMER:VIEW',
    title: 'Xem danh bạ khách hàng',
    description: 'Tra cứu thông tin liên hệ, địa chỉ và lịch sử mua sắm của khách hàng.',
    module: 'customer_debt',
    badge: 'Khách hàng',
  },
  'CUSTOMER:DEBT_VIEW': {
    code: 'CUSTOMER:DEBT_VIEW',
    title: 'Xem sổ nợ khách hàng',
    description: 'Xem chi tiết các khoản nợ chưa thanh toán và hạn trả nợ của từng khách hàng.',
    module: 'customer_debt',
    badge: 'Sổ nợ',
  },
  'CUSTOMER:DEBT_MANAGE': {
    code: 'CUSTOMER:DEBT_MANAGE',
    title: 'Thu nợ & gạch nợ khách',
    description: 'Tạo phiếu thu tiền trả nợ từ khách hàng và cập nhật giảm số dư nợ.',
    module: 'customer_debt',
    badge: 'Thu chi',
  },
};

/**
 * Các Mẫu Vị Trí Công Việc (Role Templates / One-click Presets)
 * Giúp Quản lý gán nhanh tập quyền theo vị trí thực tế cho tài khoản STAFF
 */
export const ROLE_TEMPLATES = [
  {
    id: 'CASHIER',
    name: 'Mẫu: Thu ngân (Bán hàng)',
    description: 'Phù hợp nhân viên đứng quầy tính tiền, quét mã vạch, in hóa đơn và xử lý đổi trả hàng.',
    permissions: [
      'PRODUCT:VIEW',
      'POS:SALE',
      'POS:EXCHANGE',
      'SALES_ORDER:VIEW_OWN',
      'SALES_ORDER:INVOICE',
      'CUSTOMER:VIEW',
    ],
  },
  {
    id: 'WAREHOUSE_STAFF',
    name: 'Mẫu: Nhân viên Kho',
    description: 'Phù hợp nhân viên phụ trách quản lý hàng hóa, xếp ô kệ, kiểm kê tồn kho và nhận hàng từ NCC.',
    permissions: [
      'PRODUCT:VIEW',
      'PRODUCT:CREATE',
      'PRODUCT:UPDATE',
      'WAREHOUSE:VIEW',
      'WAREHOUSE:LOCATION_MANAGE',
      'WAREHOUSE:CHECK_VIEW',
      'WAREHOUSE:CHECK_CREATE',
      'IMPORT:VIEW',
      'IMPORT:CREATE',
      'IMPORT:UPDATE',
      'SUPPLIER:VIEW',
      'SUPPLIER:CREATE',
    ],
  },
  {
    id: 'ACCOUNTANT',
    name: 'Mẫu: Kế toán / Thu chi',
    description: 'Phù hợp nhân viên phụ trách theo dõi công nợ khách hàng, thanh toán NCC và quản lý sổ nợ.',
    permissions: [
      'PRODUCT:VIEW',
      'IMPORT:VIEW',
      'SUPPLIER:VIEW',
      'SUPPLIER:PAYMENT',
      'SALES_ORDER:VIEW_ALL',
      'SALES_ORDER:INVOICE',
      'CUSTOMER:VIEW',
      'CUSTOMER:DEBT_VIEW',
      'CUSTOMER:DEBT_MANAGE',
    ],
  },
  {
    id: 'ALL_ROUNDER',
    name: 'Mẫu: Nhân viên Đa năng (Bán hàng & Kho)',
    description: 'Phù hợp cho nhân viên làm cả bán hàng tại quầy lẫn sắp xếp kho và nhập hàng.',
    permissions: [
      'PRODUCT:VIEW',
      'PRODUCT:CREATE',
      'PRODUCT:UPDATE',
      'POS:SALE',
      'POS:EXCHANGE',
      'SALES_ORDER:VIEW_ALL',
      'SALES_ORDER:INVOICE',
      'WAREHOUSE:VIEW',
      'WAREHOUSE:CHECK_VIEW',
      'WAREHOUSE:CHECK_CREATE',
      'IMPORT:VIEW',
      'IMPORT:CREATE',
      'SUPPLIER:VIEW',
      'CUSTOMER:VIEW',
    ],
  },
  {
    id: 'FULL_ACCESS',
    name: 'Mẫu: Nhân viên Toàn quyền',
    description: 'Cấp toàn bộ quyền thao tác dành cho nhân viên trong hệ thống cho nhân viên cấp phó / quản lý ca tin cậy.',
    permissions: Object.keys(PERMISSION_DICTIONARY),
  },
  {
    id: 'CUSTOM',
    name: 'Tùy chỉnh riêng',
    description: 'Tự do bật/tắt từng công tắc quyền hạn tùy theo nhu cầu riêng của cửa hàng.',
    permissions: [],
  },
];

/**
 * Trả về thông tin hiển thị tiếng Việt của 1 mã quyền
 */
export function getPermissionMeta(code) {
  if (!code) return null;
  const upperCode = String(code).trim().toUpperCase();
  if (PERMISSION_DICTIONARY[upperCode]) {
    return PERMISSION_DICTIONARY[upperCode];
  }
  return {
    code: upperCode,
    title: upperCode.replace(/[_:]/g, ' '),
    description: `Quyền thực hiện thao tác ${upperCode}`,
    module: 'other',
    badge: 'Khác',
  };
}

/**
 * Nhận diện mẫu vai trò (Role Template) tương ứng từ tập quyền của nhân viên
 */
export function getStaffRoleTemplate(permissions) {
  let permSet = new Set(permissions || []);

  // Mặc định nhân viên (STAFF) có quyền của vai trò Bán hàng (Thu ngân)
  if (permSet.size === 0) {
    const cashierTpl = ROLE_TEMPLATES.find((t) => t.id === 'CASHIER');
    if (cashierTpl) {
      permSet = new Set(cashierTpl.permissions);
    }
  }


  const allCodes = Object.keys(PERMISSION_DICTIONARY);
  if (permSet.size === allCodes.length && allCodes.every((c) => permSet.has(c))) {
    return {
      id: 'FULL_ACCESS',
      name: 'Toàn quyền',
      badgeClass: 'staff-badge--purple',
      color: '#7c3aed',
      bg: '#ede9fe',
      borderColor: '#ddd6fe',
    };
  }

  for (const tpl of ROLE_TEMPLATES) {
    if (tpl.id === 'CUSTOM' || tpl.id === 'FULL_ACCESS') continue;
    if (
      tpl.permissions.length === permSet.size &&
      tpl.permissions.every((p) => permSet.has(p))
    ) {
      let badgeClass = 'staff-badge--blue';
      let color = '#2563eb';
      let bg = '#eff6ff';
      let borderColor = '#bfdbfe';

      if (tpl.id === 'CASHIER') {
        badgeClass = 'staff-badge--emerald';
        color = '#059669';
        bg = '#ecfdf5';
        borderColor = '#a7f3d0';
      } else if (tpl.id === 'WAREHOUSE_STAFF') {
        badgeClass = 'staff-badge--amber';
        color = '#d97706';
        bg = '#fffbeb';
        borderColor = '#fde68a';
      } else if (tpl.id === 'ACCOUNTANT') {
        badgeClass = 'staff-badge--indigo';
        color = '#4f46e5';
        bg = '#eef2ff';
        borderColor = '#c7d2fe';
      } else if (tpl.id === 'ALL_ROUNDER') {
        badgeClass = 'staff-badge--sky';
        color = '#0284c7';
        bg = '#f0f9ff';
        borderColor = '#bae6fd';
      }

      return {
        id: tpl.id,
        name: tpl.name.replace('Mẫu: ', ''),
        badgeClass,
        color,
        bg,
        borderColor,
      };
    }
  }

  return {
    id: 'CUSTOM',
    name: `Tùy chỉnh (${permSet.size} quyền)`,
    badgeClass: 'staff-badge--teal',
    color: '#0d9488',
    bg: '#f0fdfa',
    borderColor: '#99f6e4',
  };
}

