const BASE_PRODUCTS = [
    {
        id: 1,
        code: 'SP000001',
        sku: 'SP000001',
        name: 'Nước mắm Nam Ngư 500ml',
        barcode: '8934567890123',
        category: 'Gia vị',
        importPrice: 25000,
        sellPrice: 32000,
        stock: 48,
        supplier: 'Công ty TNHH Thực phẩm ABC',
    },
    {
        id: 2,
        code: 'SP000002',
        sku: 'SP000002',
        name: 'Mì gói Hảo Hảo 75g',
        barcode: '8934567890124',
        category: 'Thực phẩm khô',
        importPrice: 3500,
        sellPrice: 5000,
        stock: 120,
        supplier: 'Nhà phân phối XYZ',
    },
    {
        id: 3,
        code: 'SP000003',
        sku: 'SP000003',
        name: 'Coca Cola 1.5L',
        barcode: '8934567890125',
        category: 'Đồ uống',
        importPrice: 12000,
        sellPrice: 18000,
        stock: 0,
        supplier: 'Công ty Coca-Cola Việt Nam',
    },
    {
        id: 4,
        code: 'SP000004',
        sku: 'SP000004',
        name: 'Dầu ăn Simply 1L',
        barcode: '8934567890126',
        category: 'Dầu ăn',
        importPrice: 45000,
        sellPrice: 55000,
        stock: 24,
        supplier: 'Công ty TNHH Thực phẩm ABC',
    },
    {
        id: 5,
        code: 'SP000005',
        sku: 'SP000005',
        name: 'Bột giặt OMO 2.1kg',
        barcode: '8934567890127',
        category: 'Hóa mỹ phẩm',
        importPrice: 85000,
        sellPrice: 105000,
        stock: 15,
        supplier: 'Unilever Việt Nam',
    },
    {
        id: 6,
        code: 'SP000006',
        sku: 'SP000006',
        name: 'Sữa TH true MILK 180ml',
        barcode: '8934567890128',
        category: 'Sữa',
        importPrice: 6000,
        sellPrice: 8500,
        stock: 60,
        supplier: 'Vinamilk',
    },
    {
        id: 7,
        code: 'SP000007',
        sku: 'SP000007',
        name: 'Bánh Oreo 133g',
        barcode: '8934567890129',
        category: 'Bánh kẹo',
        importPrice: 18000,
        sellPrice: 25000,
        stock: 32,
        supplier: 'Mondelez Kinh Đô',
    },
    {
        id: 8,
        code: 'SP000008',
        sku: 'SP000008',
        name: 'Trà xanh 0 độ 455ml',
        barcode: '8934567890130',
        category: 'Đồ uống',
        importPrice: 8000,
        sellPrice: 12000,
        stock: 0,
        supplier: 'Công ty Coca-Cola Việt Nam',
    },
    {
        id: 9,
        code: 'SP000009',
        sku: 'SP000009',
        name: 'Nước suối Lavie 500ml',
        barcode: '8934567890131',
        category: 'Đồ uống',
        importPrice: 3000,
        sellPrice: 5000,
        stock: 200,
        supplier: 'Nhà phân phối XYZ',
    },
    {
        id: 10,
        code: 'SP000010',
        sku: 'SP000010',
        name: 'Kẹo Alpenliebe 32g',
        barcode: '8934567890132',
        category: 'Bánh kẹo',
        importPrice: 5000,
        sellPrice: 8000,
        stock: 45,
        supplier: 'Mondelez Kinh Đô',
    },
];

function generateMockProducts() {
    const products = [...BASE_PRODUCTS];

    for (let i = 11; i <= 124; i += 1) {
        const base = BASE_PRODUCTS[(i - 1) % BASE_PRODUCTS.length];
        const formattedCode = `SP${String(i).padStart(6, '0')}`;
        products.push({
            ...base,
            id: i,
            code: formattedCode,
            sku: formattedCode,
            barcode: `8934567890${String(100 + i).slice(-3)}`,
            stock: i % 7 === 0 ? 0 : ((i * 13) % 150) + 5,
        });
    }

    return products;
}

