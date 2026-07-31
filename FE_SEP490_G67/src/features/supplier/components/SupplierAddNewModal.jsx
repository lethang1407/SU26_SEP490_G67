import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { removeVietnameseTones } from '../utils/supplierUtils';
import { suppliersApi } from '../api';
import { categoriesApi } from '../../category/api';
export default function SupplierAddNewModal({ open, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        name: '',
        categories: '',
        contactPerson: '',
        phoneNumber: '',
        address: '',
        notes: '',
    });

    const [categoryDropdown, setCategoryDropdown] = useState({
        isOpen: false,
        searchTerm: '',
        selectedCategories: [], // Changed to array for multiple selection
    });

    const [categories, setCategories] = useState([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [categoriesError, setCategoriesError] = useState(null);

    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Fetch categories when modal opens
    useEffect(() => {
        if (open && categories.length === 0) {
            fetchCategories();
        }
    }, [open]);

    // Close dropdown when clicking outside
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

    // Focus search input when dropdown opens
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
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        // Send data in the format expected by backend
        onSubmit({
            name: formData.name,
            categories: categoryDropdown.selectedCategories.map(cat => ({ id: cat.id })),
            contactPerson: formData.contactPerson,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            notes: formData.notes,
        });
        // Reset form
        setFormData({
            name: '',
            categories: '',
            contactPerson: '',
            phoneNumber: '',
            address: '',
            notes: '',
        });
        setCategoryDropdown({
            isOpen: false,
            searchTerm: '',
            selectedCategories: [],
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
            const isAlreadySelected = prev.selectedCategories.some(cat => cat.id === category.id);

            if (isAlreadySelected) {
                // Remove if already selected
                return {
                    ...prev,
                    selectedCategories: prev.selectedCategories.filter(cat => cat.id !== category.id),
                    searchTerm: '',
                };
            } else {
                // Add to selection
                return {
                    ...prev,
                    selectedCategories: [...prev.selectedCategories, category],
                    searchTerm: '',
                };
            }
        });
    };

    const handleRemoveCategory = (categoryId) => {
        setCategoryDropdown((prev) => ({
            ...prev,
            selectedCategories: prev.selectedCategories.filter(cat => cat.id !== categoryId),
        }));
    };

    const handleSearchChange = (event) => {
        setCategoryDropdown((prev) => ({
            ...prev,
            searchTerm: event.target.value,
        }));
    };

    // Filter categories based on search term (only search by name)
    const filteredCategories = categories.filter((category) => {
        const searchLower = removeVietnameseTones(categoryDropdown.searchTerm);
        return removeVietnameseTones(category.name.toLowerCase()).includes(searchLower);
    });

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-modal--add"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplier-add-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="supplier-add-title" className="supplier-modal__title">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginRight: '8px', verticalAlign: 'middle' }}
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        Thêm nhà cung cấp mới
                    </h2>
                    <button type="button" className="supplier-modal__close" onClick={onClose} aria-label="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <form className="supplier-modal__body" onSubmit={handleSubmit}>
                    <div className="supplier-modal__form-row">
                        <label className="supplier-modal__field supplier-modal__field--half">
                            <span>
                                Tên nhà cung cấp <span style={{ color: 'red' }}>*</span>
                            </span>
                            <input
                                type="text"
                                name="name"
                                placeholder="Nhập tên nhà cung cấp"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </label>


                        <label className="supplier-modal__field supplier-modal__field--half">
                            <span>Người liên hệ</span>
                            <input
                                type="text"
                                name="contactPerson"
                                placeholder="Nguyễn Trần Minh Anh"
                                value={formData.contactPerson}
                                onChange={handleInputChange}
                            />
                        </label>
                    </div>

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
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {categoryDropdown.isOpen && (
                                    <div className="supplier-dropdown__menu">
                                        <div className="supplier-dropdown__search">
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                className="supplier-dropdown__search-input"
                                                placeholder="Tìm kiếm..."
                                                value={categoryDropdown.searchTerm}
                                                onChange={handleSearchChange}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <Search size={16} className="supplier-dropdown__search-icon " />
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
                                                            cursor: 'pointer'
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
                                                        className={`supplier-dropdown__item ${categoryDropdown.selectedCategories.some(
                                                            cat => cat.id === category.id
                                                        )
                                                            ? 'supplier-dropdown__item--selected'
                                                            : ''
                                                            }`}
                                                        onClick={() => handleCategorySelect(category)}
                                                    >
                                                        <span className="supplier-dropdown__item-checkbox">
                                                            {categoryDropdown.selectedCategories.some(
                                                                cat => cat.id === category.id
                                                            ) && '✓'}
                                                        </span>
                                                        <span>
                                                            {category.name}
                                                            {category.description && (
                                                                <span style={{ marginLeft: '6px', color: '#94a3b8', fontSize: '12px' }}>
                                                                    ({category.description})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="supplier-dropdown__empty">
                                                    {categoryDropdown.searchTerm ? 'Không tìm thấy kết quả' : 'Không có mặt hàng nào'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </label>
                        <label className="supplier-modal__field">
                            <span>Số điện thoại</span>
                            <input
                                type="tel"
                                name="phoneNumber"
                                placeholder="09xx xxx xxx"
                                value={formData.phoneNumber}
                                onChange={handleInputChange}
                            />
                        </label>
                    </div>
                    <label className="supplier-modal__field">
                        <span>Địa chỉ</span>
                        <textarea
                            name="address"
                            rows={3}
                            placeholder="Số nhà, tên đường, phường/xã..."
                            value={formData.address}
                            onChange={handleInputChange}
                        />
                    </label>
                    <label className="supplier-modal__field">
                        <span>Ghi chú</span>
                        <textarea
                            name="notes"
                            rows={3}
                            placeholder="Ghi chú..."
                            value={formData.notes}
                            onChange={handleInputChange}
                        />
                    </label>
                    <div className="supplier-modal__footer">
                        <button type="button" className="supplier-btn supplier-btn--secondary" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="supplier-btn supplier-btn--primary">
                            Thêm nhà cung cấp
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}