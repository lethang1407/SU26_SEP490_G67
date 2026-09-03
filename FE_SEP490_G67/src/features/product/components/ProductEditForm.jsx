import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, AlertCircle, GripVertical, ImagePlus, Plus, Trash2, TrendingUp } from 'lucide-react';
import { PRODUCT_UNIT_OPTIONS } from '../constants';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

function createConversionUnit(ofUnit = 'Chai') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    unitName: '',
    qty: '1',
    ofUnit,
    sellPrice: '0',
    isReversed: true,
  };
}

function createAttribute(name = '', values = []) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    values,
    inputValue: '',
  };
}

function parseInitialAttributes(rawAttrs) {
  if (!Array.isArray(rawAttrs) || rawAttrs.length === 0) {
    return [];
  }

  const groupedMap = new Map();

  rawAttrs.forEach((attr) => {
    if (!attr) return;
    const name = (attr.name || '').trim();
    if (!name) return;

    if (!groupedMap.has(name)) {
      groupedMap.set(name, []);
    }

    const currentValues = groupedMap.get(name);
    if (Array.isArray(attr.values)) {
      attr.values.forEach((v) => {
        const valStr = String(v ?? '').trim();
        if (valStr && !currentValues.includes(valStr)) {
          currentValues.push(valStr);
        }
      });
    } else if (attr.value != null) {
      const valStr = String(attr.value).trim();
      if (valStr && !currentValues.includes(valStr)) {
        currentValues.push(valStr);
      }
    }
  });

  if (groupedMap.size === 0) {
    return [];
  }

  const result = [];
  groupedMap.forEach((vals, name) => {
    result.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      values: vals,
      inputValue: '',
    });
  });

  return result;
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

function mapInitial(data) {
  if (!data) {
    return {
      name: '',
      sku: '',
      barcode: '',
      categoryId: '',
      brand: '',
      description: '',
      status: 'active',
      baseUnit: 'Chai',
      baseSellPrice: '0',
      costPrice: '0',
      sellingPrice: '0',
      vatPercent: 10,
      conversionUnits: [],
      images: [],
    };
  }

  const costVal = Number(data.costPrice ?? 0);
  const sellVal = Number(data.sellingPrice ?? 0);
  const isNoPrice = costVal === 0 || sellVal === 0;

  return {
    name: data.name || '',
    sku: data.sku || data.code || (data.id ? `SP${String(data.id).padStart(6, '0')}` : ''),
    barcode: data.barcode || '',
    categoryId: data.categoryId != null ? String(data.categoryId) : '',
    brand: data.brand || '',
    description: data.description || '',
    status: isNoPrice ? 'inactive' : (data.status || 'active'),
    baseUnit: data.baseUnit || data.unitName || 'Chai',
    baseSellPrice: String(data.baseSellPrice ?? data.sellingPrice ?? 0),
    costPrice: String(data.costPrice ?? 0),
    sellingPrice: String(data.sellingPrice ?? 0),
    vatPercent: data.vatPercent ?? 10,
    conversionUnits: (data.conversionUnits || []).map((u) => ({ ...u })),
    images: (data.images || []).map((img) => ({ ...img })),
  };
}

