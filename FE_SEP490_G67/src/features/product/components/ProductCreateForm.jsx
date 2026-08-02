import { useId, useState } from 'react';
import { Barcode, GripVertical, ImagePlus, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  brand: '',
  description: '',
  isActive: true,
  costPrice: '0',
  sellingPrice: '0',
  vatPercent: '10',
};

const createAttribute = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  value: '',
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export default function ProductCreateForm({
  formId,
  categories = [],
  onSubmit,
  onCancel,
}) {
  const fileInputId = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [attributes, setAttributes] = useState([createAttribute()]);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleToggleActive = () => {
    setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const handleAttributeChange = (id, field, value) => {
    setAttributes((prev) =>
      prev.map((attr) => (attr.id === id ? { ...attr, [field]: value } : attr)),
    );
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

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: 'Chỉ hỗ trợ ảnh JPG hoặc PNG.',
      }));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        image: 'Ảnh tối đa 5MB.',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === 'string' ? reader.result : null);
      setImageName(file.name);
      setImageFile(file);
      setErrors((prev) => ({ ...prev, image: null }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    applyImageFile(file);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    applyImageFile(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageName('');
    setImageFile(null);
    setErrors((prev) => ({ ...prev, image: null }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Vui lòng nhập tên sản phẩm.';
    }
    if (!form.categoryId) {
      nextErrors.categoryId = 'Vui lòng chọn danh mục.';
    }

    const cost = Number(form.costPrice);
    const sell = Number(form.sellingPrice);
    if (Number.isNaN(cost) || cost < 0) {
      nextErrors.costPrice = 'Giá nhập không hợp lệ.';
    }
    if (Number.isNaN(sell) || sell < 0) {
      nextErrors.sellingPrice = 'Giá bán không hợp lệ.';
    }
    if (!Number.isNaN(cost) && !Number.isNaN(sell) && sell > 0 && sell < cost) {
      nextErrors.sellingPrice = 'Giá bán nên lớn hơn hoặc bằng giá nhập.';
    }

    const vat = Number(form.vatPercent);
    if (Number.isNaN(vat) || vat < 0 || vat > 100) {
      nextErrors.vatPercent = 'VAT phải từ 0 đến 100.';
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
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        vatPercent: Number(form.vatPercent) || 0,
        attributes: attributes.filter((a) => a.name.trim() || a.value.trim()),
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
        <div className="add-product-page-header__actions">
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

              <div className="add-product-fields add-product-fields--two-col">
                <div className="add-product-field">
                  <label className="add-product-field__label" htmlFor="product-sku">
                    Mã SKU
                  </label>
                  <input
                    id="product-sku"
                    name="sku"
                    type="text"
                    className="add-product-field__input"
                    placeholder="Ví dụ: SP-001"
                    value={form.sku}
                    onChange={handleChange}
                  />
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
              <h2 className="add-product-card__title">Thuộc tính sản phẩm</h2>
              <button
                type="button"
                className="add-product-link-btn"
                onClick={handleAddAttribute}
              >
                + Thêm thuộc tính sản phẩm
              </button>
            </header>

            <div className="add-product-attrs">
              {attributes.map((attr) => (
                <div key={attr.id} className="add-product-attr-row">
                  <span className="add-product-attr-row__handle" aria-hidden="true">
                    <GripVertical size={18} />
                  </span>
                  <div className="add-product-field">
                    <label className="add-product-field__label">Tên thuộc tính</label>
                    <input
                      type="text"
                      className="add-product-field__input"
                      placeholder="Ví dụ: Màu sắc, Kích thước"
                      value={attr.name}
                      onChange={(e) => handleAttributeChange(attr.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="add-product-field">
                    <label className="add-product-field__label">Giá trị thuộc tính</label>
                    <input
                      type="text"
                      className="add-product-field__input"
                      placeholder="Nhập các giá trị,"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(attr.id, 'value', e.target.value)}
                    />
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
              <label
                htmlFor={fileInputId}
                className={`add-product-dropzone${dragOver ? ' add-product-dropzone--active' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <ImagePlus size={36} strokeWidth={1.5} />
                <span className="add-product-dropzone__title">
                  Kéo thả ảnh vào đây hoặc nhấp để tải lên
                </span>
                <span className="add-product-dropzone__hint">Hỗ trợ JPG, PNG (Tối đa 5MB)</span>
              </label>
            )}

            <input
              id={fileInputId}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="add-product-file-input"
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
                Đang kinh doanh · Hiển thị trên POS
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

          <section className="add-product-card">
            <header className="add-product-card__header">
              <h2 className="add-product-card__title">Giá cả</h2>
            </header>

            <div className="add-product-fields">
              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="product-cost">
                  Giá nhập (VNĐ) <span className="add-product-field__required">*</span>
                </label>
                <input
                  id="product-cost"
                  name="costPrice"
                  type="number"
                  min="0"
                  step="1000"
                  className={`add-product-field__input${errors.costPrice ? ' add-product-field__input--error' : ''}`}
                  value={form.costPrice}
                  onChange={handleChange}
                />
                {errors.costPrice ? (
                  <p className="add-product-field__error">{errors.costPrice}</p>
                ) : null}
              </div>

              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="product-sell">
                  Giá bán lẻ (VNĐ) <span className="add-product-field__required">*</span>
                </label>
                <input
                  id="product-sell"
                  name="sellingPrice"
                  type="number"
                  min="0"
                  step="1000"
                  className={`add-product-field__input${errors.sellingPrice ? ' add-product-field__input--error' : ''}`}
                  value={form.sellingPrice}
                  onChange={handleChange}
                />
                {errors.sellingPrice ? (
                  <p className="add-product-field__error">{errors.sellingPrice}</p>
                ) : null}
              </div>

              <div className="add-product-field">
                <label className="add-product-field__label" htmlFor="product-vat">
                  Thuế VAT (%)
                </label>
                <input
                  id="product-vat"
                  name="vatPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className={`add-product-field__input${errors.vatPercent ? ' add-product-field__input--error' : ''}`}
                  value={form.vatPercent}
                  onChange={handleChange}
                />
                {errors.vatPercent ? (
                  <p className="add-product-field__error">{errors.vatPercent}</p>
                ) : null}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
