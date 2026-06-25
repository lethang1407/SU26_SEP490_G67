const products = [
    { name: 'Mì Hảo Hảo Tôm Chua Cay', sold: 42, unit: 'Thùng' },
    { name: 'Nước ngọt Pepsi 330ml', sold: 28, unit: 'Thùng' },
    { name: 'Bánh Oreo', sold: 15, unit: 'Thùng' },
    { name: 'Sữa tươi TH True Milk', sold: 12, unit: 'Thùng' },
    { name: 'Gạo ST25 (Bao 5kg)', sold: 8, unit: 'bao' },
];

export default function TopProducts() {
    const maxSold = Math.max(...products.map((p) => p.sold));

    const getRankClass = (index) => {
        if (index === 0) return 'top-products__rank--1';
        if (index === 1) return 'top-products__rank--2';
        if (index === 2) return 'top-products__rank--3';
        return 'top-products__rank--default';
    };

    const getBarClass = (index) => {
        if (index === 0) return 'top-products__bar--1';
        if (index === 1) return 'top-products__bar--2';
        if (index === 2) return 'top-products__bar--3';
        return 'top-products__bar--default';
    };

    return (
        <div className="dashboard-card top-products-card">
            <div className="dashboard-card__header">
                <h3 className="dashboard-card__title">Sản Phẩm Bán Chạy Trong Tháng</h3>
                <button className="dashboard-card__link">
                    Xem báo cáo đầy đủ
                </button>
            </div>
            <div className="top-products__list">
                {products.map((product, index) => (
                    <div key={index} className="top-products__item">
                        <span className={`top-products__rank ${getRankClass(index)}`}>
                            {index + 1}
                        </span>
                        <div className="top-products__details">
                            <span className="top-products__name">{product.name}</span>
                            <div className="top-products__bar-wrapper">
                                <div
                                    className={`top-products__bar ${getBarClass(index)}`}
                                    style={{ width: `${(product.sold / maxSold) * 100}%` }}
                                />
                            </div>
                        </div>
                        <span className="top-products__count">
                            {product.sold} {product.unit}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
