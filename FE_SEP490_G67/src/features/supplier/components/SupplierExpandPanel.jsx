import { useCallback, useEffect, useState } from 'react';
import SupplierDetailTabs from './SupplierDetailTabs';
import SupplierPaymentModal from './SupplierPaymentModal';
import SupplierAddNewModal from './SupplierAddNewModal';
import SupplierDeleteConfirmModal from './SupplierDeleteConfirmModal';
import { suppliersApi } from '../api';

export default function SupplierExpandPanel({
    supplierId,
    listDebt,
    onPaymentSuccess,
    onUpdated,
    onDeleted,
}) {
    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [submittingEdit, setSubmittingEdit] = useState(false);
    const [editError, setEditError] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [refreshToken, setRefreshToken] = useState(0);

    const fetchSupplier = useCallback((options = {}) => {
        const silent = options.silent === true;
        if (!silent) {
            setLoading(true);
            setError(false);
        }
        suppliersApi
            .getSupplierById(supplierId)
            .then((detail) => {
                if (!detail) {
                    if (!silent) {
                        setError(true);
                        setSupplier(null);
                    }
                    return;
                }
                setSupplier(detail);
            })
            .catch(() => {
                if (!silent) {
                    setError(true);
                    setSupplier(null);
                }
            })
            .finally(() => {
                if (!silent) setLoading(false);
            });
    }, [supplierId]);

    useEffect(() => {
        fetchSupplier();
    }, [fetchSupplier]);

    const currentDebt = supplier?.currentDebt ?? listDebt ?? 0;
    const canPayDebt = currentDebt > 0;

    const handlePaymentSubmit = ({ orderId, orderCode, amount, paymentMethod, notes }) => {
        setSubmittingPayment(true);
        setPaymentError('');
        suppliersApi
            .createPayment(supplierId, { orderId, amount, paymentMethod, note: notes })
            .then(() => {
                setPaymentOpen(false);
                fetchSupplier({ silent: true });
                setRefreshToken((token) => token + 1);
                onPaymentSuccess?.({ orderCode, amount, paymentMethod, notes });
            })
            .catch((err) => {
                setPaymentError(err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
            })
            .finally(() => setSubmittingPayment(false));
    };

    const handleEditSubmit = (payload) => {
        setSubmittingEdit(true);
        setEditError('');
        suppliersApi
            .updateSupplier(supplierId, payload)
            .then((updated) => {
                setEditOpen(false);
                setSupplier(updated);
                onUpdated?.(updated);
            })
            .catch((err) => {
                setEditError(err.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
            })
            .finally(() => setSubmittingEdit(false));
    };

    const handleDeleteClick = () => {
        setDeleteError('');
        setDeleteOpen(true);
    };

    const handleDeleteConfirm = () => {
        setDeleting(true);
        setDeleteError('');
        suppliersApi
            .deleteSupplier(supplierId)
            .then(() => {
                setDeleteOpen(false);
                onDeleted?.(supplierId);
            })
            .catch((err) => {
                setDeleteError(err.response?.data?.message || 'Xóa thất bại. Vui lòng thử lại.');
            })
            .finally(() => setDeleting(false));
    };

    if (loading) {
        return (
            <div
                className="supplier-expand-panel supplier-expand-panel--skeleton"
                aria-busy="true"
                aria-label="Đang tải chi tiết nhà cung cấp"
            >
                <div className="supplier-expand-skeleton__tabs">
                    <span className="supplier-skeleton supplier-skeleton--tab" />
                    <span className="supplier-skeleton supplier-skeleton--tab" />
                    <span className="supplier-skeleton supplier-skeleton--tab" />
                    <span className="supplier-skeleton supplier-skeleton--btn" />
                </div>
                <div className="supplier-expand-skeleton__body">
                    <span className="supplier-skeleton supplier-skeleton--block" />
                    <span className="supplier-skeleton supplier-skeleton--block" />
                    <span className="supplier-skeleton supplier-skeleton--block supplier-skeleton--short" />
                </div>
            </div>
        );
    }

    if (error || !supplier) {
        return (
            <div className="supplier-expand-panel supplier-expand-panel--state">
                <p>Không tải được thông tin nhà cung cấp.</p>
            </div>
        );
    }

    return (
        <div className="supplier-expand-panel">
            <SupplierDetailTabs
                supplier={supplier}
                refreshToken={refreshToken}
                canPayDebt={canPayDebt}
                onPayDebt={() => {
                    setPaymentError('');
                    setPaymentOpen(true);
                }}
                onEdit={() => {
                    setEditError('');
                    setEditOpen(true);
                }}
                onDelete={handleDeleteClick}
                deleting={deleting}
            />

            <SupplierPaymentModal
                open={paymentOpen}
                supplier={supplier}
                submitting={submittingPayment}
                submitError={paymentError}
                onClose={() => setPaymentOpen(false)}
                onSubmit={handlePaymentSubmit}
            />

            <SupplierAddNewModal
                open={editOpen}
                mode="edit"
                initialSupplier={supplier}
                submitting={submittingEdit}
                submitError={editError}
                onClose={() => setEditOpen(false)}
                onSubmit={handleEditSubmit}
            />

            <SupplierDeleteConfirmModal
                open={deleteOpen}
                supplierName={supplier.name}
                currentDebt={currentDebt}
                submitting={deleting}
                error={deleteError}
                onClose={() => {
                    if (!deleting) setDeleteOpen(false);
                }}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
}
