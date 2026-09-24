import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Search, Plus, FolderPlus } from 'lucide-react';
import { removeVietnameseTones, validateSupplierForm } from '../utils/supplierUtils';
import { categoriesApi } from '../../category/api';

const normalizeCategoryText = (str) =>
  (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const findMatchingCategory = (inputName, list = []) => {
  const trimmed = (inputName || '').trim();
  if (!trimmed) return null;
  const normInput = normalizeCategoryText(trimmed);
  const lowerInput = trimmed.toLowerCase();

  // 1. Kiểm tra trùng khớp hoàn toàn (Exact match)
  const exact = list.find((c) => {
    const cName = (c.name || '').trim();
    return cName.toLowerCase() === lowerInput || normalizeCategoryText(cName) === normInput;
  });
  if (exact) {
    return { type: 'exact', category: exact };
  }

  // 2. Kiểm tra dạng chứa (Contains: danh mục cũ chứa từ khóa mới, hoặc từ khóa mới chứa danh mục cũ)
  const contained = list.find((c) => {
    const cName = (c.name || '').trim();
    const cNorm = normalizeCategoryText(cName);
    const cLower = cName.toLowerCase();
    if (!cNorm || !normInput) return false;
    return cLower.includes(lowerInput) || lowerInput.includes(cLower) ||
           cNorm.includes(normInput) || normInput.includes(cNorm);
  });
  if (contained) {
    return { type: 'contain', category: contained };
  }

  return null;
};

const EMPTY_FORM = {
    name: '',
    supplierCode: '',
    categories: '',
    contactPerson: '',
    phoneNumber: '',
    address: '',
    notes: '',
};

export default function SupplierAddNewModal({
    open,
    onClose,
    onSubmit,
    mode = 'create',
    initialSupplier = null,
    submitting = false,
    submitError = '',
}) {
    const isEdit = mode === 'edit';
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});

    const [categoryDropdown, setCategoryDropdown] = useState({
        isOpen: false,
        searchTerm: '',
        selectedCategories: [],
    });

    const [categories, setCategories] = useState([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [categoriesError, setCategoriesError] = useState(null);

    // State for Quick Category Creation Modal
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [createCategoryError, setCreateCategoryError] = useState('');

    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    const suggestedCategoryMatch = useMemo(() => {
        if (!isCreateCategoryModalOpen || !newCategoryName.trim()) return null;
        return findMatchingCategory(newCategoryName, categories);
    }, [isCreateCategoryModalOpen, newCategoryName, categories]);

    const handleOpenCreateCategoryModal = (initialName = '') => {
        setNewCategoryName(initialName);
        setCreateCategoryError('');
        setIsCreateCategoryModalOpen(true);
        setCategoryDropdown((prev) => ({ ...prev, isOpen: false }));
    };

    const handleSaveNewCategory = async (e) => {
        if (e) e.preventDefault();
        const trimmedName = newCategoryName.trim();
        if (!trimmedName) {
            setCreateCategoryError('Vui lòng nhập tên mặt hàng (danh mục).');
            return;
        }

        const match = findMatchingCategory(trimmedName, categories);
        if (match) {
            if (match.type === 'exact') {
                setCreateCategoryError(`Tên danh mục "${match.category.name}" đã tồn tại trong hệ thống.`);
            } else {
                setCreateCategoryError(`Tên danh mục "${trimmedName}" đã trùng hoặc tương tự với danh mục "${match.category.name}" đã có trong hệ thống.`);
            }
            return;
        }

        setCreatingCategory(true);
        setCreateCategoryError('');
        try {
            const created = await categoriesApi.create({
                name: trimmedName,
            });
            const freshList = await categoriesApi.getAllCategories();
            const updatedCategories = Array.isArray(freshList) ? freshList : [];
            setCategories(updatedCategories);

            // Auto-select the newly created category
            const newCat = created?.id
                ? { id: created.id, name: created.name || trimmedName }
                : updatedCategories.find((c) => (c.name || '').trim().toLowerCase() === trimmedName.toLowerCase()) || { id: Date.now(), name: trimmedName };

            if (newCat && newCat.id) {
                setCategoryDropdown((prev) => {
                    const already = prev.selectedCategories.some((c) => c.id === newCat.id);
                    return {
                        ...prev,
                        selectedCategories: already ? prev.selectedCategories : [...prev.selectedCategories, newCat],
                    };
                });
            }

            setIsCreateCategoryModalOpen(false);
        } catch (err) {
            console.error(err);
            setCreateCategoryError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo danh mục.');
        } finally {
            setCreatingCategory(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchCategories();
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        if (isEdit && initialSupplier) {
            setFormData({
                name: initialSupplier.name || '',
                supplierCode: initialSupplier.supplierCode || '',
                categories: '',
                contactPerson: initialSupplier.contactPerson || '',
                phoneNumber: initialSupplier.phoneNumber || '',
                address: initialSupplier.address || '',
                notes: initialSupplier.notes || '',
            });
            setCategoryDropdown({
                isOpen: false,
                searchTerm: '',
                selectedCategories: (initialSupplier.categories || []).map((cat) =>
                    typeof cat === 'string' ? { id: cat, name: cat } : { id: cat.id, name: cat.name },
                ),
            });
        } else {
            let prefillCategories = [];
            if (initialSupplier?.categories && Array.isArray(initialSupplier.categories)) {
                prefillCategories = initialSupplier.categories.map((cat) =>
                    typeof cat === 'string' ? { id: cat, name: cat } : { id: cat.id, name: cat.name },
                );
            } else if (initialSupplier?.categoryId != null || initialSupplier?.categoryName) {
                prefillCategories = [
                    {
                        id: initialSupplier.categoryId ?? initialSupplier.categoryName,
                        name: initialSupplier.categoryName || `Danh mục #${initialSupplier.categoryId}`,
                    },
                ];
            }

            setFormData({
                ...EMPTY_FORM,
                name: initialSupplier?.name || '',
            });
            setCategoryDropdown({
                isOpen: false,
                searchTerm: '',
                selectedCategories: prefillCategories,
            });
        }
        setFieldErrors({});
    }, [open, isEdit, initialSupplier]);

    useEffect(() => {
        if (!categories || categories.length === 0) return;
        setCategoryDropdown((prev) => {
            if (!prev.selectedCategories || prev.selectedCategories.length === 0) return prev;
            let changed = false;
            const updated = prev.selectedCategories.map((sel) => {
                if (typeof sel.id === 'number') {
                    const match = categories.find((c) => c.id === sel.id);
                    if (match && match.name && match.name !== sel.name) {
                        changed = true;
                        return { id: match.id, name: match.name };
                    }
                    return sel;
                }
                const match = categories.find(
                    (c) =>
                        String(c.id) === String(sel.id) ||
                        (sel.name && c.name?.toLowerCase().trim() === sel.name.toLowerCase().trim()) ||
                        (typeof sel.id === 'string' && c.name?.toLowerCase().trim() === sel.id.toLowerCase().trim()),
                );
                if (match) {
                    changed = true;
                    return { id: match.id, name: match.name };
                }
                return sel;
            });
            return changed ? { ...prev, selectedCategories: updated } : prev;
        });
    }, [categories]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setCategoryDropdown((prev) => ({ ...prev, isOpen: false }));
            }
        };

        if (categoryDropdown.isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [categoryDropdown.isOpen]);

    useEffect(() => {
        if (categoryDropdown.isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [categoryDropdown.isOpen]);

    const fetchCategories = async () => {
        setIsLoadingCategories(true);
        setCategoriesError(null);
        try {
            const response = await categoriesApi.getAllCategories();
            setCategories(response);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setCategoriesError('Không thể tải danh sách mặt hàng');
        } finally {
            setIsLoadingCategories(false);
        }
    };

    if (!open) {
        return null;
    }

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const isCategoryMatched = (sel, category) => {
        if (!sel || !category) return false;
        if (sel.id != null && category.id != null && String(sel.id) === String(category.id)) return true;
        if (sel.name && category.name && sel.name.trim().toLowerCase() === category.name.trim().toLowerCase()) return true;
        return false;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const errors = validateSupplierForm(formData);
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        const resolvedCategories = categoryDropdown.selectedCategories
            .map((cat) => {
                if (typeof cat.id === 'number') return { id: cat.id };
                const match = categories.find(
                    (c) =>
                        String(c.id) === String(cat.id) ||
                        (cat.name && c.name?.toLowerCase().trim() === cat.name.toLowerCase().trim()) ||
                        (typeof cat.id === 'string' && c.name?.toLowerCase().trim() === cat.id.toLowerCase().trim()),
                );
                return match ? { id: match.id } : null;
            })
            .filter(Boolean);

        onSubmit({
            name: formData.name.trim(),
            ...(isEdit ? { supplierCode: formData.supplierCode } : {}),
            categories: resolvedCategories,
            contactPerson: formData.contactPerson.trim(),
            phoneNumber: formData.phoneNumber.trim(),
            address: formData.address.trim(),
            notes: formData.notes.trim(),
        });
    };

    const toggleDropdown = () => {
        setCategoryDropdown((prev) => ({
            ...prev,
            isOpen: !prev.isOpen,
            searchTerm: '',
        }));
    };

    const handleCategorySelect = (category) => {
        setCategoryDropdown((prev) => {
            const isAlreadySelected = prev.selectedCategories.some((cat) => isCategoryMatched(cat, category));

            if (isAlreadySelected) {
                return {
                    ...prev,
                    selectedCategories: prev.selectedCategories.filter((cat) => !isCategoryMatched(cat, category)),
                    searchTerm: '',
                };
            }
            return {
                ...prev,
                selectedCategories: [...prev.selectedCategories, category],
                searchTerm: '',
            };
        });
    };

    const handleRemoveCategory = (categoryId) => {
        setCategoryDropdown((prev) => ({
            ...prev,
            selectedCategories: prev.selectedCategories.filter(
                (cat) => cat.id !== categoryId && cat.name !== categoryId,
            ),
        }));
    };

    const handleSearchChange = (event) => {
        setCategoryDropdown((prev) => ({
            ...prev,
            searchTerm: event.target.value,
        }));
    };

    const filteredCategories = categories.filter((category) => {
        const searchLower = removeVietnameseTones(categoryDropdown.searchTerm);
        return removeVietnameseTones(category.name.toLowerCase()).includes(searchLower);
    });

    const fieldClass = (name) =>
        `supplier-modal__field${fieldErrors[name] ? ' supplier-modal__field--error' : ''}`;

    return createPortal(
        <div
            className="supplier-modal-overlay supplier-modal-overlay--stacked"
            role="presentation"
        >
            <div
                className="supplier-modal supplier-modal--add"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplier-form-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="supplier-form-title" className="supplier-modal__title">
                        {isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                    </h2>
                    <button type="button" className="supplier-modal__close" onClick={onClose} aria-label="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <form className="supplier-modal__body" onSubmit={handleSubmit} noValidate>
                    {submitError && <p className="supplier-modal__error">{submitError}</p>}

                    <label className={fieldClass('name')}>
                        <span>
                            Tên nhà cung cấp <span style={{ color: 'red' }}>*</span>
                        </span>
                        <input
                            type="text"
                            name="name"
                            placeholder="Nhập tên nhà cung cấp"
                            value={formData.name}
                            onChange={handleInputChange}
                            maxLength={150}
                            disabled={submitting}
                            aria-invalid={!!fieldErrors.name}
                        />
                        {fieldErrors.name && (
                            <span className="supplier-modal__field-error">{fieldErrors.name}</span>
                        )}
                    </label>

                    <div className="supplier-modal__form-row">
                        <label className="supplier-modal__field supplier-modal__field--half">
                            <span>Mặt hàng cung cấp</span>
                            <div className="supplier-dropdown" ref={dropdownRef}>
                                <button
                                    type="button"
                                    className="supplier-dropdown__trigger"
                                    onClick={toggleDropdown}
                                    aria-haspopup="listbox"
                                    aria-expanded={categoryDropdown.isOpen}
                                    disabled={submitting}
                                >
                                    <span className="supplier-dropdown__value">
                                        {categoryDropdown.selectedCategories.length > 0
                                            ? `${categoryDropdown.selectedCategories.length} mặt hàng đã chọn`
                                            : 'Chọn mặt hàng cung cấp ...'}
                                    </span>
                                    <ChevronDown
                                        size={18}
                                        className={`supplier-dropdown__icon ${categoryDropdown.isOpen ? 'supplier-dropdown__icon--open' : ''}`}
                                    />
                                </button>

                                {categoryDropdown.selectedCategories.length > 0 && (
                                    <div className="supplier-dropdown__tags">
                                        {categoryDropdown.selectedCategories.map((category) => (
                                            <span key={category.id} className="supplier-dropdown__tag">
                                                {category.name}
                                                <button
                                                    type="button"
                                                    className="supplier-dropdown__tag-remove"
                                                    onClick={() => handleRemoveCategory(category.id)}
                                                    aria-label={`Xóa ${category.name}`}
                                                    disabled={submitting}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {categoryDropdown.isOpen && (
                                    <div className="supplier-dropdown__menu">
                                        <div className="supplier-dropdown__search" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    className="supplier-dropdown__search-input"
                                                    placeholder="Tìm kiếm mặt hàng..."
                                                    value={categoryDropdown.searchTerm}
                                                    onChange={handleSearchChange}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: '100%', paddingLeft: '30px' }}
                                                />
                                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                            </div>
                                            <button
                                                type="button"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    padding: '7px 10px',
                                                    background: '#004AC6',
                                                    color: '#FFFFFF',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0,
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenCreateCategoryModal(categoryDropdown.searchTerm);
                                                }}
                                                title="Thêm nhanh mặt hàng mới"
                                            >
                                                <Plus size={13} />
                                                Tạo mới
                                            </button>
                                        </div>

                                        <div className="supplier-dropdown__list">
                                            {isLoadingCategories ? (
                                                <div className="supplier-dropdown__empty">
                                                    Đang tải danh sách mặt hàng...
                                                </div>
                                            ) : categoriesError ? (
                                                <div className="supplier-dropdown__empty" style={{ color: '#dc2626' }}>
                                                    {categoriesError}
                                                    <button
                                                        type="button"
                                                        onClick={fetchCategories}
                                                        style={{
                                                            display: 'block',
                                                            margin: '8px auto 0',
                                                            padding: '6px 12px',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '6px',
                                                            background: '#fff',
                                                            color: '#2563eb',
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Thử lại
                                                    </button>
                                                </div>
                                            ) : filteredCategories.length > 0 ? (
                                                filteredCategories.map((category) => (
                                                    <button
                                                        key={category.id}
                                                        type="button"
                                                        className={`supplier-dropdown__item ${
                                                            categoryDropdown.selectedCategories.some(
                                                                (cat) => isCategoryMatched(cat, category),
                                                            )
                                                                ? 'supplier-dropdown__item--selected'
                                                                : ''
                                                        }`}
                                                        onClick={() => handleCategorySelect(category)}
                                                    >
                                                        <span className="supplier-dropdown__item-checkbox">
                                                            {categoryDropdown.selectedCategories.some(
                                                                (cat) => isCategoryMatched(cat, category),
                                                            ) && '✓'}
                                                        </span>
                                                        <span>
                                                            {category.name}
                                                            {category.description && (
                                                                <span
                                                                    style={{
                                                                        marginLeft: '6px',
                                                                        color: '#94a3b8',
                                                                        fontSize: '12px',
                                                                    }}
                                                                >
                                                                    ({category.description})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="supplier-dropdown__empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 10px' }}>
                                                    <span>{categoryDropdown.searchTerm ? `Không tìm thấy mặt hàng "${categoryDropdown.searchTerm}"` : 'Không có mặt hàng nào'}</span>
                                                    <button
                                                        type="button"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            padding: '6px 12px',
                                                            background: '#004AC6',
                                                            color: '#FFFFFF',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenCreateCategoryModal(categoryDropdown.searchTerm);
                                                        }}
                                                    >
                                                        <Plus size={13} />
                                                        {categoryDropdown.searchTerm ? `Tạo mặt hàng "${categoryDropdown.searchTerm}"` : 'Tạo mặt hàng mới'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </label>

                        <label className={`${fieldClass('contactPerson')} supplier-modal__field--half`}>
                            <span>Người liên hệ</span>
                            <input
                                type="text"
                                name="contactPerson"
                                placeholder="Nguyễn Trần Minh Anh"
                                value={formData.contactPerson}
                                onChange={handleInputChange}
                                maxLength={100}
                                disabled={submitting}
                                aria-invalid={!!fieldErrors.contactPerson}
                            />
                            {fieldErrors.contactPerson && (
                                <span className="supplier-modal__field-error">{fieldErrors.contactPerson}</span>
                            )}
                        </label>
                    </div>

                    <label className={fieldClass('phoneNumber')}>
                        <span>Số điện thoại</span>
                        <input
                            type="tel"
                            name="phoneNumber"
                            placeholder="09xx xxx xxx"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            maxLength={15}
                            disabled={submitting}
                            aria-invalid={!!fieldErrors.phoneNumber}
                        />
                        {fieldErrors.phoneNumber && (
                            <span className="supplier-modal__field-error">{fieldErrors.phoneNumber}</span>
                        )}
                    </label>

                    <label className={fieldClass('address')}>
                        <span>Địa chỉ</span>
                        <textarea
                            name="address"
                            rows={3}
                            placeholder="Số nhà, tên đường, phường/xã..."
                            value={formData.address}
                            onChange={handleInputChange}
                            maxLength={255}
                            disabled={submitting}
                            aria-invalid={!!fieldErrors.address}
                        />
                        {fieldErrors.address && (
                            <span className="supplier-modal__field-error">{fieldErrors.address}</span>
                        )}
                    </label>
                    <label className={fieldClass('notes')}>
                        <span>Ghi chú</span>
                        <textarea
                            name="notes"
                            rows={3}
                            placeholder="Ghi chú..."
                            value={formData.notes}
                            onChange={handleInputChange}
                            maxLength={255}
                            disabled={submitting}
                            aria-invalid={!!fieldErrors.notes}
                        />
                        {fieldErrors.notes && (
                            <span className="supplier-modal__field-error">{fieldErrors.notes}</span>
                        )}
                    </label>
                    <div className="supplier-modal__footer">
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--secondary"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="supplier-btn supplier-btn--primary"
                            disabled={submitting}
                        >
                            {submitting
                                ? 'Đang lưu...'
                                : isEdit
                                  ? 'Lưu thay đổi'
                                  : 'Thêm nhà cung cấp'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Nested Modal: Thêm nhanh mặt hàng (Danh mục) */}
            {isCreateCategoryModalOpen && (
                <div
                    className="supplier-modal-overlay supplier-modal-overlay--nested"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 13000,
                        backdropFilter: 'blur(2px)',
                    }}
                    role="presentation"
                >
                    <div
                        className="supplier-modal"
                        style={{
                            width: '100%',
                            maxWidth: 440,
                            background: '#FFFFFF',
                            borderRadius: 12,
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                borderBottom: '1px solid #E2E8F0',
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: '#0F172A',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <FolderPlus size={18} color="#004AC6" />
                                Thêm nhanh mặt hàng (Danh mục)
                            </h3>
                            <button
                                type="button"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748B',
                                    cursor: 'pointer',
                                    padding: 4,
                                    borderRadius: 6,
                                }}
                                onClick={() => setIsCreateCategoryModalOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNewCategory}>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {createCategoryError && (
                                    <div
                                        style={{
                                            padding: '8px 12px',
                                            background: '#FEE2E2',
                                            border: '1px solid #FECACA',
                                            borderRadius: 6,
                                            color: '#DC2626',
                                            fontSize: 13,
                                        }}
                                    >
                                        {createCategoryError}
                                    </div>
                                )}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            fontSize: 13,
                                            fontWeight: 500,
                                            color: '#334155',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Tên mặt hàng (Danh mục) <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: 6,
                                            fontSize: 14,
                                            color: '#0F172A',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                        placeholder="Nhập tên mặt hàng (ví dụ: Nước ngọt, Gia vị...)"
                                        value={newCategoryName}
                                        onChange={(e) => {
                                            setNewCategoryName(e.target.value);
                                            if (createCategoryError) setCreateCategoryError('');
                                        }}
                                        required
                                        autoFocus
                                    />
                                </div>

                                {suggestedCategoryMatch && (
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            background: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            borderRadius: 6,
                                            color: '#1E40AF',
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                        }}
                                    >
                                        <span>
                                            {suggestedCategoryMatch.type === 'exact'
                                                ? 'Đã có danh mục trùng tên: '
                                                : 'Đã có danh mục tương tự: '}
                                            <strong>{suggestedCategoryMatch.category.name}</strong>
                                        </span>
                                        <button
                                            type="button"
                                            style={{
                                                padding: '4px 10px',
                                                background: '#004AC6',
                                                color: '#FFFFFF',
                                                border: 'none',
                                                borderRadius: 4,
                                                fontSize: 12,
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                            }}
                                            onClick={() => {
                                                const matched = suggestedCategoryMatch.category;
                                                setCategoryDropdown((prev) => {
                                                    const already = prev.selectedCategories.some((c) => c.id === matched.id);
                                                    return {
                                                        ...prev,
                                                        selectedCategories: already
                                                            ? prev.selectedCategories
                                                            : [...prev.selectedCategories, matched],
                                                    };
                                                });
                                                setIsCreateCategoryModalOpen(false);
                                            }}
                                        >
                                            Chọn luôn
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    padding: '12px 20px',
                                    background: '#F8FAFC',
                                    borderTop: '1px solid #E2E8F0',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: 10,
                                }}
                            >
                                <button
                                    type="button"
                                    style={{
                                        padding: '8px 16px',
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: 6,
                                        color: '#475569',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setIsCreateCategoryModalOpen(false)}
                                    disabled={creatingCategory}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '8px 18px',
                                        background: '#004AC6',
                                        border: 'none',
                                        borderRadius: 6,
                                        color: '#FFFFFF',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                    disabled={creatingCategory}
                                >
                                    {creatingCategory ? 'Đang lưu...' : 'Lưu mặt hàng'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>,
        document.body,
    );
}
