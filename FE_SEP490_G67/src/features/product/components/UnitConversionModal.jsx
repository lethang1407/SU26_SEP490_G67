import { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, Plus } from 'lucide-react';
import { productsApi } from '../api';
import '../../../css/Product.css';

const COMMON_CONVERSION_UNITS = [
  'Thùng',
  'Hộp',
  'Lốc',
  'Két',
  'Bao',
  'Khay',
  'Vỉ',
  'Chục',
  'Cây',
  'Kg',
];

export default function UnitConversionModal({
  isOpen,
  onClose,
  product,
  onUnitUpdated,
}) {
  const [baseUnit, setBaseUnit] = useState('Cái');
  const [fromUnit, setFromUnit] = useState('Thùng');
  const [customFromUnit, setCustomFromUnit] = useState('');
  const [rate, setRate] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [conversions, setConversions] = useState([]);
  const [fullProduct, setFullProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setErrorMsg('');
      setSuccessMsg('');
      setRate('');
      setSellPrice('');
      setFromUnit('Thùng');
      setCustomFromUnit('');

      // Fetch fresh detail from backend to get accurate units array
      productsApi.getById(product.id)
        .then((detail) => {
          if (detail) {
            setFullProduct(detail);
            const units = Array.isArray(detail.units) ? detail.units : [];
            const base = units.find((u) => u.isBase || Number(u.unitBase) === 1) || units[0];
            const baseName = base?.name || detail.baseUnitName || product.unitName || 'Cái';
            setBaseUnit(baseName);

            const convList = units
              .filter((u) => u !== base && Number(u.unitBase) !== 1)
              .map((u) => ({
                id: u.id,
                name: u.name,
                unitBase: Number(u.unitBase),
                sellingPrice: u.sellingPrice || 0,
              }));
            setConversions(convList);
          }
        })
        .catch(() => {
          setFullProduct(product);
          setBaseUnit(product.unitName || product.baseUnitName || 'Cái');
          setConversions([]);
        });
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const resolvedUnitName = fromUnit === 'custom' ? customFromUnit.trim() : fromUnit;

  const handleAddConversion = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!resolvedUnitName) {
      setErrorMsg('Vui lòng chọn hoặc nhập tên đơn vị quy đổi.');
      return;
    }
    if (resolvedUnitName.toLowerCase() === baseUnit.toLowerCase()) {
      setErrorMsg(`Đơn vị quy đổi không được trùng với đơn vị gốc (${baseUnit}).`);
      return;
    }
    const numRate = Number(rate);
    if (!rate || isNaN(numRate) || numRate <= 0) {
      setErrorMsg('Tỷ lệ quy đổi phải là số lớn hơn 0.');
      return;
    }
    if (conversions.some((c) => c.name.toLowerCase() === resolvedUnitName.toLowerCase())) {
      setErrorMsg(`Đơn vị "${resolvedUnitName}" đã tồn tại trong danh sách quy đổi.`);
      return;
    }

    const newConv = {
      name: resolvedUnitName,
      unitBase: numRate,
      sellingPrice: sellPrice ? Number(sellPrice) : 0,
      isBase: false,
    };

    const nextConversions = [...conversions, newConv];

    // Build full units array matching UpsertProductRequest.UnitRequest
    const allUnits = [
      {
        name: baseUnit,
        unitBase: 1,
        sellingPrice: fullProduct?.sellingPrice || product.sellingPrice || 0,
        isBase: true,
      },
      ...nextConversions.map((c) => ({
        name: c.name,
        unitBase: Number(c.unitBase),
        sellingPrice: Number(c.sellingPrice) || 0,
        isBase: false,
      })),
    ];

    setSaving(true);
    try {
      const payload = {
        name: fullProduct?.name || product.name,
        sku: fullProduct?.sku || product.sku,
        barcode: fullProduct?.barcode || product.barcode || '',
        categoryId: fullProduct?.categoryId || product.categoryId,
        costPrice: fullProduct?.costPrice || product.costPrice || 0,
        sellingPrice: fullProduct?.sellingPrice || product.sellingPrice || 0,
        units: allUnits,
      };

      await productsApi.update(product.id, payload);
      setConversions(nextConversions);
      setRate('');
      setSellPrice('');
      if (fromUnit === 'custom') setCustomFromUnit('');
      setSuccessMsg(`Đã thêm đơn vị quy đổi "${resolvedUnitName}" thành công!`);
      onUnitUpdated?.(product.id);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || 'Không thể lưu đơn vị quy đổi. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConversion = async (convToDelete) => {
    const nextConversions = conversions.filter((c) => c !== convToDelete && c.name !== convToDelete.name);

    const allUnits = [
      {
        name: baseUnit,
        unitBase: 1,
        sellingPrice: fullProduct?.sellingPrice || product.sellingPrice || 0,
        isBase: true,
      },
      ...nextConversions.map((c) => ({
        name: c.name,
        unitBase: Number(c.unitBase),
        sellingPrice: Number(c.sellingPrice) || 0,
        isBase: false,
      })),
    ];

    try {
      const payload = {
        name: fullProduct?.name || product.name,
        sku: fullProduct?.sku || product.sku,
        barcode: fullProduct?.barcode || product.barcode || '',
        categoryId: fullProduct?.categoryId || product.categoryId,
        costPrice: fullProduct?.costPrice || product.costPrice || 0,
        sellingPrice: fullProduct?.sellingPrice || product.sellingPrice || 0,
        units: allUnits,
      };

      await productsApi.update(product.id, payload);
      setConversions(nextConversions);
      setSuccessMsg(`Đã xóa đơn vị quy đổi "${convToDelete.name}".`);
      onUnitUpdated?.(product.id);
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể xóa đơn vị quy đổi.');
    }
  };

  return (
    <div className="pi-modal-backdrop" onClick={onClose}>
      <div className="pi-modal-dialog pi-unit-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pi-modal-header">
          <div>
            <h2 className="pi-modal-title">Quản lý quy đổi đơn vị</h2>
            <div className="pi-modal-subtitle">
              Sản phẩm: <strong>{product.name}</strong> ({product.sku || `SP${product.id}`})
            </div>
          </div>
          <button type="button" className="pi-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Body (2 columns layout matching Image 1) */}
        <div className="pi-modal-body pi-unit-modal-body">
          {/* Left Column: Form Thêm quy đổi mới */}
          <div className="pi-unit-col-left">
            <h3 className="pi-unit-section-title">Thêm quy đổi mới</h3>

            {errorMsg && <div className="pi-unit-alert-error">{errorMsg}</div>}
            {successMsg && <div className="pi-unit-alert-success">{successMsg}</div>}

            <div className="pi-unit-field">
              <label className="pi-unit-label">Từ đơn vị *</label>
              <select
                className="pi-unit-input"
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
              >
                <option value="">Chọn đơn vị</option>
                {COMMON_CONVERSION_UNITS.filter((u) => u.toLowerCase() !== baseUnit.toLowerCase()).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="custom">-- Nhập đơn vị khác --</option>
              </select>
            </div>

            {fromUnit === 'custom' && (
              <div className="pi-unit-field">
                <input
                  type="text"
                  className="pi-unit-input"
                  placeholder="Nhập tên đơn vị quy đổi (vd: Lốc 6 lon, Két...)"
                  value={customFromUnit}
                  onChange={(e) => setCustomFromUnit(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="pi-unit-field">
              <label className="pi-unit-label">Sang đơn vị *</label>
              <input
                type="text"
                className="pi-unit-input"
                value={`${baseUnit} (Đơn vị gốc)`}
                disabled
                style={{ background: '#F8FAFC', color: '#64748B', fontWeight: 600 }}
              />
            </div>

            <div className="pi-unit-field">
              <label className="pi-unit-label">Tỷ lệ quy đổi *</label>
              <input
                type="number"
                step="any"
                className="pi-unit-input"
                placeholder="VD: 1, 12, 0.001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <span className="pi-unit-hint">
                {resolvedUnitName && rate ? (
                  <>
                    1 {resolvedUnitName} = <strong>{rate}</strong> {baseUnit}
                  </>
                ) : (
                  `1 đơn vị quy đổi bằng bao nhiêu ${baseUnit}`
                )}
              </span>
            </div>

            <div className="pi-unit-field">
              <label className="pi-unit-label">Giá bán đơn vị này (VNĐ)</label>
              <input
                type="number"
                className="pi-unit-input"
                placeholder="VD: 250000"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </div>

            <div className="pi-unit-actions">
              <button
                type="button"
                className="pi-unit-btn-add"
                onClick={handleAddConversion}
                disabled={saving}
              >
                {saving ? 'Đang lưu…' : 'Thêm'}
              </button>
            </div>
          </div>

          {/* Right Column: Danh sách quy đổi hiện tại */}
          <div className="pi-unit-col-right">
            <h3 className="pi-unit-section-title">Danh sách quy đổi hiện tại</h3>

            {conversions.length === 0 ? (
              <div className="pi-unit-empty">
                <p>Chưa có quy đổi đơn vị nào</p>
              </div>
            ) : (
              <div className="pi-unit-list">
                {conversions.map((item, idx) => (
                  <div key={item.id || idx} className="pi-unit-item-card">
                    <div className="pi-unit-item-formula">
                      <span className="pi-unit-pill pi-unit-pill--from">{item.name}</span>
                      <ArrowRight size={14} color="#64748B" />
                      <span className="pi-unit-pill pi-unit-pill--rate">
                        {item.unitBase} {baseUnit}
                      </span>
                    </div>
                    {item.sellingPrice > 0 && (
                      <div className="pi-unit-item-note">
                        Giá bán: {item.sellingPrice.toLocaleString()} đ
                      </div>
                    )}
                    <button
                      type="button"
                      className="pi-unit-item-del"
                      title="Xóa quy đổi"
                      onClick={() => handleDeleteConversion(item)}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pi-modal-footer">
          <button type="button" className="pi-modal-btn pi-modal-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
