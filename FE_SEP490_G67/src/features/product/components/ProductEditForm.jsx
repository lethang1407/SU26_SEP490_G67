import { useEffect, useMemo, useState } from 'react';
import { categoriesApi } from '../../category/api';
import { PRODUCT_CATEGORIES } from '../constants';
import { resolveProductImageUrl, validateProductImageFile } from '../utils/productImageUtils';

function createConversionUnit(baseUnitName) {
    return {
        id: crypto.randomUUID(),
        name: '',
        ratio: '',
        sellPrice: '',
        baseUnitName,
    };
}

function mapProductToForm(product) {
    return {
        name: product.name ?? '',
        code: product.code ?? '',
        barcode: product.barcode ?? '',
        category: product.category ?? '',
        description: product.description ?? '',
        importPrice: String(product.importPrice ?? ''),
        sellPrice: String(product.sellPrice ?? ''),
        businessStatus: product.businessStatus ?? 'active',
        baseUnit: {
            name: product.baseUnit?.name ?? 'Chai',
            sellPrice: String(product.baseUnit?.sellPrice ?? product.sellPrice ?? ''),
        },
        conversionUnits: (product.conversionUnits ?? []).map((unit) => ({
            ...unit,
            ratio: String(unit.ratio ?? ''),
            sellPrice: String(unit.sellPrice ?? ''),
        })),
        productImg: product.productImg ?? null,
    };
}

