import { X } from 'lucide-react';

export default function InventoryCheckUnsavedModal({
    open,
    saving = false,
    onSave,
    onStay,
    onDiscard,
}) {
    if (!open) return null;

    return (
        <div className="supplier-modal-overlay" role="presentation">
            <div
                className="supplier-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="unsaved-check-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="supplier-modal__header">
                    <h2 id="unsaved-check-title" className="supplier-modal__title">
                        Phiếu kiểm kho chưa lưu
                    </h2>
                    <button
                        type="button"
                        className="supplier-modal__close"
                        onClick={onStay}
                        aria-label="Đóng"
                        disabled={saving}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body">
                    <p className="supplier-modal__confirm-text">
                        Bạn đang có dữ liệu kiểm kho / nháp trả NCC chưa lưu. Nếu rời trang mà
                        không lưu, toàn bộ sẽ bị mất.
                    </p>
                </div>

                <div className="supplier-modal__footer inventory-check-unsaved-modal__actions">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--secondary"
                        onClick={onStay}
                        disabled={saving}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--danger-outline"
                        onClick={onDiscard}
                        disabled={saving}
                    >
                        Không lưu
                    </button>
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary"
                        onClick={onSave}
                        disabled={saving}
                    >
                        {saving ? 'Đang lưu...' : 'Lưu kiểm kho'}
                    </button>
                </div>
            </div>
        </div>
    );
}
