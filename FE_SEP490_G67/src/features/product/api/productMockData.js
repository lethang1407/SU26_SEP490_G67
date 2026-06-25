const BASE_PRODUCTS = [
    {
        id: 1,
        code: 'SP001',
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
        code: 'SP002',
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
        code: 'SP003',
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
        code: 'SP004',
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
        code: 'SP005',
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
        code: 'SP006',
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
        code: 'SP007',
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
        code: 'SP008',
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
        code: 'SP009',
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
        code: 'SP010',
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
        products.push({
            ...base,
            id: i,
            code: `SP${String(i).padStart(3, '0')}`,
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
