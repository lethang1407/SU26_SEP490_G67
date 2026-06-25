import { Link } from 'react-router-dom';
import { PRODUCT_ROUTES } from '../constants';
import { getProductStatusLabel } from '../api/productMockData';

export default function ProductDetailHeader({ product, onBack, onDelete, onEdit }) {
    const isOutOfStock = product.stock === 0;

    return (
        <div className="product-detail-header">
            <nav className="product-breadcrumb" aria-label="Breadcrumb">
                <Link to={PRODUCT_ROUTES.list} className="product-breadcrumb__link">
                    Sản phẩm
                </Link>
                <span className="product-breadcrumb__sep">&gt;</span>
                <Link to={PRODUCT_ROUTES.list} className="product-breadcrumb__link">
                    Danh sách sản phẩm
                </Link>
                <span className="product-breadcrumb__sep">&gt;</span>
                <span className="product-breadcrumb__current">Chi tiết sản phẩm</span>
            </nav>

            <div className="product-detail-header__main">
                <div className="product-detail-header__info">
                    <div className="product-detail-header__title-row">
                        <h1 className="product-detail-header__title">
                            Chi tiết sản phẩm: {product.name}
                        </h1>
                        <span
                            className={`product-detail-header__status${
                                isOutOfStock
                                    ? ' product-detail-header__status--out-of-stock'
                                    : ' product-detail-header__status--in-stock'
                            }`}
                        >
                            {getProductStatusLabel(product.stock)}
                        </span>
                    </div>
                    <p className="product-detail-header__meta">
                        Cập nhật lần cuối: {product.lastUpdated}
                    </p>
                </div>

                <div className="product-detail-header__actions">
                    <button
                        type="button"
                        className="product-btn product-btn--secondary"
                        onClick={onBack}
                    >
                        Quay lại
                    </button>
                    <button
                        type="button"
                        className="product-btn product-btn--danger"
                        onClick={onDelete}
                    >
                        Xóa
                    </button>
                    <button
                        type="button"
                        className="product-btn product-btn--primary"
                        onClick={onEdit}
                    >
                        Chỉnh sửa
                    </button>
                </div>
            </div>
        </div>
    );
}