export default function ProductEditForm({ formId, product, isSubmitting = false, onSubmit }) {
    const [form, setForm] = useState(() => mapProductToForm(product));
    const [errors, setErrors] = useState({});
    const [categories, setCategories] = useState(PRODUCT_CATEGORIES);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        setForm(mapProductToForm(product));
        setImageFile(null);
        setImagePreview(null);
        setErrors({});
    }, [product]);

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

    useEffect(() => {
        return () => {
            if (imagePreview?.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const currentImageUrl = useMemo(() => {
        if (imagePreview) {
            return imagePreview;
        }

        return resolveProductImageUrl(form.productImg);
    }, [form.productImg, imagePreview]);

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        setErrors((prev) => ({ ...prev, image: null }));

        if (!file) {
            return;
        }

        const validationMessage = validateProductImageFile(file);
        if (validationMessage) {
            setErrors((prev) => ({ ...prev, image: validationMessage }));
            event.target.value = '';
            return;
        }

        if (imagePreview?.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        event.target.value = '';
    };

    const handleRemoveImage = () => {
        if (imagePreview?.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
        setImageFile(null);
        setImagePreview(null);
        setForm((prev) => ({ ...prev, productImg: null }));
        setErrors((prev) => ({ ...prev, image: null }));
    };

    const profitMargin = useMemo(() => {
        const sell = Number(form.sellPrice);
        const importPrice = Number(form.importPrice);

        if (!sell || sell <= 0) {
            return '0.0';
        }

        return (((sell - importPrice) / sell) * 100).toFixed(1);
    }, [form.sellPrice, form.importPrice]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const handleBaseUnitChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            baseUnit: { ...prev.baseUnit, [field]: value },
        }));
    };

    const handleConversionChange = (id, field, value) => {
        setForm((prev) => ({
            ...prev,
            conversionUnits: prev.conversionUnits.map((unit) =>
                unit.id === id ? { ...unit, [field]: value } : unit,
            ),
        }));
    };

    const handleAddConversionUnit = () => {
        setForm((prev) => ({
            ...prev,
            conversionUnits: [...prev.conversionUnits, createConversionUnit(prev.baseUnit.name)],
        }));
    };

    const handleRemoveConversionUnit = (id) => {
        setForm((prev) => ({
            ...prev,
            conversionUnits: prev.conversionUnits.filter((unit) => unit.id !== id),
        }));
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!form.name.trim()) {
            nextErrors.name = 'Vui lòng nhập tên sản phẩm.';
        }
        if (!form.category) {
            nextErrors.category = 'Vui lòng chọn danh mục.';
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
            importPrice: Number(form.importPrice) || 0,
            sellPrice: Number(form.sellPrice) || 0,
            baseUnit: {
                ...form.baseUnit,
                sellPrice: Number(form.baseUnit.sellPrice) || 0,
            },
            conversionUnits: form.conversionUnits
                .filter((unit) => unit.name.trim())
                .map((unit) => ({
                    ...unit,
                    ratio: Number(unit.ratio) || 0,
                    sellPrice: Number(unit.sellPrice) || 0,
                })),
            imageFile,
        });
    };

    return (
        <form id={formId} className="product-edit-form" onSubmit={handleSubmit} noValidate>
            <fieldset disabled={isSubmitting} className="product-edit-form__fieldset">
            <div className="product-create-layout">
                <div className="product-create-main">
                    <section className="product-create-card">
                        <h2 className="product-create-card__title">Thông tin cơ bản</h2>

                        <div className="product-create-field product-create-field--full">
                            <label className="product-create-field__label" htmlFor="edit-name">
                                Tên sản phẩm <span className="product-create-field__required">*</span>
                            </label>
                            <input
                                id="edit-name"
                                name="name"
                                type="text"
                                className={`product-create-field__input${
                                    errors.name ? ' product-create-field__input--error' : ''
                                }`}
                                value={form.name}
                                onChange={handleChange}
                            />
                            {errors.name && (
                                <span className="product-create-field__error">{errors.name}</span>
                            )}
                        </div>

                        <div className="product-create-fields product-create-fields--two-col">
                            <div className="product-create-field">
                                <label className="product-create-field__label" htmlFor="edit-code">
                                    Mã sản phẩm (SKU)
                                </label>
                                <input
                                    id="edit-code"
                                    name="code"
                                    type="text"
                                    className="product-create-field__input product-create-field__input--readonly"
                                    value={form.code}
                                    readOnly
                                />
                            </div>
                            <div className="product-create-field">
                                <label className="product-create-field__label" htmlFor="edit-barcode">
                                    Mã vạch (Barcode)
                                </label>
                                <input
                                    id="edit-barcode"
                                    name="barcode"
                                    type="text"
                                    className="product-create-field__input product-create-field__input--readonly"
                                    value={form.barcode}
                                    readOnly
                                />
                            </div>
                        </div>

                        <div className="product-create-field product-create-field--full">
                            <label className="product-create-field__label" htmlFor="edit-category">
                                Danh mục <span className="product-create-field__required">*</span>
                            </label>
                            <select
                                id="edit-category"
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

                        <div className="product-edit-units">
                            <div className="product-edit-units__header">
                                <h3 className="product-edit-units__title">Quản lý đơn vị tính</h3>
                                <button
                                    type="button"
                                    className="product-create-link-btn"
                                    onClick={handleAddConversionUnit}
                                >
                                    + Thêm đơn vị quy đổi
                                </button>
                            </div>

                            <div className="product-edit-base-unit">
                                <div className="product-edit-base-unit__badge">Đơn vị cơ bản</div>
                                <div className="product-edit-base-unit__fields">
                                    <div className="product-create-field">
                                        <label className="product-create-field__label">Đơn vị</label>
                                        <input
                                            type="text"
                                            className="product-create-field__input"
                                            value={form.baseUnit.name}
                                            onChange={(event) =>
                                                handleBaseUnitChange('name', event.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="product-create-field">
                                        <label className="product-create-field__label">Giá bán lẻ</label>
                                        <div className="product-edit-currency-input">
                                            <input
                                                type="number"
                                                min="0"
                                                className="product-create-field__input"
                                                value={form.baseUnit.sellPrice}
                                                onChange={(event) =>
                                                    handleBaseUnitChange('sellPrice', event.target.value)
                                                }
                                            />
                                            <span className="product-edit-currency-input__suffix">đ</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="product-edit-base-unit__hint">
                                    Đơn vị nhỏ nhất dùng để tính kho
                                </p>
                            </div>

                            {form.conversionUnits.map((unit) => (
                                <div key={unit.id} className="product-edit-conversion-row">
                                    <div className="product-create-field">
                                        <label className="product-create-field__label">Đơn vị quy đổi</label>
                                        <input
                                            type="text"
                                            className="product-create-field__input"
                                            placeholder="Ví dụ: Lốc"
                                            value={unit.name}
                                            onChange={(event) =>
                                                handleConversionChange(unit.id, 'name', event.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="product-create-field">
                                        <label className="product-create-field__label">Quy đổi</label>
                                        <div className="product-edit-ratio-input">
                                            <span className="product-edit-ratio-input__prefix">=</span>
                                            <input
                                                type="number"
                                                min="1"
                                                className="product-create-field__input"
                                                value={unit.ratio}
                                                onChange={(event) =>
                                                    handleConversionChange(
                                                        unit.id,
                                                        'ratio',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <span className="product-edit-ratio-input__suffix">
                                                {form.baseUnit.name}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="product-create-field">
                                        <label className="product-create-field__label">Giá bán lẻ</label>
                                        <div className="product-edit-currency-input">
                                            <input
                                                type="number"
                                                min="0"
                                                className="product-create-field__input"
                                                value={unit.sellPrice}
                                                onChange={(event) =>
                                                    handleConversionChange(
                                                        unit.id,
                                                        'sellPrice',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <span className="product-edit-currency-input__suffix">đ</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="product-create-remove-btn product-edit-conversion-row__remove"
                                        onClick={() => handleRemoveConversionUnit(unit.id)}
                                    >
                                        Xóa
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="product-create-field product-create-field--full">
                            <label className="product-create-field__label" htmlFor="edit-description">
                                Mô tả ngắn
                            </label>
                            <textarea
                                id="edit-description"
                                name="description"
                                className="product-create-field__textarea"
                                rows={4}
                                value={form.description}
                                onChange={handleChange}
                            />
                        </div>
                    </section>

                    <section className="product-create-card">
                        <h2 className="product-create-card__title">Hình ảnh sản phẩm</h2>
                        <p className="product-edit-images__hint">
                            Tải lên ảnh sản phẩm chất lượng cao. Hỗ trợ JPG, PNG (Tối đa 5MB).
                        </p>
                        <div className="product-edit-images product-edit-images--single">
                            {currentImageUrl ? (
                                <div className="product-image-preview product-image-preview--edit">
                                    <img
                                        src={currentImageUrl}
                                        alt="Ảnh sản phẩm"
                                        className="product-image-preview__img"
                                    />
                                    <button
                                        type="button"
                                        className="product-create-link-btn"
                                        onClick={handleRemoveImage}
                                        disabled={isSubmitting}
                                    >
                                        Xóa ảnh
                                    </button>
                                </div>
                            ) : (
                                <label className="product-edit-image-add">
                                    <input
                                        type="file"
                                        className="product-create-upload__input"
                                        accept="image/jpeg,image/png"
                                        onChange={handleImageChange}
                                        disabled={isSubmitting}
                                    />
                                    <span className="product-edit-image-add__text">Thêm ảnh</span>
                                </label>
                            )}
                            {currentImageUrl && (
                                <label className="product-edit-image-add product-edit-image-add--secondary">
                                    <input
                                        type="file"
                                        className="product-create-upload__input"
                                        accept="image/jpeg,image/png"
                                        onChange={handleImageChange}
                                        disabled={isSubmitting}
                                    />
                                    <span className="product-edit-image-add__text">Đổi ảnh</span>
                                </label>
                            )}
                        </div>
                        {errors.image && (
                            <span className="product-create-field__error">{errors.image}</span>
                        )}
                    </section>
                </div>

                <aside className="product-create-sidebar">
                    <section className="product-create-card">
                        <h2 className="product-create-card__title">Giá cả</h2>

                        <div className="product-create-field">
                            <label className="product-create-field__label" htmlFor="edit-importPrice">
                                Giá nhập (VNĐ)
                            </label>
                            <div className="product-edit-currency-input">
                                <input
                                    id="edit-importPrice"
                                    name="importPrice"
                                    type="number"
                                    min="0"
                                    className="product-create-field__input"
                                    value={form.importPrice}
                                    onChange={handleChange}
                                />
                                <span className="product-edit-currency-input__suffix">đ</span>
                            </div>
                        </div>

                        <div className="product-create-field">
                            <label className="product-create-field__label" htmlFor="edit-sellPrice">
                                Giá bán lẻ (VNĐ){' '}
                                <span className="product-create-field__required">*</span>
                            </label>
                            <div className="product-edit-currency-input">
                                <input
                                    id="edit-sellPrice"
                                    name="sellPrice"
                                    type="number"
                                    min="0"
                                    className={`product-create-field__input${
                                        errors.sellPrice ? ' product-create-field__input--error' : ''
                                    }`}
                                    value={form.sellPrice}
                                    onChange={handleChange}
                                />
                                <span className="product-edit-currency-input__suffix">đ</span>
                            </div>
                            {errors.sellPrice && (
                                <span className="product-create-field__error">{errors.sellPrice}</span>
                            )}
                        </div>

                        <div className="product-edit-profit">
                            <span className="product-edit-profit__label">Biên độ lợi nhuận</span>
                            <span className="product-edit-profit__value">{profitMargin}%</span>
                        </div>
                    </section>

                    <section className="product-create-card">
                        <h2 className="product-create-card__title">Trạng thái kinh doanh</h2>
                        <div className="product-edit-status-options">
                            <label className="product-edit-status-option">
                                <input
                                    type="radio"
                                    name="businessStatus"
                                    value="active"
                                    checked={form.businessStatus === 'active'}
                                    onChange={handleChange}
                                />
                                <span className="product-edit-status-option__label">Đang bán</span>
                            </label>
                            <label className="product-edit-status-option">
                                <input
                                    type="radio"
                                    name="businessStatus"
                                    value="inactive"
                                    checked={form.businessStatus === 'inactive'}
                                    onChange={handleChange}
                                />
                                <span className="product-edit-status-option__label">Ngừng kinh doanh</span>
                            </label>
                        </div>
                    </section>
                </aside>
            </div>
            </fieldset>
        </form>
    );
}
