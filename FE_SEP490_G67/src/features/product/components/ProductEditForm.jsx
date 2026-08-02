import { useEffect, useId, useState } from 'react';
import { ImagePlus, Plus, Trash2, TrendingUp } from 'lucide-react';
import { PRODUCT_UNIT_OPTIONS } from '../constants';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

function createConversionUnit(ofUnit = 'Chai') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    unitName: '',
    qty: '1',
    ofUnit,
    sellPrice: '0',
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

  return {
    name: data.name || '',
    sku: data.sku || '',
    barcode: data.barcode || '',
    categoryId: data.categoryId != null ? String(data.categoryId) : '',
    brand: data.brand || '',
    description: data.description || '',
    status: data.status || 'active',
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
  categories = [],
  onSubmit,
  onCancel,
  onUploadImage,
  onRemoveImage,
}) {
  const fileInputId = useId();
  const [form, setForm] = useState(() => mapInitial(initialData));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(mapInitial(initialData));
    setErrors({});
  }, [initialData?.id]);

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

  const handleAddUnit = () => {
    const lastUnit =
      form.conversionUnits.length > 0
        ? form.conversionUnits[form.conversionUnits.length - 1].unitName || form.baseUnit
        : form.baseUnit;
    setForm((prev) => ({
      ...prev,
      conversionUnits: [...prev.conversionUnits, createConversionUnit(lastUnit || prev.baseUnit)],
    }));
  };

  const handleUnitChange = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      conversionUnits: prev.conversionUnits.map((u) =>
        u.id === id ? { ...u, [field]: value } : u,
      ),
    }));
  };

  const handleRemoveUnit = (id) => {
    setForm((prev) => ({
      ...prev,
      conversionUnits: prev.conversionUnits.filter((u) => u.id !== id),
    }));
  };

  const applyImageFile = async (file) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: 'Chỉ hỗ trợ ảnh JPG hoặc PNG.' }));
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
    }
  };

  const handleFileChange = (event) => {
    applyImageFile(event.target.files?.[0]);
    event.target.value = '';
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
    if (!form.sku.trim()) nextErrors.sku = 'Vui lòng nhập mã SKU.';
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
      await onSubmit?.({
        ...form,
        costPrice: costNum,
        sellingPrice: sellNum,
        baseSellPrice: parseMoney(form.baseSellPrice),
        conversionUnits: form.conversionUnits.filter(
          (u) => u.unitName.trim() || parseMoney(u.sellPrice) > 0,
        ),
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
                    Mã sản phẩm (SKU) <span className="add-product-field__required">*</span>
                  </label>
                  <input
                    id="edit-product-sku"
                    name="sku"
                    type="text"
                    className={`add-product-field__input${errors.sku ? ' add-product-field__input--error' : ''}`}
                    value={form.sku}
                    onChange={handleChange}
                  />
                  {errors.sku ? <p className="add-product-field__error">{errors.sku}</p> : null}
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

              <div className="edit-product-units">
                <div className="edit-product-units__head">
                  <h3 className="edit-product-units__title">Quản lý đơn vị tính</h3>
                  <button type="button" className="add-product-link-btn" onClick={handleAddUnit}>
                    <Plus size={14} /> Thêm đơn vị quy đổi
                  </button>
                </div>

                <div className="edit-product-unit-base">
                  <div className="edit-product-unit-base__grid">
                    <div className="add-product-field">
                      <label className="add-product-field__label" htmlFor="edit-base-unit">
                        Đơn vị cơ bản
                      </label>
                      <select
                        id="edit-base-unit"
                        name="baseUnit"
                        className="add-product-field__select"
                        value={form.baseUnit}
                        onChange={handleChange}
                      >
                        {PRODUCT_UNIT_OPTIONS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
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
                        onChange={(e) => handleMoneyChange('baseSellPrice', e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="edit-product-unit-base__hint">
                    Đơn vị nhỏ nhất dùng để tính tồn kho.
                  </p>
                </div>

                {form.conversionUnits.map((unit, index) => {
                  const prevUnitName =
                    index === 0
                      ? form.baseUnit
                      : form.conversionUnits[index - 1].unitName || form.baseUnit;
                  return (
                    <div key={unit.id} className="edit-product-unit-row">
                      <span className="edit-product-unit-row__eq">1</span>
                      <select
                        className="add-product-field__select"
                        value={unit.unitName}
                        onChange={(e) => handleUnitChange(unit.id, 'unitName', e.target.value)}
                        aria-label="Tên đơn vị quy đổi"
                      >
                        <option value="">Đơn vị</option>
                        {PRODUCT_UNIT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <span className="edit-product-unit-row__eq">=</span>
                      <input
                        type="number"
                        min="1"
                        className="add-product-field__input"
                        value={unit.qty}
                        onChange={(e) => handleUnitChange(unit.id, 'qty', e.target.value)}
                        aria-label="Số lượng quy đổi"
                      />
                      <select
                        className="add-product-field__select"
                        value={unit.ofUnit || prevUnitName}
                        onChange={(e) => handleUnitChange(unit.id, 'ofUnit', e.target.value)}
                        aria-label="Đơn vị tham chiếu"
                      >
                        {PRODUCT_UNIT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div className="edit-product-unit-row__price">
                        <label className="add-product-field__label">Giá bán lẻ (VNĐ)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="add-product-field__input"
                          value={formatInputMoney(unit.sellPrice)}
                          onChange={(e) =>
                            handleUnitChange(
                              unit.id,
                              'sellPrice',
                              String(e.target.value).replace(/[^\d]/g, '') || '0',
                            )
                          }
                        />
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

              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="edit-product-desc">
                  Mô tả ngắn
                </label>
                <textarea
                  id="edit-product-desc"
                  name="description"
                  className="add-product-field__textarea"
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
            </div>
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

              <label htmlFor={fileInputId} className="edit-product-image-add">
                <ImagePlus size={22} strokeWidth={1.75} />
                <span>Thêm ảnh</span>
              </label>
              <input
                id={fileInputId}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="add-product-file-input"
                onChange={handleFileChange}
              />
            </div>
            {errors.image ? <p className="add-product-field__error">{errors.image}</p> : null}
          </section>
        </div>

        <aside className="add-product-aside">
          <section className="add-product-card">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title">Giá cả</h2>
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
                  className={`edit-product-margin__value${
                    margin == null ? '' : margin >= 0 ? ' is-positive' : ' is-negative'
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

          <section className="add-product-card">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title">Trạng thái kinh doanh</h2>
            </header>

            <div className="edit-product-status" role="radiogroup" aria-label="Trạng thái kinh doanh">
              <label className={`edit-product-status__option${form.status === 'active' ? ' is-checked' : ''}`}>
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={form.status === 'active'}
                  onChange={handleChange}
                />
                <span className="edit-product-status__radio" aria-hidden="true" />
                <span>Đang bán</span>
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
                <span>Ngừng kinh doanh</span>
              </label>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
