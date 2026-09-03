import { useContext, useMemo } from 'react';
import { ShoppingCart, X, FileText, User, Calendar, CheckCircle } from 'lucide-react';
import ImportPanelProductTab from './ImportPanelProductTab';
import { formatMoney, groupSuggestionsBySupplier } from '../utils/productUtils';
import { AuthContext } from '@/app/providers/AuthProvider';
import '../../../css/Product.css';

export default function ImportPanel({
  isOpen = false,
  panelItems = [],
  overrides = {},
  suggesting = false,
  supplierFallback = [],
  onChangeQty,
  onChangeSupplier,
  onChangeUnit,
  onRemove,
  onCreate,
  onClose,
  creating,
}) {
  if (!isOpen) return null;

  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user?.fullName || authContext?.user?.name || authContext?.user?.username || 'Quản trị viên';

  const qtyTotal = useMemo(() => {
    return panelItems.reduce((sum, i) => {
      const unitBase = Number(overrides[i.productId]?.unitBase ?? 1) || 1;
      const packQty = Number(overrides[i.productId]?.quantity ?? i.suggestedQty) || 0;
      return sum + Math.round(packQty * unitBase);
    }, 0);
  }, [panelItems, overrides]);

  const supplierGroups = useMemo(() => {
    return groupSuggestionsBySupplier(
      panelItems.map((item) => {
        const ov = overrides[item.productId] || {};
        const unitBase = Number(ov.unitBase ?? 1) || 1;
        const packQty = Number(ov.quantity ?? item.suggestedQty) || 0;
        const baseQty = Math.max(0, Math.round(packQty * unitBase));
        const cost = Number(ov.costPerUnit ?? item.costPerUnit) || 0;
        return {
          ...item,
          suggestedQty: baseQty,
          quantity: baseQty,
          packQty,
          unitName: ov.unitName || item.unitName || 'sp',
          unitBase,
          supplierName: ov.supplierName ?? item.supplierName ?? 'Chưa chọn NCC',
          supplierId: ov.supplierId ?? item.supplierId,
          costPerUnit: cost,
          lineTotal: baseQty * cost,
        };
      }),
    );
  }, [panelItems, overrides]);

  const totalAmount = useMemo(() => {
    return supplierGroups.reduce((s, g) => s + (g.total || 0), 0);
  }, [supplierGroups]);

  return (
    <div className="pi-modal-backdrop" onClick={onClose}>
      <div
        className="pi-modal-dialog pi-import-order-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-order-modal-title"
      >
        {/* Modal Header */}
        <div className="pi-modal-header">
          <div>
            <h2 id="import-order-modal-title" className="pi-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={20} color="#004AC6" />
              Chuẩn bị đơn nhập hàng
            </h2>
          </div>

          <button
            type="button"
            className="pi-modal-close"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pi-modal-body pi-import-modal-body">
          {suggesting ? (
            <div className="sp-loading" aria-live="polite">
              Đang tính toán gợi ý và thêm sản phẩm vào đơn…
            </div>
          ) : null}

          <ImportPanelProductTab
            items={panelItems}
            overrides={overrides}
            supplierFallback={supplierFallback}
            onChangeQty={onChangeQty}
            onChangeSupplier={onChangeSupplier}
            onChangeUnit={onChangeUnit}
            onRemove={onRemove}
          />

          {/* Thanh Tổng kết thanh toán */}
          {panelItems.length > 0 && (
            <div className="pi-payment-summary-bar">
              <div className="pi-pay-sum-left">
                <FileText size={18} color="#004AC6" />
                <span>Tổng kết thanh toán:</span>
              </div>
              <div className="pi-pay-sum-total">
                <span style={{ color: '#475569' }}>Tổng cộng:</span>
                <span className="pi-pay-grand-total">{formatMoney(totalAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pi-modal-footer pi-import-modal-footer">
          <div className="sp-summary" style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#64748B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <User size={15} color="#475569" />
              <span>Người tạo: <strong style={{ color: '#0F172A' }}>{currentUser}</strong></span>
            </div>
            <span style={{ color: '#CBD5E1' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={15} color="#475569" />
              <span>Ngày tạo: <strong style={{ color: '#0F172A' }}>Chưa lưu</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="pi-modal-btn pi-modal-btn--primary"
              onClick={onCreate}
              disabled={creating || !panelItems.length}
              style={{
                background: '#059669',
                borderColor: '#059669',
                color: '#FFFFFF',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                borderRadius: 8,
              }}
            >
              <CheckCircle size={16} />
              {creating ? 'Đang tạo đơn…' : 'Tạo đơn'}
            </button>

            <button
              type="button"
              className="pi-modal-btn pi-modal-btn--secondary"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <X size={15} />
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
