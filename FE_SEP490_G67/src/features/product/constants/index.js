export const PRODUCT_ROUTES = {
  list: '/admin/products',
  create: '/admin/products/create',
  edit: (id) => `/admin/products/${id}/edit`,
  categories: '/admin/products/categories',
};

export const ADD_PRODUCT_FORM_ID = 'add-product-form';
export const EDIT_PRODUCT_FORM_ID = 'edit-product-form';

export const PRODUCT_CATEGORY_OPTIONS = [
  { value: 'gia-vi', label: 'Gia vị' },
  { value: 'gia-vi-che-bien', label: 'Gia vị & Chế biến' },
  { value: 'sua-tuoi', label: 'Sữa & tươi' },
  { value: 'do-uong', label: 'Đồ uống' },
  { value: 'tp-kho', label: 'TP khô' },
  { value: 'banh-keo', label: 'Bánh kẹo' },
  { value: 'hoa-my-pham', label: 'Hóa mỹ phẩm' },
];

export const PRODUCT_UNIT_OPTIONS = [
  'Chai',
  'Lốc',
  'Thùng',
  'Gói',
  'Hộp',
  'Lon',
  'Túi',
  'Kg',
  'Vỉ',
  'Bao',
];

export const PAGE_SIZE = 10;

export const FACETS = [
  {
    group: 'Hết hàng',
    items: [
      { key: 'hot', label: 'Hết — đang bán tốt', dot: 'hot', nested: true },
      { key: 'slow', label: 'Hết — ít người mua', dot: 'dead', nested: true },
    ],
  },
  {
    group: 'Còn hàng trên kệ',
    items: [
      { key: 'warn', label: 'Sắp hết — đang bán tốt', dot: 'warn' },
      { key: 'season', label: 'Còn hàng — sắp mùa lễ', dot: 'season' },
      { key: 'ok', label: 'Còn đủ hàng', dot: 'ok' },
      { key: 'stop', label: 'Đã ngừng bán', dot: 'stop' },
    ],
  },
];

export const COVER_OPTIONS = [3, 5, 7, 14, 30];

