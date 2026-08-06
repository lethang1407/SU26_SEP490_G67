import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatMoneyInput, parseMoneyInput } from '../utils/importOrderUtils';

export default function ImportOrderLineTable({ lines, onChangeLine, onRemoveLine }) {
    const [openNoteKey, setOpenNoteKey] = useState(null);
    const noteEditorRef = useRef(null);

    useEffect(() => {
        if (!openNoteKey) return undefined;

        const handleClickOutside = (event) => {
            if (noteEditorRef.current && !noteEditorRef.current.contains(event.target)) {
                setOpenNoteKey(null);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') setOpenNoteKey(null);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [openNoteKey]);

    return (
        <div className="ioc-lines-card">
            <div className="ioc-lines-wrapper">
                <table className="ioc-lines-table">
                    <thead>
                        <tr>
                            <th className="ioc-lines-table__stt">STT</th>
                            <th>Mã hàng</th>
                            <th>Tên hàng</th>
                            <th>ĐVT</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Hạn sử dụng</th>
                            <th>Thành tiền</th>
                            <th aria-label="Xóa" />
                        </tr>
                    </thead>
                    <tbody>
                        {lines.length === 0 && (
                            <tr>
                                <td colSpan={9} className="ioc-lines-table__empty-cell">
                                    Chưa có hàng hóa nào. Tìm và chọn sản phẩm ở ô phía trên để thêm vào phiếu.
                                </td>
                            </tr>
                        )}
                        {lines.map((line, index) => {
                            const lineTotal = (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0);
                            const hasNote = Boolean(line.note?.trim());
                            const isNoteOpen = openNoteKey === line.key;

                            return (
                                <tr key={line.key}>
                                    <td className="ioc-lines-table__stt">{index + 1}</td>
                                    <td className="ioc-lines-table__code">{line.productCode}</td>
                                    <td>
                                        <div className="ioc-lines-table__name">{line.productName}</div>
                                        <div className="ioc-line-note">
                                            <button
                                                type="button"
                                                className={`ioc-line-note__trigger ${
                                                    hasNote ? 'ioc-line-note__trigger--filled' : ''
                                                }`}
                                                onClick={() =>
                                                    setOpenNoteKey((prev) => (prev === line.key ? null : line.key))
                                                }
                                            >
                                                <span className="ioc-line-note__preview">
                                                    {hasNote ? line.note : 'Ghi chú...'}
                                                </span>
                                                <Pencil size={13} className="ioc-line-note__icon" />
                                            </button>

                                            {isNoteOpen && (
                                                <div className="ioc-line-note__popover" ref={noteEditorRef}>
                                                    <textarea
                                                        className="ioc-line-note__textarea"
                                                        rows={3}
                                                        autoFocus
                                                        placeholder="Ghi chú"
                                                        value={line.note}
                                                        onChange={(event) =>
                                                            onChangeLine(line.key, { note: event.target.value })
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="ioc-lines-table__input ioc-lines-table__input--unit"
                                            value={line.unit}
                                            onChange={(event) =>
                                                onChangeLine(line.key, { unit: event.target.value })
                                            }
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min="1"
                                            className="ioc-lines-table__input ioc-lines-table__input--qty"
                                            value={line.quantity}
                                            onChange={(event) =>
                                                onChangeLine(line.key, {
                                                    quantity: Math.max(1, Number(event.target.value) || 1),
                                                })
                                            }
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="ioc-lines-table__input ioc-lines-table__input--price"
                                            value={formatMoneyInput(line.costPerUnit)}
                                            onChange={(event) =>
                                                onChangeLine(line.key, {
                                                    costPerUnit: parseMoneyInput(event.target.value),
                                                })
                                            }
                                            aria-label="Đơn giá (VND)"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="date"
                                            className="ioc-lines-table__input ioc-lines-table__input--date"
                                            value={line.expiryDate}
                                            onChange={(event) =>
                                                onChangeLine(line.key, { expiryDate: event.target.value })
                                            }
                                        />
                                    </td>
                                    <td className="ioc-lines-table__total">{formatCurrency(lineTotal)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="ioc-lines-table__remove"
                                            onClick={() => onRemoveLine(line.key)}
                                            title="Xóa dòng"
                                            aria-label={`Xóa ${line.productName}`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