export const MOCK_PRODUCTS = generateMockProducts();

export function getProductStatusLabel(stock) {
    return stock > 0 ? 'Còn hàng' : 'Hết hàng';
}

import { MOCK_PRODUCTS_BY_FACET } from '../constants';

/** Demo detail khi chưa có / API lỗi — khớp mock chỉnh sửa */
const EDIT_OVERRIDES = {
  1: {
    name: 'Nước mắm Nam Ngư 500ml',
    sku: 'SP000001',
    code: 'SP000001',
    barcode: '8934567890123',
    categoryId: '1',
    brand: 'Nam Ngư',
    description:
      'Nước mắm Nam Ngư chai 500ml — vị đậm đà, dùng nêm nướng và pha nước chấm. Thích hợp cho gia đình và quán ăn nhỏ.',
    status: 'active',
    baseUnit: 'Chai',
    baseSellPrice: '32000',
    costPrice: '25000',
    sellingPrice: '32000',
    vatPercent: 10,
    conversionUnits: [
      { id: 'u1', unitName: 'Lốc', qty: '6', ofUnit: 'Chai', sellPrice: '185000' },
      { id: 'u2', unitName: 'Thùng', qty: '6', ofUnit: 'Lốc', sellPrice: '1080000' },
    ],
    images: [
      {
        id: 'img-main',
        isMain: true,
        preview:
          'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop',
        url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop',
      },
    ],
    attributes: [
      { name: 'Dung tích', value: '500ml' },
      { name: 'Xuất xứ', value: 'Việt Nam' },
    ],
  },
};

function mapListProductToEdit(product) {
  const override = EDIT_OVERRIDES[product.id] || {};
  const unitName = product.unitName || 'sp';
  const cost = String(override.costPrice ?? product.costPrice ?? 0);
  const sell = String(override.sellingPrice ?? product.sellingPrice ?? 0);
  const codeFormatted = override.sku || product.sku || product.code || `SP${String(product.id).padStart(6, '0')}`;

  return {
    id: product.id,
    name: override.name || product.name || '',
    sku: codeFormatted,
    code: codeFormatted,
    barcode: override.barcode || product.barcode || '',
    categoryId:
      override.categoryId != null
        ? String(override.categoryId)
        : product.categoryId != null
          ? String(product.categoryId)
          : '',
    brand: override.brand || product.supplierName || '',
    description: override.description || product.description || '',
    status: override.status || (product.facetStatus === 'stop' ? 'inactive' : 'active'),
    baseUnit: override.baseUnit || unitName,
    baseSellPrice: override.baseSellPrice || sell,
    costPrice: cost,
    sellingPrice: sell,
    vatPercent: override.vatPercent ?? 10,
    conversionUnits: override.conversionUnits || [],
    images: override.images || [],
    attributes: override.attributes || product.attributes || [],
    productImg: product.productImg,
  };
}

/** Flatten mock facets — dùng khi chưa có API GET /products/:id */
export function getMockProductById(id) {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;

  for (const list of Object.values(MOCK_PRODUCTS_BY_FACET)) {
    const found = list.find((p) => p.id === numId);
    if (found) return mapListProductToEdit(found);
  }

  if (EDIT_OVERRIDES[numId]) {
    return { id: numId, ...EDIT_OVERRIDES[numId] };
  }

  const defaultCode = `SP${String(numId).padStart(6, '0')}`;

  // Demo form cho id bất kỳ khi BE chưa có
  return {
    id: numId,
    name: `Sản phẩm #${numId}`,
    sku: defaultCode,
    code: defaultCode,
    barcode: '',
    categoryId: '1',
    brand: '',
    description: '',
    status: 'active',
    baseUnit: 'Chai',
    baseSellPrice: '0',
    costPrice: '0',
    sellingPrice: '0',
    vatPercent: 10,
    conversionUnits: [],
    images: [],
  };
}