/** Demo data khớp mock — dùng khi API trống / lỗi */
export const MOCK_PRODUCTS_BY_FACET = {
  hot: [
    { id: 1, name: 'Nước mắm Nam Ngư 500ml', productImg: '🍶', unitName: 'chai', avgDailyRate: 3.2, avgWeeklyRate: 22, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'Gia vị', barcode: '8934567890123', sellingPrice: 32000, costPrice: 25000, supplierName: 'Masan', categoryCoverDays: 14, shelfLocation: 'A2 — Kệ gia vị', lastImportNote: '28/06/2026 · 48 chai', description: 'Nước mắm Nam Ngư chai 500ml — vị đậm đà, dùng nêm nướng và pha nước chấm.' },
    { id: 2, name: 'Sữa TH True Milk 1L', productImg: '🥛', unitName: 'hộp', avgDailyRate: 2.5, avgWeeklyRate: 17, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'Sữa & tươi', barcode: '8934567890456', sellingPrice: 36000, costPrice: 28000, supplierName: 'TH True Milk', categoryCoverDays: 5, coverDaysOverride: 3, shelfLocation: 'B1 — Tủ mát', lastImportNote: '01/07/2026 · 24 hộp', description: 'Sữa tươi tiệt trùng TH True Milk 1L.' },
    { id: 3, name: 'Mì Hảo Hảo tôm chua cay', productImg: '🍜', unitName: 'gói', avgDailyRate: 24, avgWeeklyRate: 168, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'TP khô', barcode: '8934567890789', sellingPrice: 4500, costPrice: 3200, supplierName: 'Acecook', categoryCoverDays: 14, shelfLocation: 'C3 — Kệ mì', lastImportNote: '20/06/2026 · 200 gói' },
    { id: 4, name: 'Coca Cola lon 330ml', productImg: '🥤', unitName: 'lon', avgDailyRate: 18, avgWeeklyRate: 126, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'Đồ uống', barcode: '8934567890111', sellingPrice: 10000, costPrice: 7500, supplierName: 'Coca-Cola', categoryCoverDays: 7, shelfLocation: 'D1 — Kệ nước', lastImportNote: '15/06/2026 · 120 lon' },
    { id: 5, name: 'Nước ngọt Mirinda cam', productImg: '🧃', unitName: 'lon', avgDailyRate: 12, avgWeeklyRate: 84, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'Đồ uống', barcode: '8934567890222', sellingPrice: 9000, costPrice: 6800, supplierName: 'PepsiCo', categoryCoverDays: 7 },
    { id: 6, name: 'Tương ớt Chin-su 250g', productImg: '🫙', unitName: 'chai', avgDailyRate: 4.1, avgWeeklyRate: 29, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'Gia vị', barcode: '8934567890333', sellingPrice: 18000, costPrice: 14000, supplierName: 'Masan', categoryCoverDays: 14 },
    { id: 7, name: 'Gạo Jasmine túi 2kg', productImg: '🍚', unitName: 'túi', avgDailyRate: 6.5, avgWeeklyRate: 46, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'TP khô', barcode: '8934567890444', sellingPrice: 52000, costPrice: 42000, supplierName: 'Vinafood', categoryCoverDays: 14 },
    { id: 8, name: 'Bột ngọt Ajinomoto 400g', productImg: '🧂', unitName: 'gói', avgDailyRate: 1.8, avgWeeklyRate: 13, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'Gia vị', barcode: '8934567890555', sellingPrice: 28000, costPrice: 22000, supplierName: 'Ajinomoto', categoryCoverDays: 14 },
    { id: 9, name: 'Trứng gà Ba Huân vỉ 10', productImg: '🥚', unitName: 'vỉ', avgDailyRate: 8.0, avgWeeklyRate: 56, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'Sữa & tươi', barcode: '8934567890666', sellingPrice: 32000, costPrice: 27000, supplierName: 'Ba Huân', categoryCoverDays: 5, coverDaysOverride: 3 },
    { id: 10, name: 'Dầu ăn Neptune 1L', productImg: '🫗', unitName: 'chai', avgDailyRate: 2.2, avgWeeklyRate: 15, onHand: 0, coverDaysLeft: 0, facetStatus: 'hot', categoryName: 'Gia vị', barcode: '8934567890777', sellingPrice: 48000, costPrice: 39000, supplierName: 'Wilmar', categoryCoverDays: 14 },
  ],
  slow: [
    { id: 11, name: 'Hạt nêm Knorr 900g', productImg: '🧂', unitName: 'gói', avgDailyRate: 0.04, avgWeeklyRate: 0.3, onHand: 0, coverDaysLeft: 0, facetStatus: 'slow', categoryName: 'Gia vị', sellingPrice: 58000, costPrice: 48000, supplierName: 'Unilever', categoryCoverDays: 14 },
    { id: 12, name: 'Nước rửa tay hương lạ', productImg: '🧴', unitName: 'chai', avgDailyRate: 0.2, avgWeeklyRate: 1.4, onHand: 8, coverDaysLeft: 40, facetStatus: 'slow', categoryName: 'Hóa mỹ phẩm', sellingPrice: 45000, costPrice: 30000, supplierName: 'Local', categoryCoverDays: 30 },
  ],
  warn: [
    { id: 13, name: 'Mì Hảo Hảo tôm chua cay', productImg: '🍜', unitName: 'gói', avgDailyRate: 24, avgWeeklyRate: 168, onHand: 48, coverDaysLeft: 2, facetStatus: 'warn', categoryName: 'TP khô', sellingPrice: 4500, costPrice: 3200, supplierName: 'Acecook', categoryCoverDays: 14 },
    { id: 14, name: 'Dầu ăn Tường An 1L', productImg: '🫙', unitName: 'chai', avgDailyRate: 1.1, avgWeeklyRate: 8, onHand: 8, coverDaysLeft: 7, facetStatus: 'warn', categoryName: 'Gia vị', sellingPrice: 47000, costPrice: 38000, supplierName: 'Tường An', categoryCoverDays: 14 },
    { id: 15, name: 'Coca Cola lon 330ml', productImg: '🥤', unitName: 'lon', avgDailyRate: 18, avgWeeklyRate: 126, onHand: 40, coverDaysLeft: 2, facetStatus: 'warn', categoryName: 'Đồ uống', sellingPrice: 10000, costPrice: 7500, supplierName: 'Coca-Cola', categoryCoverDays: 7 },
  ],
  season: [
    { id: 16, name: 'Bia Heineken thùng 24', productImg: '🍺', unitName: 'thùng', avgDailyRate: 1.6, avgWeeklyRate: 11, onHand: 15, coverDaysLeft: 9, facetStatus: 'season', categoryName: 'Đồ uống', sellingPrice: 410000, costPrice: 350000, supplierName: 'Heineken', categoryCoverDays: 14, seasonTag: 'Tết' },
    { id: 17, name: 'Bánh Trung thu Kinh Đô', productImg: '🥮', unitName: 'hộp', avgDailyRate: 0.4, avgWeeklyRate: 2.8, onHand: 20, coverDaysLeft: 45, facetStatus: 'season', categoryName: 'Bánh kẹo', sellingPrice: 185000, costPrice: 140000, supplierName: 'Kinh Đô', categoryCoverDays: 30, seasonTag: 'Trung thu' },
    { id: 18, name: 'Hàng khô Tết (bánh mứt)', productImg: '🎆', unitName: 'hộp', avgDailyRate: 0, avgWeeklyRate: 0, onHand: 0, coverDaysLeft: 0, facetStatus: 'season', categoryName: 'Bánh kẹo', sellingPrice: 95000, costPrice: 70000, supplierName: 'Local', categoryCoverDays: 30, seasonTag: 'Tết' },
  ],
  ok: [
    { id: 19, name: 'Đường Biên Hòa 1kg', productImg: '🍬', unitName: 'kg', avgDailyRate: 4, avgWeeklyRate: 28, onHand: 56, coverDaysLeft: 14, facetStatus: 'ok', categoryName: 'TP khô', sellingPrice: 28000, costPrice: 22000, supplierName: 'Biên Hòa', categoryCoverDays: 14 },
    { id: 20, name: 'Gạo ST25 bao 10kg', productImg: '🌾', unitName: 'bao', avgDailyRate: 1.2, avgWeeklyRate: 8, onHand: 40, coverDaysLeft: 30, facetStatus: 'ok', categoryName: 'TP khô', sellingPrice: 285000, costPrice: 240000, supplierName: 'Ông Cua', categoryCoverDays: 14 },
  ],
  stop: [
    { id: 21, name: 'Pate gan đóng hộp lạ', productImg: '🥫', unitName: 'hộp', avgDailyRate: 0.1, avgWeeklyRate: 0.7, onHand: 0, coverDaysLeft: 0, facetStatus: 'stop', categoryName: 'TP khô', sellingPrice: 35000, costPrice: 28000, supplierName: 'Local', categoryCoverDays: 14 },
  ],
};

