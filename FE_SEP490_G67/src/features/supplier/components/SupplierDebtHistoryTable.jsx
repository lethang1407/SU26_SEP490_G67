import { DEBT_ENTRY_LABEL, DEBT_ENTRY_TYPE } from '../constants/mockSupplierDetails';
import { formatCurrency, formatDateTime } from '../utils/supplierUtils';

const AMOUNT_CLASS = {
    [DEBT_ENTRY_TYPE.DEBT_INCREASE]: 'supplier-debt-amount--increase',
    [DEBT_ENTRY_TYPE.PAYMENT]: 'supplier-debt-amount--payment',
    [DEBT_ENTRY_TYPE.RETURN]: 'supplier-debt-amount--return',
};

function formatSignedAmount(entryType, amount) {
    const value = Number(amount) || 0;
    if (entryType === DEBT_ENTRY_TYPE.PAYMENT || entryType === DEBT_ENTRY_TYPE.RETURN) {
        return `−${new Intl.NumberFormat('vi-VN').format(value)}đ`;
    }
    return `+${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

export default function SupplierDebtHistoryTable({ items }) {
    if (!items?.length) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Chưa có lịch sử công nợ.</p>
            </div>
        );
    }

    return (
        <div className="supplier-table-card">
            <div className="supplier-table-wrapper">
                <table className="supplier-table supplier-table--detail">
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Loại</th>
                            <th>Số tiền</th>
                            <th>Tham chiếu</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((entry) => (
                            <tr key={`${entry.entryType}-${entry.id}`}>
                                <td>{formatDateTime(entry.occurredAt)}</td>
                                <td>{DEBT_ENTRY_LABEL[entry.entryType] || entry.entryType}</td>
                                <td
                                    className={`supplier-debt-amount ${
                                        AMOUNT_CLASS[entry.entryType] || ''
                                    }`}
                                >
                                    {formatSignedAmount(entry.entryType, entry.amount)}
                                </td>
                                <td>{entry.referenceCode || '—'}</td>
                                <td className="supplier-table__notes">{entry.notes || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
