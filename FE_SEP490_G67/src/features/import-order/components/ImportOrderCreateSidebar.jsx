import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Plus, Search, X } from 'lucide-react';
import { ORDER_STATUS_LABEL } from '../constants';
import { formatCurrency, formatMoneyInput, parseMoneyInput } from '../utils/importOrderUtils';

export default function ImportOrderCreateSidebar({
    supplier,
    suppliers = [],
    suppliersLoading = false,
    orderCode = '',
    creatorName = '',
    note,
    invoiceImageUrl = '',
    invoiceImageName = '',
    uploadingInvoiceImage = false,
    totalAmount,
    discountAmount,
    amountDue,
    paidAmount,
    debtAmount,
    orderStatus,
    submitting,
    onSelectSupplier,
    onClearSupplier,
    onOpenAddSupplier,
    onNoteChange,
    onInvoiceImageChange,
    onClearInvoiceImage,
    onDiscountAmountChange,
    onPaidAmountChange,
    onSaveDraft,
    onComplete,
    onCancelDraft,
    showCancelDraft = false,
}) {
    const [supplierKeyword, setSupplierKeyword] = useState('');
    const [supplierOpen, setSupplierOpen] = useState(false);
    const supplierRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (supplierRef.current && !supplierRef.current.contains(event.target)) {
                setSupplierOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const supplierResults = useMemo(() => {
        const q = supplierKeyword.trim().toLowerCase();
        if (!q) return suppliers.slice(0, 5);
        return suppliers
            .filter(
                (item) =>
                    item.name.toLowerCase().includes(q) || item.supplierCode.toLowerCase().includes(q),
            )
            .slice(0, 5);
    }, [supplierKeyword, suppliers]);

    return (
        <aside className="ioc-sidebar">
            <div className="ioc-sidebar__meta">
                <span>
                    Người lập: <strong>{creatorName || '—'}</strong>
                </span>
            </div>

            <div className="ioc-sidebar__field" ref={supplierRef}>
                <label className="ioc-sidebar__label">Nhà cung cấp</label>
                {supplier ? (
                    <div className="ioc-sidebar__selected">
                        <div>
                            <strong>{supplier.name}</strong>
                            <div className="ioc-sidebar__selected-code">{supplier.supplierCode}</div>
                        </div>
                        <button
                            type="button"
                            className="ioc-sidebar__clear"
                            onClick={onClearSupplier}
                            aria-label="Bỏ chọn nhà cung cấp"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="ioc-sidebar__supplier-row">
                        <div className="ioc-sidebar__search">
                            <Search size={16} className="ioc-sidebar__search-icon" />
                            <input
                                type="text"
                                placeholder="Tìm nhà cung cấp..."
                                value={supplierKeyword}
                                onChange={(event) => {
                                    setSupplierKeyword(event.target.value);
                                    setSupplierOpen(true);
                                }}
                                onFocus={() => setSupplierOpen(true)}
                            />
                            {supplierOpen && (
                                <div className="ioc-sidebar__dropdown">
                                    {suppliersLoading ? (
                                        <div className="ioc-sidebar__empty">Đang tải NCC...</div>
                                    ) : supplierResults.length === 0 ? (
                                        <div className="ioc-sidebar__empty">Không tìm thấy NCC</div>
                                    ) : (
                                        supplierResults.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className="ioc-sidebar__option"
                                                onMouseDown={(event) => {
                                                    event.preventDefault();
                                                    onSelectSupplier(item);
                                                    setSupplierKeyword('');
                                                    setSupplierOpen(false);
                                                }}
                                            >
                                                <strong>{item.name}</strong>
                                                <span>{item.supplierCode}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="ioc-sidebar__add-supplier"
                            onClick={onOpenAddSupplier}
                            title="Thêm nhà cung cấp mới"
                            aria-label="Thêm nhà cung cấp mới"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                )}
            </div>

            <div className="ioc-sidebar__field">
                <label className="ioc-sidebar__label">Mã phiếu nhập</label>
                <input
                    type="text"
                    className="ioc-sidebar__input"
                    value={orderCode}
                    placeholder="Mã phiếu tự động"
                    disabled
                />
            </div>

            <div className="ioc-sidebar__field">
                <label className="ioc-sidebar__label">Trạng thái</label>
                <span className={`import-order-status import-order-status--${orderStatus.toLowerCase()}`}>
                    {ORDER_STATUS_LABEL[orderStatus]}
                </span>
            </div>

            <div className="ioc-sidebar__summary">
                <div className="ioc-sidebar__summary-row">
                    <span>Tổng tiền hàng</span>
                    <strong>{formatCurrency(totalAmount)}</strong>
                </div>

                <div className="ioc-sidebar__discount-row">
                    <span>Giảm giá</span>
                    <div className="ioc-sidebar__discount-input">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={formatMoneyInput(discountAmount)}
                            onChange={(event) => onDiscountAmountChange(parseMoneyInput(event.target.value))}
                            aria-label="Giảm giá theo đơn (VND)"
                        />
                        <span className="ioc-sidebar__discount-unit">đ</span>
                    </div>
                </div>

                <div className="ioc-sidebar__summary-row ioc-sidebar__summary-row--emphasis">
                    <span>Cần trả nhà cung cấp</span>
                    <strong>{formatCurrency(amountDue)}</strong>
                </div>

                {amountDue > 0 && (
                    <>
                        <div className="ioc-sidebar__discount-row">
                            <span>Tiền trả nhà cung cấp</span>
                            <div className="ioc-sidebar__discount-input">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatMoneyInput(paidAmount)}
                                    onChange={(event) => onPaidAmountChange(parseMoneyInput(event.target.value))}
                                    aria-label="Tiền trả nhà cung cấp (VND)"
                                />
                                <span className="ioc-sidebar__discount-unit">đ</span>
                            </div>
                        </div>

                        <div className="ioc-sidebar__summary-row ioc-sidebar__summary-row--debt">
                            <span>Tính vào công nợ</span>
                            <strong>{formatCurrency(debtAmount)}</strong>
                        </div>
                    </>
                )}
            </div>

            <div className="ioc-sidebar__field">
                <label className="ioc-sidebar__label">Ghi chú</label>
                <textarea
                    className="ioc-sidebar__textarea"
                    rows={3}
                    placeholder="Ghi chú phiếu nhập..."
                    value={note}
                    onChange={(event) => onNoteChange(event.target.value)}
                />
            </div>

            <div className="ioc-sidebar__field">
                <div className="ioc-sidebar__label-row">
                    <label className="ioc-sidebar__label">Ảnh hóa đơn</label>
                    <span className="ioc-sidebar__label-optional">Không bắt buộc</span>
                </div>
                {invoiceImageUrl ? (
                    <div className="ioc-sidebar__invoice-preview">
                        <a
                            href={invoiceImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ioc-sidebar__invoice-thumb-link"
                            title="Mở ảnh gốc"
                        >
                            <img
                                src={invoiceImageUrl}
                                alt="Ảnh hóa đơn"
                                className="ioc-sidebar__invoice-thumb"
                            />
                        </a>
                        <div className="ioc-sidebar__invoice-meta">
                            <span className="ioc-sidebar__invoice-name" title={invoiceImageName}>
                                {invoiceImageName || 'Ảnh hóa đơn'}
                            </span>
                            <div className="ioc-sidebar__invoice-actions">
                                <label className="ioc-sidebar__invoice-replace">
                                    Đổi ảnh
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        hidden
                                        disabled={submitting || uploadingInvoiceImage}
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            onInvoiceImageChange?.(file || null);
                                            event.target.value = '';
                                        }}
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="ioc-sidebar__invoice-clear"
                                    disabled={submitting || uploadingInvoiceImage}
                                    onClick={onClearInvoiceImage}
                                >
                                    <X size={14} />
                                    Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <label
                        className={`ioc-sidebar__upload ${
                            uploadingInvoiceImage ? 'ioc-sidebar__upload--busy' : ''
                        }`}
                    >
                        <ImagePlus size={16} />
                        <span>
                            {uploadingInvoiceImage
                                ? 'Đang upload ảnh...'
                                : 'Chọn ảnh hóa đơn giấy'}
                        </span>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            disabled={submitting || uploadingInvoiceImage}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                onInvoiceImageChange?.(file || null);
                                event.target.value = '';
                            }}
                        />
                    </label>
                )}
                {!invoiceImageUrl && (
                    <p className="ioc-sidebar__upload-hint">Tối đa 5MB · JPG, PNG, WebP</p>
                )}
            </div>

            <div className="ioc-sidebar__actions">
                {showCancelDraft && (
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--danger-outline ioc-sidebar__btn ioc-sidebar__btn--cancel"
                        disabled={submitting}
                        onClick={onCancelDraft}
                    >
                        Hủy phiếu tạm
                    </button>
                )}
                <button
                    type="button"
                    className="supplier-btn supplier-btn--secondary ioc-sidebar__btn"
                    disabled={submitting}
                    onClick={onSaveDraft}
                >
                    Lưu tạm
                </button>
                <button
                    type="button"
                    className="supplier-btn supplier-btn--primary ioc-sidebar__btn"
                    disabled={submitting}
                    onClick={onComplete}
                >
                    Hoàn thành
                </button>
            </div>
        </aside>
    );
}
