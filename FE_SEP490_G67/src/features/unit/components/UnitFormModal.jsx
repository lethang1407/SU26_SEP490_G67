import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export default function UnitFormModal({ open, mode = 'create', initialData, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      setName(mode === 'edit' && initialData ? initialData.name || '' : '');
    }
  }, [open, mode, initialData]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập tên đơn vị tính.');
      return;
    }

    onSubmit?.({ name: trimmed });
  };

  return (
    <div className="unit-modal-backdrop" onClick={onClose}>
      <div className="unit-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="unit-modal-header">
          <h2 className="unit-modal-title">
            {mode === 'edit' ? 'Chỉnh sửa đơn vị tính' : 'Thêm đơn vị tính mới'}
          </h2>
          <button type="button" className="unit-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="unit-modal-body">
            {errorMsg && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="unit-form-group">
              <label className="unit-form-label">Tên đơn vị tính *</label>
              <input
                type="text"
                className="unit-form-input"
                placeholder="VD: Thùng, Hộp, Chai, Lon, Gói, Lốc..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <span className="unit-form-hint">
                Tên đơn vị tính dùng để chọn khi tạo sản phẩm hoặc thiết lập quy đổi.
              </span>
            </div>
          </div>

          <div className="unit-modal-footer">
            <button type="button" className="cat-btn cat-btn--ghost" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="cat-btn cat-btn--primary">
              <Save size={15} />
              {mode === 'edit' ? 'Lưu thay đổi' : 'Thêm đơn vị'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