export default function ProductEditForm({
  formId,
  initialData,
  product,
  categories = [],
  onSubmit,
  onCancel,
  onUploadImage,
  onRemoveImage,
}) {
  const data = initialData || product;
  const [form, setForm] = useState(() => mapInitial(data));
  const [attributes, setAttributes] = useState(() => parseInitialAttributes(data?.attributes));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const currentData = initialData || product;
    setForm(mapInitial(currentData));
    setAttributes(parseInitialAttributes(currentData?.attributes));
    setErrors({});
  }, [initialData?.id, product?.id]);

  const costNum = parseMoney(form.costPrice);
  const sellNum = parseMoney(form.sellingPrice);
  const margin = calcMargin(costNum, sellNum);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'sellingPrice') {
        next.baseSellPrice = value;
      }
      if (name === 'baseSellPrice') {
        next.sellingPrice = value;
      }
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

  const getUnitPrice = (unitName, currentForm) => {
    const trimmed = (unitName || '').trim();
    const baseUnitName = (currentForm.baseUnit || '').trim();
    const basePrice = parseMoney(currentForm.baseSellPrice || currentForm.sellingPrice);

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
      if (name === 'baseSellPrice') {
        next.sellingPrice = value;
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
    setAttributes((prev) => prev.filter((attr) => attr.id !== id));
  };

  const fileInputRef = useRef(null);

  const applyImageFile = async (file) => {
    if (!file) return;
    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    const isValidType = ACCEPTED_IMAGE_TYPES.includes(file.type) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!isValidType) {
      setErrors((prev) => ({ ...prev, image: 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.' }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((prev) => ({ ...prev, image: 'Ảnh tối đa 5MB.' }));
      return;
    }

    try {
      setErrors((prev) => ({ ...prev, image: null }));
      if (onUploadImage) {
        const img = await onUploadImage(file);
        if (img) {
          setForm((prev) => ({
            ...prev,
            images: [
              ...prev.images,
              {
                id: img.id,
                preview: img.url || img.preview,
                url: img.url,
                publicId: img.publicId,
                isMain: img.isMain ?? prev.images.length === 0,
              },
            ],
          }));
        }
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Không tải được ảnh.';
      setErrors((prev) => ({ ...prev, image: message }));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      applyImageFile(file);
    }
  };

  const handleRemoveImage = async (id) => {
    try {
      if (onRemoveImage) {
        await onRemoveImage(id);
      }
      setForm((prev) => {
        const next = prev.images.filter((img) => String(img.id) !== String(id));
        if (next.length && !next.some((img) => img.isMain)) {
          next[0] = { ...next[0], isMain: true };
        }
        return { ...prev, images: next };
      });
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Không xóa được ảnh.';
      setErrors((prev) => ({ ...prev, image: message }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập tên sản phẩm.';
    if (!form.categoryId) nextErrors.categoryId = 'Vui lòng chọn danh mục.';
    if (!form.baseUnit.trim()) nextErrors.baseUnit = 'Vui lòng chọn đơn vị cơ bản.';
    if (costNum < 0) nextErrors.costPrice = 'Giá nhập không hợp lệ.';
    if (sellNum < 0) nextErrors.sellingPrice = 'Giá bán không hợp lệ.';
    if (sellNum > 0 && sellNum < costNum) {
      nextErrors.sellingPrice = 'Giá bán nên lớn hơn hoặc bằng giá nhập.';
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
        const attrName = attr.name.trim();
        if (attrName) {
          const vals = [...attr.values];
          if (attr.inputValue?.trim() && !vals.includes(attr.inputValue.trim())) {
            vals.push(attr.inputValue.trim());
          }
          vals.forEach((val) => {
            flatAttributes.push({ name: attrName, value: val.trim() });
          });
        }
      });

      await onSubmit?.({
        ...form,
        costPrice: costNum,
        sellingPrice: sellNum,
        baseSellPrice: parseMoney(form.baseSellPrice),
        conversionUnits: form.conversionUnits.filter(
          (u) => u.unitName.trim() || parseMoney(u.sellPrice) > 0,
        ),
        attributes: flatAttributes,
      });
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Không lưu được sản phẩm.';
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setSaving(false);
    }
  };

  const displayName = form.name.trim() || initialData?.name || 'Sản phẩm';

  return (
    <form id={formId} className="add-product-form edit-product-form" onSubmit={handleSubmit} noValidate>
      <div className="add-product-page-header">
        <h1 className="add-product-page-header__title">
          Chỉnh sửa sản phẩm: {displayName}
        </h1>
        <div className="add-product-page-header__actions">
          <button
            type="button"
            className="add-product-btn add-product-btn--outline"
            onClick={onCancel}
            disabled={saving}
          >
            Quay lại
          </button>
          <button
            type="submit"
            className="add-product-btn add-product-btn--primary"
            disabled={saving}
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {errors.submit ? (
        <p className="add-product-field__error" style={{ marginBottom: 12 }}>
          {errors.submit}
        </p>
      ) : null}

      {(costNum === 0 || sellNum === 0) && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400E',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0 }} />
          <div>
            <strong>Nhắc nhở cập nhật giá:</strong> Sản phẩm này hiện chưa được cập nhật giá nhập hoặc giá bán (đang là <strong>0 đ</strong>). Vui lòng điền <strong>Giá nhập</strong> và <strong>Giá bán lẻ</strong> bên dưới trước khi lưu.
          </div>
        </div>
      )}

      <div className="add-product-layout">
        <div className="add-product-main">
          <section className="add-product-card">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title">Thông tin cơ bản</h2>
            </header>

            <div className="add-product-fields">
              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="edit-product-name">
                  Tên sản phẩm <span className="add-product-field__required">*</span>
                </label>
                <input
                  id="edit-product-name"
                  name="name"
                  type="text"
                  className={`add-product-field__input${errors.name ? ' add-product-field__input--error' : ''}`}
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

              <div className="add-product-fields add-product-fields--two-col">
                <div className="add-product-field">
                  <label className="add-product-field__label" htmlFor="edit-product-sku">
                    Mã sản phẩm
                  </label>
                  <input
                    id="edit-product-sku"
                    name="sku"
                    type="text"
                    className="add-product-field__input add-product-field__input--readonly"
                    value={form.sku}
                    readOnly
                  />
                </div>

                <div className="add-product-field">
                  <label className="add-product-field__label" htmlFor="edit-product-barcode">
                    Mã vạch
                  </label>
                  <input
                    id="edit-product-barcode"
                    name="barcode"
                    type="text"
                    className="add-product-field__input"
                    value={form.barcode}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="add-product-field edit-product-field--half">
                <label className="add-product-field__label" htmlFor="edit-product-category">
                  Danh mục <span className="add-product-field__required">*</span>
                </label>
                <select
                  id="edit-product-category"
                  name="categoryId"
                  className={`add-product-field__select${errors.categoryId ? ' add-product-field__input--error' : ''}`}
                  value={form.categoryId}
                  onChange={handleChange}
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
            </div>
          </section>

          <section className="add-product-card">
            <header className="add-product-card__header add-product-card__header--row">
              <h2 className="add-product-card__title">Quản lý đơn vị tính</h2>
              <button type="button" className="add-product-link-btn" onClick={handleAddUnit}>
                <Plus size={14} /> Thêm đơn vị quy đổi
              </button>
            </header>

            <datalist id="edit-product-unit-suggestions">
              {PRODUCT_UNIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>

            <div className="edit-product-units">
              <div className="edit-product-unit-base">
                <div className="edit-product-unit-base__grid">
                  <div className="add-product-field">
                    <label className="add-product-field__label" htmlFor="edit-base-unit">
                      Đơn vị cơ bản
                    </label>
                    <input
                      id="edit-base-unit"
                      name="baseUnit"
                      type="text"
                      list="edit-product-unit-suggestions"
                      className="add-product-field__input"
                      placeholder="Nhập hoặc chọn đơn vị (ví dụ: Chai, Kg, Hộp...)"
                      value={form.baseUnit}
                      onChange={(e) => handleBasePriceOrUnitChange('baseUnit', e.target.value)}
                    />
                  </div>
                  <div className="add-product-field">
                    <label className="add-product-field__label" htmlFor="edit-base-sell">
                      Giá bán lẻ (VNĐ)
                    </label>
                    <input
                      id="edit-base-sell"
                      name="baseSellPrice"
                      type="text"
                      inputMode="numeric"
                      className="add-product-field__input"
                      value={formatInputMoney(form.baseSellPrice)}
                      onChange={(e) => handleBasePriceOrUnitChange('baseSellPrice', e.target.value)}
                    />
                  </div>
                </div>
                <p className="edit-product-unit-base__hint">
                  Đơn vị nhỏ nhất dùng để tính tồn kho.
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
                          list="edit-product-unit-suggestions"
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
                          list="edit-product-unit-suggestions"
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
            <p className="edit-product-images__hint">
              Ảnh rõ giúp nhận diện sản phẩm tốt hơn. Hỗ trợ JPG, PNG (Tối đa 5MB).
            </p>

            <div className="edit-product-images">
              {form.images.map((img) => (
                <div key={img.id} className="edit-product-image-card">
                  <img src={img.preview} alt={img.name || 'Ảnh sản phẩm'} />
                  {img.isMain ? <span className="edit-product-image-card__badge">Ảnh chính</span> : null}
                  <button
                    type="button"
                    className="edit-product-image-card__remove"
                    aria-label="Xóa ảnh"
                    onClick={() => handleRemoveImage(img.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div
                className="edit-product-image-add"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <ImagePlus size={22} strokeWidth={1.75} />
                <span>Thêm ảnh</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
            {errors.image ? <p className="add-product-field__error">{errors.image}</p> : null}
          </section>

          <section className="add-product-card">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title">Mô tả sản phẩm</h2>
            </header>
            <div className="add-product-fields">
              <div className="add-product-field">
                <textarea
                  id="edit-product-desc"
                  name="description"
                  className="add-product-field__textarea"
                  rows={5}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Nhập thông tin mô tả chi tiết sản phẩm, công dụng, xuất xứ, hướng dẫn bảo quản…"
                  style={{ width: '100%', minHeight: 110, fontSize: 13.5, lineHeight: 1.6 }}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="add-product-aside">
          <section className="add-product-card">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Giá cả</span>
                {(costNum === 0 || sellNum === 0) && (
                  <span style={{ fontSize: 11, background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                    Chưa cập nhật giá
                  </span>
                )}
              </h2>
            </header>

            <div className="add-product-fields">
              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="edit-cost">
                  Giá nhập (VNĐ)
                </label>
                <div className="edit-product-money">
                  <input
                    id="edit-cost"
                    name="costPrice"
                    type="text"
                    inputMode="numeric"
                    className={`add-product-field__input${errors.costPrice ? ' add-product-field__input--error' : ''}`}
                    value={formatInputMoney(form.costPrice)}
                    onChange={(e) => handleMoneyChange('costPrice', e.target.value)}
                  />
                  <span className="edit-product-money__suffix">đ</span>
                </div>
                {errors.costPrice ? (
                  <p className="add-product-field__error">{errors.costPrice}</p>
                ) : null}
              </div>

              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="edit-sell">
                  Giá bán lẻ (VNĐ) <span className="add-product-field__required">*</span>
                </label>
                <div className="edit-product-money">
                  <input
                    id="edit-sell"
                    name="sellingPrice"
                    type="text"
                    inputMode="numeric"
                    className={`add-product-field__input add-product-field__input--accent${errors.sellingPrice ? ' add-product-field__input--error' : ''}`}
                    value={formatInputMoney(form.sellingPrice)}
                    onChange={(e) => handleMoneyChange('sellingPrice', e.target.value)}
                  />
                  <span className="edit-product-money__suffix">đ</span>
                </div>
                {errors.sellingPrice ? (
                  <p className="add-product-field__error">{errors.sellingPrice}</p>
                ) : null}
              </div>

              <div className="edit-product-margin">
                <span className="edit-product-margin__label">Biên độ lợi nhuận</span>
                <span
                  className={`edit-product-margin__value${margin == null ? '' : margin >= 0 ? ' is-positive' : ' is-negative'
                    }`}
                >
                  {margin == null ? (
                    '—'
                  ) : (
                    <>
                      <TrendingUp size={14} />
                      {margin.toFixed(1)}%
                    </>
                  )}
                </span>
              </div>
            </div>
          </section>

          {(product?.id || initialData?.id) && (
            <section className="add-product-card">
              <header className="add-product-card__header">
                <h2 className="add-product-card__title">Trạng thái kinh doanh</h2>
              </header>

              <div className="edit-product-status" role="radiogroup" aria-label="Trạng thái kinh doanh">
                {form.status === 'new' && (
                  <label className="edit-product-status__option is-checked">
                    <input
                      type="radio"
                      name="status"
                      value="new"
                      checked={form.status === 'new'}
                      onChange={handleChange}
                    />
                    <span className="edit-product-status__radio" aria-hidden="true" />
                    <span>🆕 Sản phẩm mới</span>
                  </label>
                )}
                <label className={`edit-product-status__option${form.status === 'active' ? ' is-checked' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={form.status === 'active'}
                    onChange={handleChange}
                  />
                  <span className="edit-product-status__radio" aria-hidden="true" />
                  <span>🟢 Đang kinh doanh</span>
                </label>
                <label className={`edit-product-status__option${form.status === 'inactive' ? ' is-checked' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={form.status === 'inactive'}
                    onChange={handleChange}
                  />
                  <span className="edit-product-status__radio" aria-hidden="true" />
                  <span>⛔ Ngừng kinh doanh</span>
                </label>
              </div>
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}
