import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { formatMoneyInput, formatMoneyPlain, parseMoneyInput } from '../utils/importOrderUtils';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

export default function ImportOrderPriceSetupModal({
    open,
    rows = [],
    submitting = false,
    onClose,
    onConfirm,
}) {
    const [draftRows, setDraftRows] = useState([]);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;

    useEffect(() => {
        if (!open) return;
        setDraftRows((rowsRef.current || []).map((row) => ({ ...row })));
    }, [open]);

    if (!open) return null;

    const handlePriceChange = (key, text) => {
        const nextPrice = parseMoneyInput(text);
        setDraftRows((prev) =>
            prev.map((row) => (row.key === key ? { ...row, commonSellingPrice: nextPrice } : row)),
        );
    };

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal ioc-price-setup-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ioc-price-setup-title"
            >
                <div className="supplier-modal__header ioc-price-setup-modal__header">
                    <div>
                        <h2 id="ioc-price-setup-title" className="supplier-modal__title">
                            Thiết lập giá cho hàng nhập
                        </h2>
                        <p className="ioc-price-setup-modal__hint">
                            Sửa cột Giá bán mới theo từng đơn vị tính, rồi bấm Xong.
                            Số vừa sửa được giữ trên phiếu này; giá bán hệ thống chỉ đổi khi Hoàn thành.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="supplier-modal__close"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body ioc-price-setup-modal__body">
                    <div className="ioc-price-setup-modal__table-wrap">
                        <table className="ioc-price-setup-table">
                            <colgroup>
                                <col className="ioc-price-setup-table__col-name" />
                                <col className="ioc-price-setup-table__col-price" />
                                <col className="ioc-price-setup-table__col-price" />
                                <col className="ioc-price-setup-table__col-price" />
                                <col className="ioc-price-setup-table__col-price" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Tên hàng</th>
                                    <th>Giá nhập cuối</th>
                                    <th>Giá nhập hiện tại</th>
                                    <th>Giá bán hiện tại</th>
                                    <th>Giá bán mới</th>
                                </tr>
                            </thead>
                            <tbody>
                                {draftRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="ioc-price-setup-table__empty">
                                            Chưa có hàng trên phiếu để thiết lập giá.
                                        </td>
                                    </tr>
                                ) : (
                                    draftRows.map((row) => (
                                        <tr key={row.key}>
                                            <td>
                                                <div className="ioc-price-setup-table__name">
                                                    {row.productName}
                                                </div>
                                                <div className="ioc-price-setup-table__unit">
                                                    ({row.unitName})
                                                </div>
                                            </td>
                                            <td>{formatMoneyPlain(row.lastImportPrice)}</td>
                                            <td>{formatMoneyPlain(row.currentImportPrice)}</td>
                                            <td>{formatMoneyPlain(row.currentSellingPrice)}</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    className="ioc-price-setup-table__input"
                                                    value={formatMoneyInput(row.commonSellingPrice)}
                                                    onChange={(event) =>
                                                        handlePriceChange(row.key, event.target.value)
                                                    }
                                                    aria-label={`Giá bán mới ${row.productName} ${row.unitName}`}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="supplier-modal__footer">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Bỏ qua
                    </button>
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary"
                        onClick={() => onConfirm?.(draftRows)}
                        disabled={submitting || draftRows.length === 0}
                    >
                        Xong
                    </button>
                </div>
            </div>
        </div>
    );
}
