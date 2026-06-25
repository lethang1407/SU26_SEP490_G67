import { formatCurrency } from '../utils/productUtils';

export default function ProductPricingCard({ product }) {
    return (
        <section className="product-detail-card product-detail-card--compact">
            <h2 className="product-detail-card__title">Giá cả</h2>

            <div className="product-detail-pricing">
                <div className="product-detail-pricing__row">
                    <span className="product-detail-pricing__label">Giá nhập</span>
                    <span className="product-detail-pricing__value">
                        {formatCurrency(product.importPrice)}
                    </span>
                </div>
                <div className="product-detail-pricing__row">
                    <span className="product-detail-pricing__label">Giá bán lẻ</span>
                    <span className="product-detail-pricing__value product-detail-pricing__value--sell">
                        {formatCurrency(product.sellPrice)}
                    </span>
                </div>
                <div className="product-detail-pricing__row product-detail-pricing__row--margin">
                    <span className="product-detail-pricing__label">Biên độ lợi nhuận</span>
                    <span className="product-detail-pricing__margin">{product.profitMargin}%</span>
                </div>
            </div>
        </section>
    );
}

export function ProductInventoryCard({ product }) {
    return (
        <section className="product-detail-card product-detail-card--compact">
            <h2 className="product-detail-card__title">Tồn kho</h2>

            <div className="product-detail-inventory-stats">
                <div className="product-detail-inventory-stat">
                    <span className="product-detail-inventory-stat__label">Tồn kho hiện tại</span>
                    <span className="product-detail-inventory-stat__value">
                        {product.stock} {product.unit.split(' ')[0].toLowerCase()}
                    </span>
                </div>
                <div className="product-detail-inventory-stat">
                    <span className="product-detail-inventory-stat__label">Định mức tồn (Min)</span>
                    <span className="product-detail-inventory-stat__value">{product.minStock}</span>
                </div>
            </div>

            <div className="product-detail-inventory-total">
                <span className="product-detail-inventory-total__label">Tổng giá trị tồn kho</span>
                <span className="product-detail-inventory-total__value">
                    {formatCurrency(product.inventoryValue)}
                </span>
            </div>
        </section>
    );
}
