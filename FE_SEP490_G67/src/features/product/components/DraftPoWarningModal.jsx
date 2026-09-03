import React from 'react';
import { AlertTriangle, X, ExternalLink, ArrowRight } from 'lucide-react';
import '../../../css/Product.css';

export default function DraftPoWarningModal({
  isOpen,
  items = [],
  onConfirmAdd,
  onCancel,
  onOpenDraftPo,
}) {
  if (!isOpen || !items || items.length === 0) return null;

  const uniqueOrderIds = Array.from(new Set(items.map((i) => i.orderId).filter(Boolean)));
  const singleOrderId = uniqueOrderIds.length === 1 ? uniqueOrderIds[0] : null;
  const singleOrderCode = items.find((i) => i.orderId === singleOrderId)?.code;

  return (
    <div className="pi-modal-backdrop" onClick={onCancel} style={{ zIndex: 1100 }}>
      <div
        className="pi-modal-dialog draft-po-warning-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(560px, 95vw)',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#FFFFFF',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
          animation: 'piModalZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div
          className="pi-modal-header"
          style={{
            background: '#FFFBEB',
            borderBottom: '1px solid #FDE68A',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#D97706" />
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: '#92400E',
              }}
            >
              Sản phẩm đang có đơn tạm
            </h3>
          </div>

          <button
            type="button"
            className="pi-modal-close"
            onClick={onCancel}
            title="Đóng"
            style={{ color: '#92400E' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pi-modal-body" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontSize: 13,
              color: '#334155',
              lineHeight: 1.55,
              background: '#F8FAFC',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
            }}
          >
            Các mặt hàng dưới đây <strong>đang nằm trong đơn nhập tạm</strong> (chưa hoàn tất nhập kho). Bạn có thể mở lại đơn tạm để tiếp tục chỉnh sửa, hoặc vẫn thêm vào đơn mới nếu muốn lập thêm đợt hàng mới:
          </div>

          {/* Table List */}
          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              background: '#FFFFFF',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '8px 12px' }}>Tên sản phẩm</th>
                  <th style={{ padding: '8px 12px', width: 140 }}>Đơn tạm</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: 100 }}>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{
                      borderBottom: idx === items.length - 1 ? 'none' : '1px solid #F1F5F9',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0F172A' }}>
                      {item.name || `Sản phẩm #${item.id}`}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {item.orderId ? (
                        <button
                          type="button"
                          onClick={() => onOpenDraftPo(item.orderId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                          title="Mở đơn tạm này"
                        >
                          <span>{item.code || `Đơn #${item.orderId}`}</span>
                          <ExternalLink size={10} />
                        </button>
                      ) : (
                        <span style={{ color: '#64748B' }}>{item.code || 'Đơn tạm'}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#D97706' }}>
                      {item.qty ? `${item.qty} ${item.unitName || ''}`.trim() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="pi-modal-footer"
          style={{
            padding: '12px 18px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <button
            type="button"
            className="pi-modal-btn pi-modal-btn--secondary"
            onClick={onCancel}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              color: '#475569',
            }}
          >
            Hủy
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {singleOrderId && (
              <button
                type="button"
                className="pi-modal-btn pi-modal-btn--primary"
                onClick={() => onOpenDraftPo(singleOrderId)}
                style={{
                  background: '#004AC6',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 6,
                }}
              >
                <span>Mở đơn {singleOrderCode || `#${singleOrderId}`}</span>
                <ArrowRight size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={onConfirmAdd}
              style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                color: '#92400E',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Vẫn thêm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
