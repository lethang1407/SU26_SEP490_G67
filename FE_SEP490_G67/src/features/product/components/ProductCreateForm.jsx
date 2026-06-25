import { useEffect, useState } from 'react';
import { categoriesApi } from '../../category/api';
import { PRODUCT_CATEGORIES } from '../constants';

const INITIAL_FORM = {
    name: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    description: '',
    importPrice: '',
    sellPrice: '',
    vat: '10',
    isActive: true,
};

function createAttributeRow() {
    return {
        id: crypto.randomUUID(),
        name: '',
        value: '',
    };
}

export default function ProductCreateForm({ formId, isSubmitting = false, onSubmit }) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [attributes, setAttributes] = useState([createAttributeRow()]);
    const [errors, setErrors] = useState({});
    const [categories, setCategories] = useState(PRODUCT_CATEGORIES);

    useEffect(() => {
        let isCancelled = false;

        categoriesApi
            .getAllCategories()
            .then((items) => {
                if (!isCancelled && items.length > 0) {
                    setCategories(items.map((item) => item.name));
                }
            })
            .catch(() => {});

        return () => {
            isCancelled = true;
        };
    }, []);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const handleAttributeChange = (id, field, value) => {
        setAttributes((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        );
    };

    const handleAddAttribute = () => {
        setAttributes((prev) => [...prev, createAttributeRow()]);
    };

    const handleRemoveAttribute = (id) => {
        setAttributes((prev) => {
            if (prev.length === 1) {
                return [createAttributeRow()];
            }
            return prev.filter((item) => item.id !== id);
        });
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!form.name.trim()) {
            nextErrors.name = 'Vui lòng nhập tên sản phẩm.';
        }
        if (!form.category) {
            nextErrors.category = 'Vui lòng chọn danh mục.';
        }
        if (!form.importPrice.trim()) {
            nextErrors.importPrice = 'Vui lòng nhập giá nhập.';
        }
        if (!form.sellPrice.trim()) {
            nextErrors.sellPrice = 'Vui lòng nhập giá bán lẻ.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        onSubmit?.({
            ...form,
            attributes: attributes.filter((item) => item.name.trim() || item.value.trim()),
        });
    };

    return (
        <form id={formId} className="product-create-form" onSubmit={handleSubmit} noValidate>
            <div className="product-create-layout">
                <div className="product-create-main">
                    <section className="product-create-card">
                        <h2 className="product-create-card__title">Thông tin cơ bản</h2>

                        <div className="product-create-field product-create-field--full">
                            <label className="product-create-field__label" htmlFor="name">
                                Tên sản phẩm <span className="product-create-field__required">*</span>
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                className={`product-create-field__input${
                                    errors.name ? ' product-create-field__input--error' : ''
                                }`}
                                placeholder="Nhập tên sản phẩm"
                                value={form.name}
                                onChange={handleChange}
                                disabled={isSubmitting}
                            />
                            {errors.name && (
                                <span className="product-create-field__error">{errors.name}</span>
                            )}
                        </div>

                        <div className="product-create-fields product-create-fields--two-col">
                            <div className="product-create-field">
                                <label className="product-create-field__label" htmlFor="sku">
                                    Mã SKU
                                </label>
                                <input
                                    id="sku"
                                    name="sku"
                                    type="text"
                                    className="product-create-field__input"
                                    placeholder="SP001"
                                    value={form.sku}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="product-create-field">
                                <label className="product-create-field__label" htmlFor="barcode">
                                    Mã vạch
                                </label>
                                <input
                                    id="barcode"
                                    name="barcode"
                                    type="text"
                                    className="product-create-field__input"
                                    placeholder="8934567890123"
                                    value={form.barcode}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="product-create-fields product-create-fields--two-col">
                            <div className="product-create-field">
                                <label className="product-create-field__label" htmlFor="category">
                                    Danh mục <span className="product-create-field__required">*</span>
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    className={`product-create-field__select${
                                        errors.category ? ' product-create-field__input--error' : ''
                                    }`}
                                    value={form.category}
                                    onChange={handleChange}
                                >
                                    <option value="">Chọn danh mục</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                                {errors.category && (
                                    <span className="product-create-field__error">{errors.category}</span>
                                )}
                            </div>
                            <div className="product-create-field">
                                <label className="product-create-field__label" htmlFor="brand">
                                    Thương hiệu
                                </label>
                                <input
                                    id="brand"
                                    name="brand"
                                    type="text"
                                    className="product-create-field__input"
                                    placeholder="Nhập thương hiệu"
                                    value={form.brand}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="product-create-field product-create-field--full">
                            <label className="product-create-field__label" htmlFor="description">
                                Mô tả ngắn
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                className="product-create-field__textarea"
                                placeholder="Nhập mô tả sản phẩm"
                                rows={4}
                                value={form.description}
                                onChange={handleChange}
                            />
                        </div>
                    </section>

                    <section className="product-create-card">
                        <div className="product-create-card__header">
                            <h2 className="product-create-card__title">Thuộc tính sản phẩm</h2>
                            <button
                                type="button"
                                className="product-create-link-btn"
                                onClick={handleAddAttribute}
                            >
                                + Thêm thuộc tính sản phẩm
                            </button>
                        </div>

                        <div className="product-create-attributes">
                            {attributes.map((attribute) => (
                                <div key={attribute.id} className="product-create-attribute-row">
                                    <div className="product-create-field">
                                        <label className="product-create-field__label">Tên thuộc tính</label>
                                        <input
                                            type="text"
                                            className="product-create-field__input"
                                            placeholder="Ví dụ: Màu sắc"
                                            value={attribute.name}
                                            onChange={(event) =>
                                                handleAttributeChange(
                                                    attribute.id,
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="product-create-field">
                                        <label className="product-create-field__label">Giá trị thuộc tính</label>
                                        <input
                                            type="text"
                                            className="product-create-field__input"
                                            placeholder="Ví dụ: Đỏ, Xanh"
                                            value={attribute.value}
                                            onChange={(event) =>
                                                handleAttributeChange(
                                                    attribute.id,
                                                    'value',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="product-create-remove-btn"
                                        onClick={() => handleRemoveAttribute(attribute.id)}
                                    >
                                        Xóa
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="product-create-sidebar">
                    <section className="product-create-card">
                        <h2 className="product-create-card__title">Trạng thái</h2>
                        <div className="product-create-status">
                            <div>
                                <p className="product-create-status__label">Đang kinh doanh</p>
                                <p className="product-create-status__desc">Hiển thị trên POS</p>
                            </div>
                            <label className="product-create-toggle">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    className="product-create-toggle__input"
                                    checked={form.isActive}
                                    onChange={handleChange}
                                />
                                <span className="product-create-toggle__slider" />
                            </label>
                        </div>
                    </section>

                    <section className="product-create-card">
                        <h2 className="product-create-card__title">Giá cả</h2>

                        <div className="product-create-field">
                            <label className="product-create-field__label" htmlFor="importPrice">
                                Giá nhập (VNĐ) <span className="product-create-field__required">*</span>
                            </label>
                            <input
                                id="importPrice"
                                name="importPrice"
                                type="number"
                                min="0"
                                className={`product-create-field__input${
                                    errors.importPrice ? ' product-create-field__input--error' : ''
                                }`}
                                placeholder="0"
                                value={form.importPrice}
                                onChange={handleChange}
                            />
                            {errors.importPrice && (
                                <span className="product-create-field__error">{errors.importPrice}</span>
                            )}
                        </div>

                        <div className="product-create-field">
                            <label className="product-create-field__label" htmlFor="sellPrice">
                                Giá bán lẻ (VNĐ) <span className="product-create-field__required">*</span>
                            </label>
                            <input
                                id="sellPrice"
                                name="sellPrice"
                                type="number"
                                min="0"
                                className={`product-create-field__input${
                                    errors.sellPrice ? ' product-create-field__input--error' : ''
                                }`}
                                placeholder="0"
                                value={form.sellPrice}
                                onChange={handleChange}
                            />
                            {errors.sellPrice && (
                                <span className="product-create-field__error">{errors.sellPrice}</span>
                            )}
                        </div>

                        <div className="product-create-field">
                            <label className="product-create-field__label" htmlFor="vat">
                                Thuế VAT (%)
                            </label>
                            <input
                                id="vat"
                                name="vat"
                                type="number"
                                min="0"
                                className="product-create-field__input"
                                placeholder="10"
                                value={form.vat}
                                onChange={handleChange}
                            />
                        </div>
                    </section>
                </aside>
            </div>
        </form>
    );
}
