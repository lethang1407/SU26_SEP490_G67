import { formatCurrency, formatDate } from '../utils/importOrderUtils';
import ImportOrderStatusBadge from './ImportOrderStatusBadge';

export default function ImportOrderDetailInfo({ order }) {
    if (!order) {
        return null;
    }

    return (
        <section className="import-order-side-card">
            <h3 className="import-order-side-card__title">Thông tin phiếu</h3>
            <dl className="import-order-info-list">
                <div className="import-order-info-list__item">
                    <dt>Mã đơn</dt>
                    <dd>{order.orderCode}</dd>
                </div>
                <div className="import-order-info-list__item">
                    <dt>Nhà cung cấp</dt>
                    <dd>{order.supplierName}</dd>
                </div>
                <div className="import-order-info-list__item">
                    <dt>Thời gian nhập</dt>
                    <dd>{formatDate(order.receivedDate)}</dd>
                </div>
                <div className="import-order-info-list__item">
                    <dt>Người tạo</dt>
                    <dd>{order.createdByName || '—'}</dd>
                </div>
                <div className="import-order-info-list__item">
                    <dt>Trạng thái</dt>
                    <dd>
                        <ImportOrderStatusBadge status={order.status} />
                    </dd>
                </div>
                <div className="import-order-info-list__item">
                    <dt>Tổng tiền hàng</dt>
                    <dd className="import-order-info-list__amount">
                        {formatCurrency(order.goodsTotal ?? order.totalCost)}
                    </dd>
                </div>
                {Number(order.returnDeductionAmount) > 0 ? (
                    <div className="import-order-info-list__item">
                        <dt>Trừ hàng trả NCC</dt>
                        <dd className="import-order-info-list__amount">
                            −{formatCurrency(order.returnDeductionAmount)}
                        </dd>
                    </div>
                ) : null}
                {Number(order.supplierRefundAmount) > 0 ? (
                    <div className="import-order-info-list__item">
                        <dt>NCC trả lại</dt>
                        <dd className="import-order-info-list__amount">
                            {formatCurrency(order.supplierRefundAmount)}
                        </dd>
                    </div>
                ) : (
                    <div className="import-order-info-list__item">
                        <dt>Cần trả NCC</dt>
                        <dd className="import-order-info-list__amount">{formatCurrency(order.totalCost)}</dd>
                    </div>
                )}
            </dl>
        </section>
    );
}