export const MOCK_SUGGESTIONS = [
  {
    productId: 1,
    productName: 'Nam Ngư 500ml',
    emoji: '🍶',
    whyFacts: 'Hết · ~3.2 chai/ngày · NCC giao ~5 ngày · nhóm Gia vị',
    whyResult: '→ Đặt hôm nay, gợi ý nhập 67 chai',
    suggestedQty: 67,
    orderToday: true,
    supplierId: 1,
    supplierName: 'Masan',
    leadTimeDays: 5,
    coverDays: 14,
    coverSource: 'CATEGORY',
    coverSourceLabel: 'Nhóm Gia vị',
    costPerUnit: 25000,
    onHand: 0,
    avgDailyRate: 3.2,
  },
  {
    productId: 2,
    productName: 'Sữa TH True Milk 1L',
    emoji: '🥛',
    whyFacts: 'Hết · ~2.5 hộp/ngày · NCC giao ~3 ngày · HSD ngắn → còn bán ~7 ngày sau khi về',
    whyResult: '→ Đặt hôm nay, gợi ý nhập 18 hộp',
    suggestedQty: 18,
    orderToday: true,
    supplierId: 2,
    supplierName: 'TH True Milk',
    leadTimeDays: 3,
    coverDays: 3,
    coverSource: 'PRODUCT',
    coverSourceLabel: 'Cài riêng SP',
    costPerUnit: 28000,
    onHand: 0,
    avgDailyRate: 2.5,
  },
];

export const MOCK_CATEGORIES = [
  { id: 1, name: 'Gia vị', coverDays: 14, defaultSupplierName: 'Masan' },
  { id: 2, name: 'Sữa & tươi', coverDays: 5, defaultSupplierName: 'TH True Milk' },
  { id: 3, name: 'Đồ uống', coverDays: 7, defaultSupplierName: 'Heineken' },
];

export const DEMO_CATEGORY_NAMES = ['Gia vị', 'Đồ uống', 'TP khô', 'Sữa & em bé'];
