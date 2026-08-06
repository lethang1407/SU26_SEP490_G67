import { useState } from 'react';

export default function ProductBasicInfoCard({ product }) {
    const [copied, setCopied] = useState(false);

    const handleCopyBarcode = async () => {
        try {
            await navigator.clipboard.writeText(product.barcode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <section className="product-detail-card">
            <h2 className="product-detail-card__title">Thông tin cơ bản</h2>

            <div className="product-detail-info-grid">
                <div className="product-detail-info-item">
                    <span className="product-detail-info-item__label">Mã vạch</span>
                    <div className="product-detail-info-item__value-row">
                        <span className="product-detail-info-item__value">{product.barcode}</span>
                        <button
                            type="button"
                            className="product-detail-copy-btn"
                            onClick={handleCopyBarcode}
                        >
                            {copied ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                    </div>
                </div>
                <div className="product-detail-info-item">
                    <span className="product-detail-info-item__label">Mã sản phẩm</span>
                    <span className="product-detail-info-item__value">{product.code}</span>
                </div>
                <div className="product-detail-info-item">
                    <span className="product-detail-info-item__label">Danh mục</span>
                    <span className="product-detail-info-item__value">{product.category}</span>
                </div>
                <div className="product-detail-info-item">
                    <span className="product-detail-info-item__label">Thương hiệu</span>
                    <span className="product-detail-info-item__value">{product.brand}</span>
                </div>
                <div className="product-detail-info-item">
                    <span className="product-detail-info-item__label">Đơn vị tính</span>
                    <span className="product-detail-info-item__value">{product.unit}</span>
                </div>
                <div className="product-detail-info-item">
                    <span className="product-detail-info-item__label">Trọng lượng</span>
                    <span className="product-detail-info-item__value">{product.weight}</span>
                </div>
            </div>

            <div className="product-detail-description">
                <h3 className="product-detail-description__title">Mô tả ngắn</h3>
                <p className="product-detail-description__text">{product.description}</p>
            </div>
        </section>
    );
}
