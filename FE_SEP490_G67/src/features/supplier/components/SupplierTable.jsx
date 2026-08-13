import { Fragment } from 'react';
import SupplierExpandPanel from './SupplierExpandPanel';
import SupplierPhoneCell from './SupplierPhoneCell';
import { formatCurrency } from '../utils/supplierUtils';

const COLUMN_COUNT = 5;
const SKELETON_ROWS = 6;

function SupplierTableSkeleton() {
    return (
        <div className="supplier-table-card" aria-busy="true" aria-label="Đang tải danh sách nhà cung cấp">
            <div className="supplier-table-wrapper">
                <table className="supplier-table">
                    <thead>
                        <tr>
                            <th className="supplier-table__stt">STT</th>
                            <th>Tên nhà cung cấp</th>
                            <th>Số điện thoại</th>
                            <th>Ghi chú</th>
                            <th>Nợ cần trả hiện tại</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                            <tr key={index} className="supplier-table__skeleton-row">
                                <td>
                                    <span className="supplier-skeleton supplier-skeleton--sm" />
                                </td>
                                <td>
                                    <span className="supplier-skeleton supplier-skeleton--lg" />
                                </td>
                                <td>
                                    <span className="supplier-skeleton supplier-skeleton--md" />
                                </td>
                                <td>
                                    <span className="supplier-skeleton supplier-skeleton--xl" />
                                </td>
                                <td>
                                    <span className="supplier-skeleton supplier-skeleton--md" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function SupplierTable({
    items,
    loading,
    expandedId,
    startIndex = 1,
    onToggleExpand,
    onPaymentSuccess,
    onSupplierUpdated,
}) {
    if (loading) {
        return <SupplierTableSkeleton />;
    }

    if (items.length === 0) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Không tìm thấy nhà cung cấp phù hợp.</p>
            </div>
        );
    }

    return (
        <div className="supplier-table-card">
            <div className="supplier-table-wrapper">
                <table className="supplier-table">
                    <thead>
                        <tr>
                            <th className="supplier-table__stt">STT</th>
                            <th>Tên nhà cung cấp</th>
                            <th>Số điện thoại</th>
                            <th>Ghi chú</th>
                            <th>Nợ cần trả hiện tại</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((supplier, index) => {
                            const isExpanded = expandedId === supplier.id;
                            const noteText = supplier.notes?.trim() || '';
                            const stt = startIndex + index;

                            return (
                                <Fragment key={supplier.id}>
                                    <tr
                                        className={`supplier-table__row ${
                                            isExpanded ? 'supplier-table__row--expanded' : ''
                                        }`}
                                        onClick={() => onToggleExpand(supplier.id)}
                                        aria-expanded={isExpanded}
                                    >
                                        <td className="supplier-table__stt">{stt}</td>
                                        <td className="supplier-table__name">{supplier.name}</td>
                                        <td className="supplier-table__phone">
                                            <SupplierPhoneCell phoneNumber={supplier.phoneNumber} stopRowClick />
                                        </td>
                                        <td
                                            className={`supplier-table__notes ${
                                                noteText ? '' : 'supplier-table__notes--empty'
                                            }`}
                                            title={noteText || undefined}
                                        >
                                            {noteText || '—'}
                                        </td>
                                        <td
                                            className={`supplier-table__debt ${
                                                supplier.currentDebt > 0 ? 'supplier-table__debt--highlight' : ''
                                            }`}
                                        >
                                            {formatCurrency(supplier.currentDebt)}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="supplier-table__expand-row">
                                            <td colSpan={COLUMN_COUNT} className="supplier-table__expand-cell">
                                                <SupplierExpandPanel
                                                    supplierId={supplier.id}
                                                    listDebt={supplier.currentDebt}
                                                    onPaymentSuccess={onPaymentSuccess}
                                                    onUpdated={onSupplierUpdated}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
