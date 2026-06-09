import { MoreVertical } from 'lucide-react';

const products = [
    { name: 'Nước mắm Nam Ngư 500ml', sold: 120 },
    { name: 'Mì Hảo Hảo Tôm Chua Cay', sold: 95 },
    { name: 'Sữa tươi TH True Milk (Thùng)', sold: 82 },
    { name: 'Gạo ST25 (Bao 5kg)', sold: 45 },
    { name: 'Dầu ăn Cái Lân 1L', sold: 38 },
];

export default function TopProducts() {
    const maxSold = Math.max(...products.map((p) => p.sold));

    return (
        <div className="dashboard-card top-products-card">
            <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">Sản phẩm bán chạy</h3>
                <button className="dashboard-card__menu" aria-label="More options">
                    <MoreVertical size={18} />
                </button>
            </div>
            <div className="top-products__list">
                {products.map((product, index) => (
                    <div key={index} className="top-products__item">
                        <span className="top-products__name">{product.name}</span>
                        <div className="top-products__bar-wrapper">
                            <div
                                className="top-products__bar"
                                style={{ width: `${(product.sold / maxSold) * 100}%` }}
                            />
                        </div>
                        <span className="top-products__count">{product.sold}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
