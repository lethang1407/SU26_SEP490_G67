import { X } from 'lucide-react';
import { formatCurrency } from '../utils/supplierUtils';

export default function SupplierDeleteConfirmModal({
    open,
    supplierName,
    currentDebt = 0,
    submitting = false,
    error = '',
    onClose,
    onConfirm,
}) {
    if (!open) return null;

    const name = supplierName || 'nhà cung cấp này';
    const debt = Number(currentDebt) || 0;
    const hasDebt = debt > 0;

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-modal--confirm"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplier-delete-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="supplier-delete-title" className="supplier-modal__title">
                        Xóa nhà cung cấp
                    </h2>
                    <button
                        type="button"
                        className="supplier-modal__close"
                        onClick={onClose}
                        aria-label="Đóng"
                        disabled={submitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body supplier-modal__body--confirm">
                    {error && <p className="supplier-modal__error">{error}</p>}

                    {hasDebt ? (
                        <p className="supplier-modal__confirm-text">
                            Không thể xóa nhà cung cấp <strong>{name}</strong> vì còn công nợ{' '}
                            <strong className="supplier-modal__confirm-debt">{formatCurrency(debt)}</strong>.
                            Vui lòng thanh toán hết trước khi xóa.
                        </p>
                    ) : (
                        <p className="supplier-modal__confirm-text">
                            Bạn có chắc muốn <strong>xóa</strong> nhà cung cấp <strong>{name}</strong> khỏi
                            danh sách? Lịch sử nhập hàng và thanh toán (nếu có) vẫn được giữ.
                        </p>
                    )}
                </div>

                <div className="supplier-modal__footer">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        {hasDebt ? 'Đóng' : 'Bỏ qua'}
                    </button>
                    {!hasDebt && (
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--primary"
                            onClick={onConfirm}
                            disabled={submitting}
                        >
                            {submitting ? 'Đang xóa...' : 'Đồng ý'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
