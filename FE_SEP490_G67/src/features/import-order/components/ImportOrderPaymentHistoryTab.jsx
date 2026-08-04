import { useCallback, useEffect, useState } from 'react';
import SupplierPagination from '../../supplier/components/SupplierPagination';
import { PAYMENT_METHOD_LABEL } from '../../supplier/constants';
import { importOrdersApi } from '../api';
import { formatCurrency, formatDateTime } from '../utils/importOrderUtils';

const PAGE_SIZE = 5;

const EMPTY_PAGE = {
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
};

export default function ImportOrderPaymentHistoryTab({ orderId }) {
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(true);

    const fetchPayments = useCallback(() => {
        if (!orderId) return;
        setLoading(true);
        importOrdersApi
            .getImportOrderPayments(orderId, { page: page - 1, size: PAGE_SIZE })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => setData(EMPTY_PAGE))
            .finally(() => setLoading(false));
    }, [orderId, page]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    useEffect(() => {
        setPage(1);
    }, [orderId]);

    const totalItems = data.totalElements ?? 0;
    const startIndex = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endIndex = Math.min(page * PAGE_SIZE, totalItems);

    return (
        <div className="import-order-payment-tab">
            <div className="import-order-expand__table-wrap">
                <table className="import-order-expand__table import-order-payment-tab__table">
                    <thead>
                        <tr>
                            <th>Mã giao dịch</th>
                            <th>Ngày giao dịch</th>
                            <th className="import-order-expand__col-num">Số tiền</th>
                            <th>Hình thức</th>
                            <th className="import-order-expand__col-num">Nợ còn lại</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="import-order-expand__empty-cell">
                                    Đang tải lịch sử thanh toán...
                                </td>
                            </tr>
                        ) : data.content.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="import-order-expand__empty-cell">
                                    Chưa có lịch sử thanh toán cho phiếu này.
                                </td>
                            </tr>
                        ) : (
                            data.content.map((payment) => (
                                <tr key={payment.id}>
                                    <td>
                                        <span className="import-order-expand__sku">
                                            {payment.paymentCode || '—'}
                                        </span>
                                    </td>
                                    <td className="import-order-payment-tab__nowrap">
                                        {formatDateTime(payment.paymentDate)}
                                    </td>
                                    <td className="import-order-expand__col-num import-order-expand__col-total">
                                        {formatCurrency(payment.amount)}
                                    </td>
                                    <td>
                                        {PAYMENT_METHOD_LABEL[payment.paymentMethod] ||
                                            payment.paymentMethod ||
                                            '—'}
                                    </td>
                                    <td className="import-order-expand__col-num">
                                        {payment.remainingDebtAfter != null
                                            ? formatCurrency(payment.remainingDebtAfter)
                                            : '—'}
                                    </td>
                                    <td className="import-order-payment-tab__note">
                                        {payment.note || '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && totalItems > 0 && (
                <SupplierPagination
                    page={page}
                    totalPages={data.totalPages ?? 1}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalItems={totalItems}
                    onPageChange={setPage}
                    itemLabel="giao dịch"
                />
            )}
        </div>
    );
}
