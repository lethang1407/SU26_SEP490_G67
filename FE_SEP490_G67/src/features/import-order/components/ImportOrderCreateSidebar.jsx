import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Plus, Search, X } from 'lucide-react';
import { suppliersApi } from '../../supplier/api';
import { formatCurrency, formatMoneyInput, parseMoneyInput } from '../utils/importOrderUtils';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function mapSupplierOption(item) {
    return {
        id: item.id,
        supplierCode: item.supplierCode,
        name: item.name,
        phoneNumber: item.phoneNumber || '',
        notes: item.notes || '',
    };
}

export default function ImportOrderCreateSidebar({
    supplier,
    suppliers = [],
    suppliersLoading = false,
    note,
    invoiceImageUrl = '',
    invoiceImageName = '',
    uploadingInvoiceImage = false,
    totalAmount,
    discountAmount,
    returnDeductionAmount = 0,
    amountDue,
    supplierRefundAmount = 0,
    paidAmount,
    debtAmount,
    submitting,
    importItemCount = 0,
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
    const [nameMatches, setNameMatches] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const supplierRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (supplierRef.current && !supplierRef.current.contains(event.target)) {
                setSupplierOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const trimmed = supplierKeyword.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) {
            setNameMatches([]);
            setSearchLoading(false);
            return undefined;
        }

        const currentRequestId = ++requestIdRef.current;
        setSearchLoading(true);

        const timer = setTimeout(async () => {
            try {
                const supplierPage = await suppliersApi.getSuppliers({
                    search: trimmed,
                    page: 0,
                    size: 8,
                });
                if (currentRequestId !== requestIdRef.current) return;
                setNameMatches((supplierPage?.content || []).map(mapSupplierOption));
            } catch {
                if (currentRequestId !== requestIdRef.current) return;
                setNameMatches([]);
            } finally {
                if (currentRequestId === requestIdRef.current) {
                    setSearchLoading(false);
                }
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [supplierKeyword]);

    const handleSelectSupplier = (item) => {
        onSelectSupplier(item);
        setSupplierKeyword('');
        setSupplierOpen(false);
    };

    const idleResults = useMemo(() => suppliers.slice(0, 5), [suppliers]);
    const isQuerying = supplierKeyword.trim().length >= MIN_QUERY_LENGTH;
    const showDropdown = supplierOpen && !supplier;

    return (
        <aside className="ioc-sidebar">
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
                            {showDropdown && (
                                <div className="ioc-sidebar__dropdown">
                                    {isQuerying ? (
                                        searchLoading ? (
                                            <div className="ioc-sidebar__empty">Đang tìm...</div>
                                        ) : nameMatches.length === 0 ? (
                                            <div className="ioc-sidebar__empty">
                                                Không tìm thấy nhà cung cấp
                                            </div>
                                        ) : (
                                            nameMatches.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className="ioc-sidebar__option"
                                                    onMouseDown={(event) => {
                                                        event.preventDefault();
                                                        handleSelectSupplier(item);
                                                    }}
                                                >
                                                    <strong>{item.name}</strong>
                                                    <span>{item.supplierCode}</span>
                                                </button>
                                            ))
                                        )
                                    ) : suppliersLoading ? (
                                        <div className="ioc-sidebar__empty">Đang tải NCC...</div>
                                    ) : idleResults.length === 0 ? (
                                        <div className="ioc-sidebar__empty">Không tìm thấy NCC</div>
                                    ) : (
                                        idleResults.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className="ioc-sidebar__option"
                                                onMouseDown={(event) => {
                                                    event.preventDefault();
                                                    handleSelectSupplier(item);
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

            <div className="ioc-sidebar__summary">
                <div className="ioc-sidebar__summary-row">
                    <span>Tổng hàng nhập{importItemCount > 0 ? ` (${importItemCount})` : ''}</span>
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

                {returnDeductionAmount > 0 ? (
                    <div className="ioc-sidebar__summary-row ioc-sidebar__summary-row--return">
                        <span>Trừ hàng trả NCC</span>
                        <strong>−{formatCurrency(returnDeductionAmount)}</strong>
                    </div>
                ) : null}

                {supplierRefundAmount > 0 ? (
                    <div className="ioc-sidebar__summary-row ioc-sidebar__summary-row--emphasis ioc-sidebar__summary-row--refund">
                        <span>NCC trả lại</span>
                        <strong>{formatCurrency(supplierRefundAmount)}</strong>
                    </div>
                ) : (
                    <div className="ioc-sidebar__summary-row ioc-sidebar__summary-row--emphasis">
                        <span>Cần trả nhà cung cấp</span>
                        <strong>{formatCurrency(amountDue)}</strong>
                    </div>
                )}

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
                <label className="ioc-sidebar__label">Ảnh hóa đơn</label>
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
