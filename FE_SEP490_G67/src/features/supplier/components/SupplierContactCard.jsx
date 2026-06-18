export default function SupplierContactCard({ supplier }) {
    return (
        <div className="supplier-detail-card">
            <h3 className="supplier-detail-card__title">Thông tin liên hệ</h3>
            <dl className="supplier-detail-dl">
                <div className="supplier-detail-dl__row">
                    <dt>Người liên hệ</dt>
                    <dd>{supplier.contactPerson || '—'}</dd>
                </div>
                <div className="supplier-detail-dl__row">
                    <dt>Số điện thoại</dt>
                    <dd>{supplier.phoneNumber || '—'}</dd>
                </div>
                <div className="supplier-detail-dl__row">
                    <dt>Địa chỉ</dt>
                    <dd>{supplier.address || '—'}</dd>
                </div>
            </dl>
        </div>
    );
}
