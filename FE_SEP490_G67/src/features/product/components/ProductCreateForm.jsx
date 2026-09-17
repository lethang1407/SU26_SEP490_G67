import { useRef, useState } from 'react';
import { ArrowLeftRight, Barcode, GripVertical, ImagePlus, Plus, Trash2, TrendingUp } from 'lucide-react';
import { PRODUCT_UNIT_OPTIONS } from '../constants';

const EMPTY_FORM = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  brand: '',
  description: '',
  isActive: false,
  baseUnit: '',
  baseSellPrice: '0',
  costPrice: '0',
  sellingPrice: '0',
  vatPercent: '0',
  conversionUnits: [],
};

function createConversionUnit(ofUnit = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    unitName: '',
    qty: '1',
    ofUnit,
    sellPrice: '0',
    isReversed: true,
  };
}

function createAttribute() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    values: [],
    inputValue: '',
  };
}

function parseMoney(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatInputMoney(value) {
  const n = parseMoney(value);
  return n.toLocaleString('vi-VN');
}

function calcMargin(cost, sell) {
  if (!sell || sell <= 0) return null;
  return Math.round(((sell - cost) / sell) * 1000) / 10;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

export default function ProductCreateForm({
  formId,
  categories = [],
  onSubmit,
  onCancel,
}) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [attributes, setAttributes] = useState([createAttribute()]);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const costNum = parseMoney(form.costPrice);
  const sellNum = parseMoney(form.sellingPrice);
  const margin = calcMargin(costNum, sellNum);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'baseUnit') {
        next.conversionUnits = prev.conversionUnits.map((u, idx) =>
          idx === 0 ? { ...u, ofUnit: value } : u,
        );
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleMoneyChange = (name, raw) => {
    const digits = String(raw).replace(/[^\d]/g, '');
    handleChange({ target: { name, value: digits || '0' } });
  };

  const handleToggleActive = () => {
    setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const getUnitPrice = (unitName, currentForm) => {
    const trimmed = (unitName || '').trim();
    const baseUnitName = (currentForm.baseUnit || '').trim();
    const basePrice = parseMoney(currentForm.sellingPrice || currentForm.baseSellPrice);

    if (!trimmed || trimmed === baseUnitName) {
      return basePrice;
    }
    const found = (currentForm.conversionUnits || []).find(
      (u) => (u.unitName || '').trim() === trimmed
    );
    if (found && found.sellPrice != null) {
      return parseMoney(found.sellPrice);
    }
    return basePrice;
  };

  const handleBasePriceOrUnitChange = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'sellingPrice') {
        next.baseSellPrice = value;
      }

      if (name === 'sellingPrice' || name === 'baseSellPrice' || name === 'baseUnit') {
        next.conversionUnits = next.conversionUnits.map((u) => {
          if (!u.isCustomPrice) {
            const qtyNum = parseFloat(u.qty) || 0;
            const refUnit = u.ofUnit || next.baseUnit;
            const refPrice = getUnitPrice(refUnit, next);
            u.sellPrice = String(Math.round(qtyNum * refPrice));
          }
          return u;
        });
      }

      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleAddUnit = () => {
    const defaultOfUnit = form.baseUnit || 'Chai';
    const newUnit = createConversionUnit(defaultOfUnit);
    const refPrice = getUnitPrice(defaultOfUnit, form);
    newUnit.sellPrice = String(refPrice);

    setForm((prev) => ({
      ...prev,
      conversionUnits: [...prev.conversionUnits, newUnit],
    }));
  };

  const handleToggleSwap = (id) => {
    setForm((prev) => {
      const nextConversionUnits = prev.conversionUnits.map((u) => {
        if (u.id !== id) return u;

        const nextIsReversed = !u.isReversed;
        const updated = {
          ...u,
          isReversed: nextIsReversed,
        };

        if (!updated.isCustomPrice) {
          const qtyNum = parseFloat(updated.qty) || 0;
          const refUnit = updated.ofUnit || prev.baseUnit;
          const refPrice = getUnitPrice(refUnit, prev);

          if (nextIsReversed) {
            // Mode B: 1 [ New Unit ] = [ Qty ] [ Ref Unit ]
            updated.sellPrice = String(Math.round(qtyNum * refPrice));
          } else {
            // Mode A: 1 [ Ref Unit ] = [ Qty ] [ New Unit ]
            updated.sellPrice = String(qtyNum > 0 ? Math.round(refPrice / qtyNum) : 0);
          }
        }

        return updated;
      });

      return {
        ...prev,
        conversionUnits: nextConversionUnits,
      };
    });
  };

  const handleUnitChange = (id, field, value) => {
    setForm((prev) => {
      const nextConversionUnits = prev.conversionUnits.map((u) => {
        if (u.id !== id) return u;

        const updated = { ...u, [field]: value };

        if (field === 'sellPrice') {
          updated.isCustomPrice = true;
        }

        if ((field === 'qty' || field === 'ofUnit' || field === 'unitName') && !updated.isCustomPrice) {
          const qtyNum = parseFloat(updated.qty) || 0;
          const refUnit = updated.ofUnit || prev.baseUnit;
          const refPrice = getUnitPrice(refUnit, prev);

          if (updated.isReversed) {
            // Mode B: 1 [ New Unit ] = [ Qty ] [ Ref Unit ]
            updated.sellPrice = String(Math.round(qtyNum * refPrice));
          } else {
            // Mode A: 1 [ Ref Unit ] = [ Qty ] [ New Unit ]
            updated.sellPrice = String(qtyNum > 0 ? Math.round(refPrice / qtyNum) : 0);
          }
        }

        return updated;
      });

      return {
        ...prev,
        conversionUnits: nextConversionUnits,
      };
    });
  };

  const handleRemoveUnit = (id) => {
    setForm((prev) => ({
      ...prev,
      conversionUnits: prev.conversionUnits.filter((u) => u.id !== id),
    }));
  };

  const handleAttributeChange = (id, field, value) => {
    setAttributes((prev) =>
      prev.map((attr) => (attr.id === id ? { ...attr, [field]: value } : attr)),
    );
  };

  const handleAddAttributeValue = (id, event) => {
    if (event) event.preventDefault();
    setAttributes((prev) =>
      prev.map((attr) => {
        if (attr.id === id && attr.inputValue.trim()) {
          const newValues = [...attr.values];
          const val = attr.inputValue.trim();
          if (!newValues.includes(val)) {
            newValues.push(val);
          }
          return { ...attr, values: newValues, inputValue: '' };
        }
        return attr;
      })
    );
  };

  const handleRemoveAttributeValue = (id, valueToRemove) => {
    setAttributes((prev) =>
      prev.map((attr) => {
        if (attr.id === id) {
          return { ...attr, values: attr.values.filter((v) => v !== valueToRemove) };
        }
        return attr;
      })
    );
  };

  const handleAttributeKeyDown = (id, event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddAttributeValue(id);
    }
  };

  const handleAddAttribute = () => {
    setAttributes((prev) => [...prev, createAttribute()]);
  };

  const handleRemoveAttribute = (id) => {
    setAttributes((prev) => {
      if (prev.length <= 1) {
        return [createAttribute()];
      }
      return prev.filter((attr) => attr.id !== id);
    });
  };

  const applyImageFile = (file) => {
    if (!file) return;

    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    const isValidType = ACCEPTED_IMAGE_TYPES.includes(file.type) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!isValidType) {
      setErrors((prev) => ({
        ...prev,
        image: 'Chỉ hỗ trợ định dạng ảnh JPG, PNG hoặc WEBP.',
      }));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        image: 'Dung lượng ảnh tối đa 5MB.',
      }));
      return;
    }

    try {
      if (imagePreview && typeof imagePreview === 'string' && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      setImageName(file.name || 'image.png');
      setImageFile(file);
      setErrors((prev) => ({ ...prev, image: null }));
    } catch (err) {
      console.error('Lỗi khi tạo xem trước ảnh:', err);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      applyImageFile(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      applyImageFile(file);
    }
  };

  const clearImage = () => {
    if (imagePreview && typeof imagePreview === 'string' && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageName('');
    setImageFile(null);
    setErrors((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Vui lòng nhập tên sản phẩm.';
    }
    if (!form.categoryId) {
      nextErrors.categoryId = 'Vui lòng chọn danh mục.';
    }
    if (!form.baseUnit.trim()) {
      nextErrors.baseUnit = 'Vui lòng chọn đơn vị tính cơ bản.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm() || saving) return;

    setSaving(true);
    try {
      const flatAttributes = [];
      attributes.forEach((attr) => {
        if (attr.name.trim()) {
          attr.values.forEach((val) => {
            flatAttributes.push({ name: attr.name.trim(), value: val.trim() });
          });
        }
      });

      await onSubmit?.({
        ...form,
        costPrice: 0,
        sellingPrice: 0,
        baseSellPrice: 0,
        vatPercent: 0,
        conversionUnits: form.conversionUnits
          .filter((u) => u.unitName.trim())
          .map((u) => ({
            ...u,
            sellPrice: 0,
          })),
        attributes: flatAttributes,
        imageFile,
        imageName: imageName || null,
        imagePreview: imagePreview || null,
      });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Không lưu được sản phẩm.';
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id={formId} className="add-product-form" onSubmit={handleSubmit} noValidate>
      <div className="add-product-page-header">
        <h1 className="add-product-page-header__title">Thêm sản phẩm mới</h1>
      </div>

      {errors.submit ? (
        <p className="add-product-field__error" style={{ marginBottom: 12 }}>
          {errors.submit}
        </p>
      ) : null}

      <div className="add-product-layout">
        <div className="add-product-main">
          <section className="add-product-card">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title">Thông tin cơ bản</h2>
            </header>

            <div className="add-product-fields">
              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="product-name">
                  Tên sản phẩm <span className="add-product-field__required">*</span>
                </label>
                <input
                  id="product-name"
                  name="name"
                  type="text"
                  className={`add-product-field__input${errors.name ? ' add-product-field__input--error' : ''}`}
                  placeholder="Nhập tên sản phẩm"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={() => {
                    if (!form.name.trim()) {
                      setErrors((prev) => ({ ...prev, name: 'Vui lòng nhập tên sản phẩm.' }));
                    }
                  }}
                />
                {errors.name ? <p className="add-product-field__error">{errors.name}</p> : null}
              </div>

              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="product-barcode">
                  Mã vạch
                </label>
                <div className="add-product-field__with-icon">
                  <input
                    id="product-barcode"
                    name="barcode"
                    type="text"
                    className="add-product-field__input"
                    placeholder="Quét hoặc nhập mã vạch"
                    value={form.barcode}
                    onChange={handleChange}
                  />
                  <Barcode size={18} className="add-product-field__icon" aria-hidden="true" />
                </div>
              </div>

              <div className="add-product-fields add-product-fields--two-col">
                <div className="add-product-field">
                  <label className="add-product-field__label" htmlFor="product-category">
                    Danh mục <span className="add-product-field__required">*</span>
                  </label>
                  <select
                    id="product-category"
                    name="categoryId"
                    className={`add-product-field__select${errors.categoryId ? ' add-product-field__input--error' : ''}`}
                    value={form.categoryId}
                    onChange={handleChange}
                    onBlur={() => {
                      if (!form.categoryId) {
                        setErrors((prev) => ({ ...prev, categoryId: 'Vui lòng chọn danh mục.' }));
                      }
                    }}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId ? (
                    <p className="add-product-field__error">{errors.categoryId}</p>
                  ) : null}
                </div>

                <div className="add-product-field">
                  <label className="add-product-field__label" htmlFor="product-brand">
                    Thương hiệu
                  </label>
                  <input
                    id="product-brand"
                    name="brand"
                    type="text"
                    className="add-product-field__input"
                    placeholder="Nhập thương hiệu"
                    value={form.brand}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="product-description">
                  Mô tả ngắn
                </label>
                <textarea
                  id="product-description"
                  name="description"
                  className="add-product-field__textarea"
                  placeholder="Nhập mô tả sản phẩm..."
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          <section className="add-product-card">
            <header className="add-product-card__header add-product-card__header--row">
              <h2 className="add-product-card__title">Quản lý đơn vị tính</h2>
              <button type="button" className="add-product-link-btn" onClick={handleAddUnit}>
                <Plus size={14} /> Thêm đơn vị quy đổi
              </button>
            </header>

            <datalist id="product-unit-suggestions">
              {PRODUCT_UNIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>

            <div className="edit-product-units">
              <div className="edit-product-unit-base">
                <div className="edit-product-unit-base__grid">
                  <div className="add-product-field">
                    <label className="add-product-field__label" htmlFor="create-base-unit">
                      Đơn vị cơ bản <span className="add-product-field__required">*</span>
                    </label>
                    <input
                      id="create-base-unit"
                      name="baseUnit"
                      type="text"
                      list="product-unit-suggestions"
                      className="add-product-field__input"
                      placeholder="Nhập hoặc chọn đơn vị cơ bản (Bắt buộc, VD: Chai, Lon, Cái...)"
                      value={form.baseUnit}
                      onChange={(e) => handleBasePriceOrUnitChange('baseUnit', e.target.value)}
                    />
                    {errors.baseUnit ? (
                      <p className="add-product-field__error">{errors.baseUnit}</p>
                    ) : (
                      !form.baseUnit?.trim() && (
                        <span style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'block', fontWeight: 500 }}>
                          ⚠️ Vui lòng nhập đơn vị tính cơ bản
                        </span>
                      )
                    )}
                  </div>
                </div>
                <p className="edit-product-unit-base__hint">
                  Đơn vị nhỏ nhất dùng để tính tồn kho và bán lẻ.
                </p>
              </div>

              {form.conversionUnits.map((unit) => {
                const currentProductUnits = [
                  form.baseUnit?.trim() || 'Chai',
                  ...(form.conversionUnits || [])
                    .filter((u) => u.id !== unit.id)
                    .map((u) => u.unitName?.trim())
                    .filter(Boolean),
                ].filter((v, i, self) => self.indexOf(v) === i);

                const refUnit = unit.ofUnit || form.baseUnit;
                const isRev = Boolean(unit.isReversed);

                return (
                  <div key={unit.id} className="edit-product-unit-row">
                    <button
                      type="button"
                      className={`edit-product-unit-row__swap${isRev ? ' edit-product-unit-row__swap--active' : ''}`}
                      title={isRev ? "Đang ở chế độ: 1 [Đơn vị mới] = [Số lượng] [Đơn vị gốc]. Bấm để đổi thành: 1 [Đơn vị gốc] = [Số lượng] [Đơn vị mới]" : "Đang ở chế độ: 1 [Đơn vị gốc] = [Số lượng] [Đơn vị mới] (Ví dụ: 1 Kg = 1000 Gam). Bấm để đổi thành: 1 [Đơn vị mới] = [Số lượng] [Đơn vị gốc]"}
                      onClick={() => handleToggleSwap(unit.id)}
                    >
                      <ArrowLeftRight size={16} />
                    </button>

                    <span className="edit-product-unit-row__eq">1</span>

                    {isRev ? (
                      <>
                        <input
                          type="text"
                          list="product-unit-suggestions"
                          className="add-product-field__input"
                          placeholder="Tên đơn vị mới"
                          value={unit.unitName}
                          onChange={(e) => handleUnitChange(unit.id, 'unitName', e.target.value)}
                          aria-label="Tên đơn vị mới"
                        />
                        <span className="edit-product-unit-row__eq">=</span>
                        <input
                          type="number"
                          step="any"
                          min="0.000001"
                          className="add-product-field__input"
                          placeholder="Số lượng"
                          value={unit.qty}
                          onChange={(e) => handleUnitChange(unit.id, 'qty', e.target.value)}
                          aria-label="Số lượng quy đổi"
                        />
                        <select
                          className="add-product-field__select"
                          value={refUnit}
                          onChange={(e) => handleUnitChange(unit.id, 'ofUnit', e.target.value)}
                          aria-label="Đơn vị tham chiếu"
                        >
                          {currentProductUnits.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <select
                          className="add-product-field__select"
                          value={refUnit}
                          onChange={(e) => handleUnitChange(unit.id, 'ofUnit', e.target.value)}
                          aria-label="Đơn vị tham chiếu"
                        >
                          {currentProductUnits.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <span className="edit-product-unit-row__eq">=</span>
                        <input
                          type="number"
                          step="any"
                          min="0.000001"
                          className="add-product-field__input"
                          placeholder="Số lượng"
                          value={unit.qty}
                          onChange={(e) => handleUnitChange(unit.id, 'qty', e.target.value)}
                          aria-label="Số lượng quy đổi"
                        />
                        <input
                          type="text"
                          list="product-unit-suggestions"
                          className="add-product-field__input"
                          placeholder="Tên đơn vị mới"
                          value={unit.unitName}
                          onChange={(e) => handleUnitChange(unit.id, 'unitName', e.target.value)}
                          aria-label="Tên đơn vị mới"
                        />
                      </>
                    )}

                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="add-product-field__input"
                        style={{ paddingRight: '28px' }}
                        placeholder="Giá bán lẻ"
                        title="Giá bán lẻ (VNĐ)"
                        value={formatInputMoney(unit.sellPrice)}
                        onChange={(e) =>
                          handleUnitChange(
                            unit.id,
                            'sellPrice',
                            String(e.target.value).replace(/[^\d]/g, '') || '0',
                          )
                        }
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#64748b',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        đ
                      </span>
                    </div>
                    <button
                      type="button"
                      className="edit-product-unit-row__remove"
                      aria-label="Xóa đơn vị quy đổi"
                      onClick={() => handleRemoveUnit(unit.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="add-product-card">
            <header className="add-product-card__header add-product-card__header--row">
              <h2 className="add-product-card__title">Thuộc tính sản phẩm</h2>
              <button
                type="button"
                className="add-product-link-btn"
                onClick={handleAddAttribute}
              >
                + Thêm thuộc tính sản phẩm
              </button>
            </header>

            {attributes.length > 0 ? (
              <div className="add-product-attrs">
                <div className="add-product-attr-header">
                  <span></span>
                  <span>Tên thuộc tính</span>
                  <span>Giá trị thuộc tính</span>
                  <span></span>
                </div>
                {attributes.map((attr) => (
                  <div key={attr.id} className="add-product-attr-row">
                    <span className="add-product-attr-row__handle" aria-hidden="true">
                      <GripVertical size={18} />
                    </span>
                    <input
                      type="text"
                      className="add-product-field__input"
                      placeholder="Ví dụ: Màu sắc, Kích thước"
                      value={attr.name}
                      onChange={(e) => handleAttributeChange(attr.id, 'name', e.target.value)}
                    />
                    <div className="add-product-attr-value-box">
                      {attr.values.map((val) => (
                        <span key={val} className="add-product-attr-tag">
                          {val}
                          <button
                            type="button"
                            className="add-product-attr-tag__close"
                            onClick={() => handleRemoveAttributeValue(attr.id, val)}
                            aria-label="Xóa giá trị"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="add-product-attr-inline-input"
                        placeholder={attr.values.length === 0 ? "Nhập giá trị và nhấn Enter hoặc Thêm" : "Nhập thêm giá trị..."}
                        value={attr.inputValue}
                        onChange={(e) => handleAttributeChange(attr.id, 'inputValue', e.target.value)}
                        onKeyDown={(e) => handleAttributeKeyDown(attr.id, e)}
                      />
                      {attr.inputValue.trim() ? (
                        <button
                          type="button"
                          className="add-product-attr-inline-btn"
                          onClick={() => handleAddAttributeValue(attr.id)}
                        >
                          Thêm
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="add-product-attr-row__remove"
                      aria-label="Xóa thuộc tính"
                      onClick={() => handleRemoveAttribute(attr.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="add-product-attr-empty">
                Sản phẩm chưa có thuộc tính nào. Nhấn "+ Thêm thuộc tính sản phẩm" để thêm mới.
              </div>
            )}
          </section>

          <section className="add-product-card">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title">Hình ảnh sản phẩm</h2>
            </header>

            {imagePreview ? (
              <div className="add-product-image-preview">
                <img src={imagePreview} alt={imageName || 'Ảnh sản phẩm'} />
                <div className="add-product-image-preview__meta">
                  <span>{imageName}</span>
                  <button type="button" className="add-product-link-btn" onClick={clearImage}>
                    Xóa ảnh
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`add-product-dropzone${dragOver ? ' add-product-dropzone--active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <ImagePlus size={36} strokeWidth={1.5} />
                <span className="add-product-dropzone__title">
                  Kéo thả ảnh vào đây hoặc nhấp để tải lên
                </span>
                <span className="add-product-dropzone__hint">Hỗ trợ JPG, PNG, WEBP (Tối đa 5MB)</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {errors.image ? <p className="add-product-field__error">{errors.image}</p> : null}
          </section>
        </div>

        <aside className="add-product-aside">
          <section className="add-product-card add-product-card--status">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title">Trạng thái</h2>
            </header>
            <div className="add-product-status">
              <span className="add-product-status__label">
                {form.isActive ? 'Đang kinh doanh · Hiển thị trên POS' : 'Tạm ngừng kinh doanh (Chờ cập nhật giá)'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                className={`add-product-toggle${form.isActive ? ' add-product-toggle--on' : ''}`}
                onClick={handleToggleActive}
              >
                <span className="add-product-toggle__knob" />
              </button>
            </div>
          </section>
        </aside>
      </div>

      <div className="add-product-form-actions">
        <button
          type="button"
          className="add-product-btn add-product-btn--outline"
          onClick={onCancel}
          disabled={saving}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="add-product-btn add-product-btn--primary"
          disabled={saving}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17 21v-8H7v8M7 3v5h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {saving ? 'Đang lưu…' : 'Lưu sản phẩm'}
        </button>
      </div>
    </form>
  );
}
