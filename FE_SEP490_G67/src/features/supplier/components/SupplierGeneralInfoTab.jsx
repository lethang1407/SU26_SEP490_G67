import SupplierContactCard from './SupplierContactCard';

export default function SupplierGeneralInfoTab({ supplier }) {
    return (
        <div className="supplier-detail-tab-content">
            <SupplierContactCard supplier={supplier} />

            <div className="supplier-detail-card">
                <h3 className="supplier-detail-card__title">Chuyên cung cấp</h3>
                {supplier.categories?.length > 0 ? (
                    <div className="supplier-tag-list">
                        {supplier.categories.map((category) => (
                            <span key={category} className="supplier-tag">
                                {category}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="supplier-detail-empty-text">Chưa ghi danh mục hàng hóa.</p>
                )}
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
