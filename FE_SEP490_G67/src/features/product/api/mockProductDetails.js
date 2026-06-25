const DETAIL_EXTRAS = {
    1: {
        brand: 'Masan',
        unit: 'Chai (500ml)',
        weight: '550g',
        minStock: 50,
        stock: 145,
        lastUpdated: 'Hôm nay lúc 09:30 AM',
        category: 'Gia vị & Chế biến',
        description:
            'Nước mắm Nam Ngư là sản phẩm gia vị truyền thống của Việt Nam, được sản xuất từ cá cơm tươi ngon, mang lại hương vị đậm đà cho các món ăn gia đình.',
        baseUnit: { name: 'Chai', sellPrice: 32000 },
        conversionUnits: [
            { id: 'unit-loc', name: 'Lốc', ratio: 6, sellPrice: 180000 },
            { id: 'unit-thung', name: 'Thùng', ratio: 24, sellPrice: 700000 },
        ],
        images: [{ id: 'img-main', isMain: true }],
        businessStatus: 'active',
    },
};

const DEFAULT_BRANDS = {
    'Gia vị': 'Masan',
    'Thực phẩm khô': 'Acecook',
    'Đồ uống': 'Coca-Cola',
    'Dầu ăn': 'Simply',
    'Hóa mỹ phẩm': 'Unilever',
    Sữa: 'Vinamilk',
    'Bánh kẹo': 'Mondelez',
};

function getUnitByCategory(category) {
    const unitMap = {
        'Gia vị': 'Chai (500ml)',
        'Thực phẩm khô': 'Gói',
        'Đồ uống': 'Chai',
        'Dầu ăn': 'Chai (1L)',
        'Hóa mỹ phẩm': 'Túi',
        Sữa: 'Hộp',
        'Bánh kẹo': 'Gói',
    };
    return unitMap[category] || 'Cái';
}

function getDefaultConversionUnits(baseUnitName, sellPrice) {
    return [
        {
            id: crypto.randomUUID(),
            name: 'Lốc',
            ratio: 6,
            sellPrice: sellPrice * 6 - 12000,
        },
        {
            id: crypto.randomUUID(),
            name: 'Thùng',
            ratio: 24,
            sellPrice: sellPrice * 24 - 68000,
        },
    ].map((unit) => ({
        ...unit,
        baseUnitName,
    }));
}

function buildEditExtras(product, extras) {
    const baseUnitName = extras.baseUnit?.name ?? getUnitByCategory(product.category).split(' ')[0];
    const sellPrice = extras.baseUnit?.sellPrice ?? product.sellPrice;

    return {
        baseUnit: extras.baseUnit ?? { name: baseUnitName, sellPrice },
        conversionUnits:
            extras.conversionUnits ??
            getDefaultConversionUnits(baseUnitName, sellPrice).map(({ baseUnitName: _, ...unit }) => unit),
        images: extras.images ?? [],
        businessStatus: extras.businessStatus ?? (product.stock > 0 ? 'active' : 'inactive'),
    };
}

export function buildProductDetail(product) {
    if (!product) {
        return null;
    }

    const extras = DETAIL_EXTRAS[product.id] ?? {};
    const stock = extras.stock ?? product.stock;
    const minStock = extras.minStock ?? 20;
    const importPrice = product.importPrice;
    const sellPrice = product.sellPrice;
    const profitMargin =
        sellPrice > 0 ? (((sellPrice - importPrice) / sellPrice) * 100).toFixed(1) : '0.0';
    const inventoryValue = stock * importPrice;

    return {
        ...product,
        category: extras.category ?? product.category,
        stock,
        brand: extras.brand ?? DEFAULT_BRANDS[product.category] ?? '—',
        unit: extras.unit ?? getUnitByCategory(product.category),
        weight: extras.weight ?? '—',
        minStock,
        lastUpdated: extras.lastUpdated ?? 'Hôm nay lúc 09:30 AM',
        description:
            extras.description ??
            `${product.name} là mặt hàng thuộc danh mục ${product.category}, được cung cấp bởi ${product.supplier}.`,
        profitMargin,
        inventoryValue,
    };
}

export function getProductDetailById(productId, products) {
    const product = products.find((item) => item.id === Number(productId));
    return buildProductDetail(product);
}

export function getProductEditById(productId, products) {
    const detail = getProductDetailById(productId, products);
    if (!detail) {
        return null;
    }

    const extras = DETAIL_EXTRAS[detail.id] ?? {};
    const editExtras = buildEditExtras(detail, extras);

    return {
        ...detail,
        ...editExtras,
    };
}
