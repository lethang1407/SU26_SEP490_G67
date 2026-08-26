import { MoreHorizontal, ShoppingCart } from 'lucide-react';

const products = [
    {
        name: 'Mì Hảo Hảo',
        stock: '8 thùng',
        minStock: '10 thùng',
        sold30: '20 thùng',
        ratingLine1: 'Nên',
        ratingLine2: 'nhập',
        ratingType: 'danger',
        action: 'order',
    },
    {
        name: 'Nước mắm Nam Ngư',
        stock: '8',
        minStock: '10',
        sold30: '1',
        ratingLine1: 'Bán',
        ratingLine2: 'chậm',
        ratingType: 'neutral',
        action: 'more',
    },
];

export default function TopProducts() {
    return (
        <section className="dashboard-card dashboard-card--compact inventory-review-card">
            <div className="dashboard-card_header">
                <h3 className="dashboard-card_title">Sản phẩm cần xem xét nhập hàng</h3>
            </div>
            <div className="inv-table-wrapper">
                <table className="inv-table inv-table--review">
                    <thead>
                        <tr>
                            <th className="text-left">Sản phẩm</th>
                            <th className="text-center">Tồn hiện tại</th>
                            <th className="text-center">Ngưỡng tối thiểu</th>
                            <th className="text-center">Bán 30 ngày</th>
                            <th className="text-center">Đánh giá</th>
                            <th className="text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product.name}>
                                <td className="inv-table_product">{product.name}</td>
                                <td className="text-center">{product.stock}</td>
                                <td className="text-center">{product.minStock}</td>
                                <td className="text-center">{product.sold30}</td>
                                <td className="text-center">
                                    <span className={`review-badge review-badge--${product.ratingType}`}>
                                        <span className="review-badge_dot" />
                                        <span className="review-badge_text">
                                            <span>{product.ratingLine1}</span>
                                            <span>{product.ratingLine2}</span>
                                        </span>
                                    </span>
                                </td>
                                <td className="text-center">
                                    {product.action === 'order' ? (
                                        <button
                                            className="inv-table_action inv-table_action--order"
                                            type="button"
                                            title="Đặt hàng"
                                        >
                                            <ShoppingCart size={15} />
                                        </button>
                                    ) : (
                                        <button
                                            className="inv-table_action inv-table_action--more"
                                            type="button"
                                            title="Tùy chọn khác"
                                        >
                                            <MoreHorizontal size={15} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}