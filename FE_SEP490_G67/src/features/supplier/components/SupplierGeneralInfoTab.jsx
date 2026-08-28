import SupplierContactCard from './SupplierContactCard';

function getCategoryLabel(category) {
    if (!category) return '';
    if (typeof category === 'string') return category;
    return category.name || '';
}

function getCategoryKey(category, index) {
    if (typeof category === 'string') return category;
    return category.id ?? category.name ?? index;
}

export default function SupplierGeneralInfoTab({ supplier }) {
    return (
        <div className="supplier-detail-tab-content">
            <div className="supplier-detail-info-grid">
                <SupplierContactCard supplier={supplier} />

                <div className="supplier-detail-card">
                    <h3 className="supplier-detail-card__title">Chuyên cung cấp</h3>
                    {supplier.categories?.length > 0 ? (
                        <div className="supplier-tag-list">
                            {supplier.categories.map((category, index) => (
                                <span key={getCategoryKey(category, index)} className="supplier-tag">
                                    {getCategoryLabel(category)}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="supplier-detail-empty-text">Chưa ghi danh mục hàng hóa.</p>
                    )}
                </div>
            </div>

            <div className="supplier-detail-card">
                <h3 className="supplier-detail-card__title">Ghi chú nội bộ</h3>
                <p className="supplier-detail-notes">
                    {supplier.notes || 'Không có ghi chú.'}
                </p>
            </div>
        </div>
    );
}
