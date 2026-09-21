import { useState, useRef, useLayoutEffect, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Building2, Sparkles, Phone, Tag } from 'lucide-react';

/**
 * Chuẩn hóa chuỗi tiếng Việt:
 * - Chuyển chữ thường
 * - Loại bỏ toàn bộ dấu thanh, dấu mũ
 * - Thay thế đ/Đ -> d
 * - Thu gọn nhiều khoảng trắng thừa liên tiếp thành 1 khoảng trắng và trim
 */
export function removeVietnameseDiacritics(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Thuật toán tìm kiếm Tiếng Việt chuyên sâu:
 * - Hỗ trợ gõ có dấu / không dấu
 * - Không phân biệt chữ hoa / chữ thường
 * - Xử lý khoảng trống đầu/cuối và nhiều khoảng trống liên tiếp
 * - Hỗ trợ tìm kiếm đa từ khóa (Multi-token match)
 */
export function matchVietnameseSearch(target, query) {
  if (!query || !query.trim()) return true;
  if (!target) return false;

  const rawTarget = String(target).toLowerCase();
  const rawQuery = String(query).trim().toLowerCase();

  // Khớp trực tiếp cả dấu nguyên bản
  if (rawTarget.includes(rawQuery)) return true;

  // Khớp sau khi đã chuẩn hóa không dấu và khoảng trắng
  const normTarget = removeVietnameseDiacritics(target);
  const normQuery = removeVietnameseDiacritics(query);
  if (!normQuery) return true;

  if (normTarget.includes(normQuery)) return true;

  // Khớp từng từ khóa rời rạc (Multi-word search: e.g. "vina ha noi" -> ["vina", "ha", "noi"])
  const tokens = normQuery.split(' ').filter(Boolean);
  return tokens.every((token) => normTarget.includes(token));
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '';
  return `${Number(n).toLocaleString('vi-VN')} đ`;
}

export default function SupplierSearchDropdown({
  value,
  options = [],
  onChange,
  placeholder = '-- Chọn nhà cung cấp --',
  disabled = false,
  className = '',
  unitBase = 1,
  unitName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Tìm nhà cung cấp đang được chọn
  const selectedSupplier = useMemo(() => {
    if (value === '' || value == null) return null;
    return options.find((opt) => String(opt.id) === String(value)) || null;
  }, [options, value]);

  // Lọc danh sách theo từ khóa tìm kiếm tiếng Việt
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;

    return options.filter((s) => {
      const name = s.name || '';
      const code = s.code || '';
      const phone = s.phoneNumber || s.phone || '';
      const contactPerson = s.contactPerson || '';
      const combined = `${name} ${code} ${phone} ${contactPerson}`;

      return matchVietnameseSearch(combined, searchTerm);
    });
  }, [options, searchTerm]);

  // Cập nhật tọa độ hiển thị Dropdown Portal
  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPad = 8;
    const preferredHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(preferredHeight, Math.max(160, openUp ? spaceAbove - 6 : spaceBelow - 6));

    const dropdownWidth = Math.max(rect.width, 320);
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - viewportPad) {
      left = Math.max(viewportPad, window.innerWidth - dropdownWidth - viewportPad);
    }

    setMenuStyle({
      position: 'fixed',
      left: Math.round(left),
      width: Math.round(dropdownWidth),
      top: openUp ? undefined : Math.round(rect.bottom + 4),
      bottom: openUp ? Math.round(window.innerHeight - rect.top + 4) : undefined,
      maxHeight: Math.round(maxHeight),
      zIndex: 10050,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();

    const handleReposition = () => updateMenuPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  // Focus ô tìm kiếm khi mở menu
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Xử lý click outside và phím ESC
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Keyboard navigation cho danh sách (ArrowUp, ArrowDown, Enter)
  const handleInputKeyDown = (e) => {
    if (!filteredOptions.length) {
      if (e.key === 'Escape') setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      scrollItemIntoView((highlightedIndex + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      scrollItemIntoView((highlightedIndex - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredOptions[highlightedIndex];
      if (item) {
        handleSelectSupplier(item);
      }
    }
  };

  const scrollItemIntoView = (index) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.pi-supplier-search-item');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelectSupplier = (supplier) => {
    onChange?.(supplier);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(null);
  };

  return (
    <div className={`pi-supplier-search-dropdown-wrap ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className={`pi-supplier-search-trigger ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${selectedSupplier ? 'has-value' : ''}`}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        title={
          selectedSupplier
            ? `${selectedSupplier.name}${selectedSupplier.code ? ` (${selectedSupplier.code})` : ''}${
                selectedSupplier.costPerUnit != null && Number(selectedSupplier.costPerUnit) > 0
                  ? ` - ${formatMoney(Number(selectedSupplier.costPerUnit) * unitBase)}${unitName ? `/${unitName}` : ''}`
                  : ''
              }`
            : placeholder
        }
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="pi-supplier-search-trigger-content">
          <Building2 size={14} className="pi-supplier-icon" />
          <span className="pi-supplier-search-label">
            {selectedSupplier ? selectedSupplier.name : placeholder}
          </span>
        </div>

        <div className="pi-supplier-search-trigger-actions">
          {selectedSupplier && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="pi-supplier-search-clear-btn"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e);
                }
              }}
              title="Bỏ chọn nhà cung cấp"
              aria-label="Bỏ chọn"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className="pi-supplier-search-chevron"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </button>

      {/* Portaled Dropdown */}
      {isOpen && menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            className="pi-supplier-search-portal-menu"
            style={menuStyle}
            role="dialog"
            aria-label="Danh sách nhà cung cấp"
          >
            {/* Header Tìm Kiếm */}
            <div className="pi-supplier-search-header">
              <div className="pi-supplier-search-input-wrap">
                <Search size={14} className="pi-supplier-search-input-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="pi-supplier-search-input"
                  placeholder="Tìm tên NCC, mã, SĐT..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleInputKeyDown}
                  aria-label="Tìm kiếm nhà cung cấp"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="pi-supplier-search-input-clear"
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    title="Xóa từ khóa"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="pi-supplier-search-count">
                {filteredOptions.length} NCC
              </div>
            </div>

            {/* Danh sách Nhà cung cấp */}
            <div ref={listRef} className="pi-supplier-search-list pi-autohide-scroll" role="listbox">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((s, idx) => {
                  const isSelected = selectedSupplier && String(selectedSupplier.id) === String(s.id);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={s.id ?? `supp-${idx}`}
                      className={`pi-supplier-search-item ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectSupplier(s)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="pi-supplier-item-main">
                        <div className="pi-supplier-item-name-row">
                          <span className="pi-supplier-item-name" title={s.name}>
                            {s.name}
                          </span>
                          {s.isSuggested && (
                            <span className="pi-supplier-badge-suggested" title="Nhà cung cấp được gợi ý">
                              <Sparkles size={11} />
                              Gợi ý
                            </span>
                          )}
                        </div>

                        <div className="pi-supplier-item-meta">
                          {s.code && (
                            <span className="pi-supplier-meta-tag">
                              <Tag size={10} />
                              {s.code}
                            </span>
                          )}
                          {(s.phoneNumber || s.phone) && (
                            <span className="pi-supplier-meta-tag">
                              <Phone size={10} />
                              {s.phoneNumber || s.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pi-supplier-item-right">
                        {s.costPerUnit != null && Number(s.costPerUnit) > 0 && (
                          <div
                            className="pi-supplier-item-price"
                            title={unitBase > 1 ? `Giá theo ${unitName || 'đơn vị chọn'}: ${formatMoney(Number(s.costPerUnit) * unitBase)} (Đơn vị gốc: ${formatMoney(s.costPerUnit)})` : undefined}
                          >
                            {formatMoney(Number(s.costPerUnit) * unitBase)}
                          </div>
                        )}
                        {isSelected && (
                          <Check size={16} className="pi-supplier-selected-check" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="pi-supplier-search-empty">
                  <Building2 size={24} style={{ color: '#94A3B8', marginBottom: 6 }} />
                  <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>
                    Không tìm thấy nhà cung cấp nào
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#94A3B8' }}>
                    Thử tìm với từ khóa khác (tên, mã hoặc SĐT)
                  </p>
                  {searchTerm && (
                    <button
                      type="button"
                      className="pi-supplier-search-reset-btn"
                      onClick={() => {
                        setSearchTerm('');
                        searchInputRef.current?.focus();
                      }}
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
