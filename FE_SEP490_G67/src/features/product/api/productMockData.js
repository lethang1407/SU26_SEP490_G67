import { MOCK_PRODUCTS_BY_FACET } from '../constants';

/** Demo detail khi chưa có / API lỗi — khớp mock chỉnh sửa */
const EDIT_OVERRIDES = {
  1: {
    name: 'Nước mắm Nam Ngư 500ml',
    sku: 'SP-NN-500-01',
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
  },
};

function mapListProductToEdit(product) {
  const override = EDIT_OVERRIDES[product.id] || {};
  const unitName = product.unitName || 'sp';
  const cost = String(override.costPrice ?? product.costPrice ?? 0);
  const sell = String(override.sellingPrice ?? product.sellingPrice ?? 0);

  return {
    id: product.id,
    name: override.name || product.name || '',
    sku: override.sku || `SP${String(product.id).padStart(3, '0')}`,
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

  // Demo form cho id bất kỳ khi BE chưa có
  return {
    id: numId,
    name: `Sản phẩm #${numId}`,
    sku: `SP${String(numId).padStart(3, '0')}`,
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
