import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  Wand2,
  Box,
  DollarSign,
  Package,
  Plus,
  Trash2,
  Tag,
  Scale,
  BookOpen,
  Clock,
  ArrowRight,
  Layers,
  ScanLine,
  FileText,
  Search,
  ChevronDown,
  Check,
  FolderPlus,
} from 'lucide-react';
import { productsApi } from '../api';
import { categoriesApi } from '../../category/api';
import MoneyInput from '../../../components/ui/MoneyInput';
import '../../../css/Product.css';

const COMMON_UNITS = ['Cái', 'Gói', 'Chai', 'Hộp', 'Thùng', 'Lon', 'Đôi', 'Kg', 'Gram', 'Lốc', 'Bao', 'Túi'];

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

const SEASON_OPTIONS = [
  { value: '', label: '-- Không phải hàng mùa vụ --' },
  { value: 'Tết', label: 'Mùa Tết' },
  { value: 'Trung thu', label: 'Tết Trung thu' },
  { value: 'Hè', label: 'Mùa Hè' },
  { value: 'Khai trường', label: 'Mùa Tựu trường' },
  { value: 'Giáng sinh', label: 'Giáng sinh & Năm mới' },
];

function toSlug(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function getAttributeCombinations(attributes) {
  const validAttrs = attributes.filter((a) => a.name?.trim() && a.values?.length > 0);
  if (validAttrs.length === 0) return [];

  return validAttrs.reduce((acc, curr) => {
    if (acc.length === 0) {
      return curr.values.map((v) => [{ name: curr.name.trim(), value: v.trim() }]);
    }
    const result = [];
    acc.forEach((prevCombination) => {
      curr.values.forEach((v) => {
        result.push([...prevCombination, { name: curr.name.trim(), value: v.trim() }]);
      });
    });
    return result;
  }, []);
}

function normalizeVietnamese(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

function getComboKey(combo) {
  return (combo || [])
    .map((c) => normalizeVietnamese(c.value || '').trim())
    .sort()
    .join('__');
}

function findMatchingVariant(variantsList, combo) {
  if (!variantsList || variantsList.length === 0) return null;
  const targetKey = getComboKey(combo);

  // 1. Match by exact normalized composite key
  const match = variantsList.find((v) => {
    const vKey = getComboKey(v.attrValues || []);
    return vKey && vKey === targetKey;
  });
  if (match) return match;

  // 2. Match single attribute value
  if (combo.length === 1) {
    const val = normalizeVietnamese(combo[0].value || '').trim();
    return variantsList.find((v) => {
      const vVals = (v.attrValues || []).map((a) => normalizeVietnamese(a.value || '').trim());
      return vVals.includes(val);
    });
  }

  return null;
}

function UnitAutocompleteInput({ value, onChange, options, placeholder, required = false, disabled = false, hasError = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef(null);

  const filteredOptions = (options || []).filter((opt) => {
    if (!value?.trim()) return true;
    const normOpt = normalizeVietnamese(opt);
    const normVal = normalizeVietnamese(value);
    return normOpt.includes(normVal);
  });

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        setHighlightIdx(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightIdx >= 0 && highlightIdx < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightIdx]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="pi-autocomplete-wrap" ref={containerRef}>
      <input
        type="text"
        className="pi-edit-input"
        placeholder={placeholder}
        value={value || ''}
        style={hasError ? { borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : {}}
        onChange={(e) => {
          if (disabled) return;
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightIdx(-1);
        }}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        required={required}
        disabled={disabled}
      />
      {!disabled && isOpen && filteredOptions.length > 0 && (
        <div className="pi-autocomplete-dropdown">
          {filteredOptions.map((opt, idx) => (
            <div
              key={opt}
              className={`pi-autocomplete-item ${idx === highlightIdx ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
            >
              <span>{opt}</span>
              {value?.trim() && opt.toLowerCase() === value.trim().toLowerCase() && (
                <span style={{ fontSize: 11, color: '#004AC6', fontWeight: 600 }}>✓ Đang chọn</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function playScanBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(success ? 1046.5 : 300, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (success ? 0.12 : 0.25));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
  } catch {
    // Ignore audio autoplay restrictions
  }
}

function BarcodeCaptureModal({ isOpen, onClose, onCapture, targetTitle = 'hàng hóa' }) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setBarcodeInput('');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        const code = buffer.trim() || barcodeInput.trim();
        if (code.length >= 3) {
          e.preventDefault();
          onCapture(code);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, barcodeInput, onCapture]);

  if (!isOpen) return null;

  const handleConfirm = (e) => {
    e?.preventDefault();
    const code = barcodeInput.trim();
    if (code) {
      onCapture(code);
    }
  };

  return (
    <div className="pi-modal-backdrop" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="pi-modal-dialog pi-scan-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="pi-modal-header">
          <div>
            <h2 className="pi-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScanLine size={20} color="#004AC6" />
              Quét mã vạch cho {targetTitle}
            </h2>
            <div className="pi-modal-subtitle">
              Sử dụng máy quét mã vạch cầm tay hoặc nhập mã để tự động điền
            </div>
          </div>
          <button type="button" className="pi-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="pi-modal-body" style={{ padding: '24px 28px' }}>
          <div className="pi-scanner-box">
            <div className="pi-scanner-laser-line" />
            <div className="pi-scanner-icon-wrap">
              <ScanLine size={48} className="pi-scanner-pulse-icon" />
            </div>
            <div className="pi-scanner-instruction">
              <strong>Sẵn sàng quét mã:</strong> Hướng đầu đọc máy quét vào mã vạch trên sản phẩm
            </div>
            <div className="pi-scanner-hint">
              Máy quét sẽ tự động nhận diện và điền mã vạch tức thì.
            </div>
          </div>

          <form onSubmit={handleConfirm} className="pi-scanner-form">
            <div className="pi-scanner-input-wrap">
              <input
                ref={inputRef}
                type="text"
                className="pi-scanner-input"
                placeholder="Nhập hoặc quét mã vạch..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="pi-scanner-btn-submit">
                Xác nhận
              </button>
            </div>
          </form>
        </div>

        <div className="pi-modal-footer">
          <button type="button" className="pi-modal-btn pi-modal-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductEditModal({
  isOpen,
  onClose,
  product,
  onProductUpdated,
}) {
  const isCreateMode = !product || !product.id;

  // Tabs: 'info' | 'stockCard'
  const [modalTab, setModalTab] = useState('info');

  const [categories, setCategories] = useState([]);
  const [parentProducts, setParentProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    parentId: '',
    baseUnitName: '',
    status: 'active',
    description: '',
    costPrice: '',
    sellingPrice: '',
    minStock: 5,
    seasonTag: '',
    isReturnable: true,
    imagePreview: null,
    imageFile: null,
  });

  // Determine product classification
  const isChild = !isCreateMode && Boolean(formData.parentId || product?.parentId || product?.parent?.id);
  const isParent = !isChild;
  const parentProductName = product?.parentName || parentProducts.find((p) => String(p.id) === String(formData.parentId))?.name || '';

  // State for Parent attribute groups (Name + values[])
  const [parentAttributes, setParentAttributes] = useState([]);
  // State for Child / Standalone attribute key-value pairs [{ name, value }]
  const [itemAttributes, setItemAttributes] = useState([]);

  // State for Generated Variants Matrix
  const [variants, setVariants] = useState([]);

  // State for Unit Conversions
  const [conversions, setConversions] = useState([]);
  const [fromUnit, setFromUnit] = useState('');
  const [rate, setRate] = useState('');
  const [convSellPrice, setConvSellPrice] = useState('');

  // State for Min Stock with selectable unit
  const [minStockInputQty, setMinStockInputQty] = useState(5);
  const [minStockUnit, setMinStockUnit] = useState('');

  const computedBaseMinStock = useMemo(() => {
    const qty = Number(minStockInputQty) || 0;
    if (!minStockUnit || minStockUnit === formData.baseUnitName) {
      return qty;
    }
    const matchedConv = conversions.find((c) => c.name === minStockUnit);
    if (matchedConv && Number(matchedConv.unitBase) > 0) {
      return Math.round(qty * Number(matchedConv.unitBase));
    }
    return qty;
  }, [minStockInputQty, minStockUnit, formData.baseUnitName, conversions]);

  // State for Stock Card tab
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingStockHistory, setLoadingStockHistory] = useState(false);

  // Category Searchable Dropdown & Quick Create Modal State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const categoryDropdownRef = useRef(null);

  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState('');

  const fileInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const [barcodeScannerTarget, setBarcodeScannerTarget] = useState(null);

  // Click outside to close category dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm.trim()) return categories;
    const term = categorySearchTerm.toLowerCase();
    return categories.filter((c) => (c.name || '').toLowerCase().includes(term));
  }, [categories, categorySearchTerm]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => String(c.id) === String(formData.categoryId));
  }, [categories, formData.categoryId]);

  const handleOpenCreateCategoryModal = (initialName = '') => {
    setNewCategoryName(initialName);
    setNewCategoryDescription('');
    setCreateCategoryError('');
    setIsCreateCategoryModalOpen(true);
    setIsCategoryDropdownOpen(false);
  };

  const handleSaveNewCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) {
      setCreateCategoryError('Vui lòng nhập tên nhóm hàng hóa (danh mục).');
      return;
    }
    setCreatingCategory(true);
    setCreateCategoryError('');
    try {
      const created = await categoriesApi.create({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
      });
      // Reload categories list
      const freshList = await categoriesApi.getAllCategories();
      const updatedCategories = Array.isArray(freshList) ? freshList : [];
      setCategories(updatedCategories);

      // Auto-select the newly created category
      if (created?.id) {
        handleInputChange('categoryId', String(created.id));
      } else {
        const found = updatedCategories.find((c) => c.name?.trim().toLowerCase() === newCategoryName.trim().toLowerCase());
        if (found?.id) handleInputChange('categoryId', String(found.id));
      }

      setIsCreateCategoryModalOpen(false);
      setSuccessMsg(`Đã tạo và chọn danh mục "${newCategoryName.trim()}" thành công.`);
    } catch (err) {
      console.error(err);
      setCreateCategoryError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo danh mục.');
    } finally {
      setCreatingCategory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setModalTab('info');
      categoriesApi
        .getAllCategories()
        .then((list) => setCategories(Array.isArray(list) ? list : []))
        .catch(() => setCategories([]));

      productsApi.getProducts({ page: 0, size: 100 })
        .then((res) => {
          const list = res?.content || [];
          setParentProducts(list.filter((p) => p.id !== product?.id));
        })
        .catch(() => setParentProducts([]));
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setSuccessMsg('');
    setRate('');
    setConvSellPrice('');
    setFromUnit('');

    if (isCreateMode) {
      const randomCode = `SP${Math.floor(100000000 + Math.random() * 900000000)}`;
      setFormData({
        name: '',
        sku: randomCode,
        barcode: product?.barcode || '',
        categoryId: '',
        parentId: '',
        baseUnitName: '',
        status: 'new',
        description: '',
        costPrice: '',
        sellingPrice: '',
        minStock: 5,
        seasonTag: '',
        isReturnable: true,
        imagePreview: null,
        imageFile: null,
      });
      setMinStockInputQty(5);
      setMinStockUnit('');
      setParentAttributes([]);
      setItemAttributes([]);
      setVariants([]);
      setConversions([]);
      setStockHistory([]);
    } else if (product) {
      const baseUnit = product.unitName || product.baseUnitName || product.unit || '';

      setFormData({
        name: product.name || '',
        sku: product.sku || `SP${product.id}`,
        barcode: product.barcode || '',
        categoryId: product.categoryId ? String(product.categoryId) : '',
        parentId: product.parentId ? String(product.parentId) : '',
        baseUnitName: baseUnit,
        status: product.status || 'active',
        description: product.description || '',
        costPrice: product.costPrice != null ? product.costPrice : '',
        sellingPrice: product.sellingPrice != null ? product.sellingPrice : '',
        minStock: product.minStock ?? product.safetyStock ?? 5,
        seasonTag: '',
        isReturnable: false,
        imagePreview: product.imageUrl || product.productImg || product.image || (product.images && product.images[0]?.url) || product.parentImg || product.parent?.imageUrl || product.parent?.productImg || null,
        imageFile: null,
      });
      setMinStockInputQty(product.minStock ?? product.safetyStock ?? 5);
      setMinStockUnit('');

      // Parse initial attributes
      const rawAttrs = product.attributes || product.productAttributes || [];
      const isParentGroup = Boolean(product?.isGroup || (product?.variantGroups && product.variantGroups.length > 0));

      if (isParentGroup || !product.parentId) {
        const map = new Map();
        rawAttrs.forEach((a) => {
          const name = (a.name || a.attribute?.name || '').trim();
          const val = (a.value || '').trim();
          if (name) {
            if (!map.has(name)) map.set(name, []);
            if (val && !map.get(name).includes(val)) map.get(name).push(val);
          }
        });

        // Also check variantGroups
        const existingChildren = [];
        (product.variantGroups || []).forEach((vg) => {
          (vg.sizes || []).forEach((sz) => {
            if (sz.id) existingChildren.push(sz);
            const pVal = sz.primaryAttrValue || vg.primaryAttrValue;
            const sVal = sz.sizeValue;
            if (vg.primaryAttrName && pVal) {
              if (!map.has(vg.primaryAttrName)) map.set(vg.primaryAttrName, []);
              if (!map.get(vg.primaryAttrName).includes(pVal)) map.get(vg.primaryAttrName).push(pVal);
            }
            if (vg.sizeAttrName && sVal) {
              if (!map.has(vg.sizeAttrName)) map.set(vg.sizeAttrName, []);
              if (!map.get(vg.sizeAttrName).includes(sVal)) map.get(vg.sizeAttrName).push(sVal);
            }
          });
        });

        const parentArr = [];
        map.forEach((vals, name) => {
          parentArr.push({ id: `attr-${Date.now()}-${Math.random()}`, name, values: vals, inputValue: '' });
        });
        setParentAttributes(parentArr);

        // Preload variants from existing children
        if (existingChildren.length > 0) {
          const loadedVariants = existingChildren.map((sz) => {
            const pVal = sz.primaryAttrValue;
            const sVal = sz.sizeValue;
            const keyParts = [pVal, sVal].filter(Boolean);
            const key = keyParts.join('__') || String(sz.id);
            return {
              id: sz.id,
              key,
              attrValues: [
                pVal ? { name: 'Thuộc tính', value: pVal } : null,
                sVal && sVal !== pVal ? { name: 'Kích cỡ', value: sVal } : null,
              ].filter(Boolean),
              name: sz.name || `${product.name} - ${keyParts.join(' - ')}`,
              sku: sz.sku || `${product.sku || 'SP'}-${toSlug(keyParts.join('-'))}`,
              barcode: sz.barcode || '',
              costPrice: sz.costPrice ?? product.costPrice ?? 0,
              sellingPrice: sz.sellingPrice ?? product.sellingPrice ?? 0,
              status: sz.status || 'active',
              isRemoved: false,
            };
          });
          setVariants(loadedVariants);
        }
      } else {
        const flatAttrs = rawAttrs.map((a) => ({
          id: a.id || `attr-${Date.now()}-${Math.random()}`,
          name: a.name || a.attribute?.name || '',
          value: a.value || '',
        }));
        setItemAttributes(flatAttrs);
        setVariants([]);
      }

      if (product.id) {
        productsApi.getById(product.id)
          .then((detail) => {
            if (detail) {
              const units = Array.isArray(detail.units) ? detail.units : [];
              const base = units.find((u) => u.isBase || Number(u.unitBase) === 1) || units[0];
              const baseName = base?.name || detail.baseUnitName || product.unitName || '';

              setFormData((prev) => ({
                ...prev,
                name: detail.name || prev.name,
                sku: detail.sku || prev.sku,
                barcode: detail.barcode || prev.barcode,
                categoryId: detail.categoryId ? String(detail.categoryId) : prev.categoryId,
                parentId: detail.parentId ? String(detail.parentId) : prev.parentId,
                baseUnitName: baseName,
                status: detail.status || prev.status,
                description: detail.description || prev.description,
                costPrice: detail.costPrice ?? prev.costPrice,
                sellingPrice: detail.sellingPrice ?? prev.sellingPrice,
                minStock: detail.minStock ?? prev.minStock,
                seasonTag: detail.seasonTag || prev.seasonTag,
                isReturnable: detail.isReturnable ?? prev.isReturnable,
                imagePreview: detail.imageUrl || detail.productImg || (detail.images && detail.images[0]?.url) || detail.parentImg || detail.parent?.imageUrl || detail.parent?.productImg || product.imageUrl || product.productImg || prev.imagePreview,
              }));

              const convList = units
                .filter((u) => u !== base && Number(u.unitBase) !== 1)
                .map((u) => ({
                  id: u.id,
                  name: u.name,
                  unitBase: Number(u.unitBase),
                  sellingPrice: u.sellingPrice || 0,
                }));
              setConversions(convList);

              const detailAttrs = detail.attributes || [];
              const detailVariants = detail.variants || [];
              const isParentProd = Boolean(
                detail.isGroup ||
                !detail.parentId ||
                detailVariants.length > 0 ||
                (product?.variantGroups && product.variantGroups.length > 0)
              );

              if (isParentProd) {
                const map = new Map();
                // 1. Group parent attributes
                detailAttrs.forEach((a) => {
                  const name = (a.name || a.attribute?.name || '').trim();
                  const val = (a.value || '').trim();
                  if (name) {
                    if (!map.has(name)) map.set(name, []);
                    if (val && !map.get(name).includes(val)) map.get(name).push(val);
                  }
                });

                // 2. Also check if child variants have attributes
                detailVariants.forEach((v) => {
                  (v.attributes || []).forEach((va) => {
                    const name = (va.name || va.attribute?.name || '').trim();
                    const val = (va.value || '').trim();
                    if (name) {
                      if (!map.has(name)) map.set(name, []);
                      if (val && !map.get(name).includes(val)) map.get(name).push(val);
                    }
                  });
                });

                // 3. Also check variantGroups if present from table
                (product?.variantGroups || []).forEach((vg) => {
                  (vg.sizes || []).forEach((sz) => {
                    const pVal = sz.primaryAttrValue || vg.primaryAttrValue;
                    const sVal = sz.sizeValue;
                    if (vg.primaryAttrName && pVal) {
                      if (!map.has(vg.primaryAttrName)) map.set(vg.primaryAttrName, []);
                      if (!map.get(vg.primaryAttrName).includes(pVal)) map.get(vg.primaryAttrName).push(pVal);
                    }
                    if (vg.sizeAttrName && sVal) {
                      if (!map.has(vg.sizeAttrName)) map.set(vg.sizeAttrName, []);
                      if (!map.get(vg.sizeAttrName).includes(sVal)) map.get(vg.sizeAttrName).push(sVal);
                    }
                  });
                });

                const parentArr = [];
                map.forEach((vals, name) => {
                  parentArr.push({ id: `attr-${Date.now()}-${Math.random()}`, name, values: vals, inputValue: '' });
                });
                setParentAttributes(parentArr);

                // 4. Map loaded variants into variants matrix state
                if (detailVariants.length > 0) {
                  const loaded = detailVariants.map((v) => {
                    const vAttrs = (v.attributes || []).map((a) => ({
                      name: a.name || a.attribute?.name || 'Thuộc tính',
                      value: a.value || '',
                    }));
                    const key = getComboKey(vAttrs) || String(v.id);
                    return {
                      id: v.id,
                      key,
                      attrValues: vAttrs,
                      name: v.name,
                      sku: v.sku || '',
                      barcode: v.barcode || '',
                      costPrice: v.costPrice ?? detail.costPrice ?? 0,
                      sellingPrice: v.sellingPrice ?? detail.sellingPrice ?? 0,
                      status: v.status || 'active',
                      isRemoved: false,
                    };
                  });
                  setVariants(loaded);
                }
              } else {
                // Child / Standalone
                const flatAttrs = detailAttrs.map((a) => ({
                  id: a.id || `attr-${Date.now()}-${Math.random()}`,
                  name: a.name || a.attribute?.name || '',
                  value: a.value || '',
                }));
                setItemAttributes(flatAttrs);
                setVariants([]);
              }
            }
          })
          .catch(() => { });

        // Fetch price history for Stock Card tab
        setLoadingStockHistory(true);
        if (productsApi.getPriceHistory) {
          productsApi.getPriceHistory(product.id)
            .then((res) => {
              const list = Array.isArray(res) ? res : res?.result || [];
              setStockHistory(list);
            })
            .catch(() => setStockHistory([]))
            .finally(() => setLoadingStockHistory(false));
        } else {
          setLoadingStockHistory(false);
          setStockHistory([]);
        }
      }
    }
  }, [isOpen, product, isCreateMode]);

  // Sync Variant Matrix whenever parentAttributes or product name changes
  useEffect(() => {
    if (!isOpen) return;

    const combinations = getAttributeCombinations(parentAttributes);
    if (combinations.length === 0) {
      if (parentAttributes.length === 0) {
        setVariants([]);
      }
      return;
    }

    setVariants((prevVariants) => {
      return combinations.map((combo) => {
        const key = getComboKey(combo);
        const label = combo.map((c) => c.value).join(' - ');

        const existing = findMatchingVariant(prevVariants, combo);
        if (existing) {
          return {
            ...existing,
            key,
            attrValues: combo,
            name: existing.name || (formData.name ? `${formData.name} - ${label}` : label),
          };
        }

        return {
          id: null,
          key,
          attrValues: combo,
          name: formData.name ? `${formData.name} - ${label}` : label,
          sku: '',
          barcode: '',
          costPrice: formData.costPrice || 0,
          sellingPrice: formData.sellingPrice || 0,
          status: 'active',
          isRemoved: false,
        };
      });
    });
  }, [parentAttributes, formData.name, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'parentId' && value) {
        const selectedParent = parentProducts.find((p) => String(p.id) === String(value));
        if (selectedParent && !prev.imageFile && !prev.imagePreview) {
          const pImg = selectedParent.imageUrl || selectedParent.productImg || (selectedParent.images && selectedParent.images[0]?.url);
          if (pImg) next.imagePreview = pImg;
        }
      }
      return next;
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ảnh không được vượt quá 5MB.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: previewUrl,
    }));
  };

  // --- Attribute handlers for Parent ---
  const handleAddParentAttr = () => {
    setParentAttributes((prev) => [
      ...prev,
      { id: `attr-${Date.now()}-${Math.random()}`, name: '', values: [], inputValue: '' },
    ]);
  };

  const handleAddParentAttrValue = (attrId) => {
    setParentAttributes((prev) =>
      prev.map((a) => {
        if (a.id === attrId && a.inputValue?.trim()) {
          const val = a.inputValue.trim();
          if (!a.values.includes(val)) {
            return { ...a, values: [...a.values, val], inputValue: '' };
          }
          return { ...a, inputValue: '' };
        }
        return a;
      }),
    );
  };

  const handleRemoveParentAttrValue = (attrId, valToRemove) => {
    setParentAttributes((prev) =>
      prev.map((a) => {
        if (a.id === attrId) {
          return { ...a, values: a.values.filter((v) => v !== valToRemove) };
        }
        return a;
      }),
    );
  };

  const handleRemoveParentAttr = (attrId) => {
    setParentAttributes((prev) => prev.filter((a) => a.id !== attrId));
  };

  // --- Attribute handlers for Standalone / Child ---
  const handleAddItemAttr = () => {
    setItemAttributes((prev) => [
      ...prev,
      { id: `item-attr-${Date.now()}-${Math.random()}`, name: '', value: '' },
    ]);
  };

  const handleItemAttrChange = (id, field, val) => {
    setItemAttributes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: val } : a)),
    );
  };

  const handleRemoveItemAttr = (id) => {
    setItemAttributes((prev) => prev.filter((a) => a.id !== id));
  };

  // --- Variant Matrix Handlers ---
  const handleVariantChange = (key, field, val) => {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, [field]: val } : v)),
    );
  };

  const handleApplyParentPricesToAll = () => {
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
      })),
    );
    setSuccessMsg('Đã áp dụng giá vốn và giá bán của sản phẩm cha cho toàn bộ biến thể.');
  };

  const handleRemoveVariant = (key) => {
    setVariants((prev) => prev.filter((v) => v.key !== key));
  };

  const handleScanBarcodeForParent = () => {
    setBarcodeScannerTarget({ type: 'parent', title: formData.name || 'hàng hóa' });
  };

  const handleScanBarcodeForVariant = (key) => {
    const v = variants.find((item) => item.key === key);
    setBarcodeScannerTarget({ type: 'variant', key, title: v?.name || 'biến thể' });
  };

  const handleBarcodeCaptured = (code) => {
    playScanBeep(true);
    if (!barcodeScannerTarget) return;
    if (barcodeScannerTarget.type === 'parent') {
      handleInputChange('barcode', code);
    } else if (barcodeScannerTarget.type === 'variant') {
      handleVariantChange(barcodeScannerTarget.key, 'barcode', code);
    }
    setBarcodeScannerTarget(null);
  };

  // --- Unit Conversion Handlers ---
  const handleAddConversion = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.baseUnitName?.trim()) {
      setErrorMsg('Vui lòng thiết lập Đơn vị tính cơ bản (Gốc) trước khi thêm đơn vị quy đổi.');
      return;
    }

    const unitName = (fromUnit || '').trim();
    if (!unitName) {
      setErrorMsg('Vui lòng nhập tên đơn vị quy đổi.');
      return;
    }
    if (unitName.toLowerCase() === (formData.baseUnitName || '').trim().toLowerCase()) {
      setErrorMsg(`Đơn vị quy đổi không được trùng với đơn vị gốc (${formData.baseUnitName}).`);
      return;
    }
    const numRate = Number(rate);
    if (!rate || isNaN(numRate) || numRate <= 0) {
      setErrorMsg('Tỷ lệ quy đổi phải là số lớn hơn 0.');
      return;
    }
    if (conversions.some((c) => c.name.toLowerCase() === unitName.toLowerCase())) {
      setErrorMsg(`Đơn vị "${unitName}" đã tồn tại trong danh sách quy đổi.`);
      return;
    }

    const newConv = {
      name: unitName,
      unitBase: numRate,
      sellingPrice: convSellPrice !== '' && convSellPrice !== null && !isNaN(Number(convSellPrice))
        ? Number(convSellPrice)
        : (formData.sellingPrice !== '' && Number(formData.sellingPrice) > 0 ? Number(formData.sellingPrice) * numRate : null),
    };

    setConversions((prev) => [...prev, newConv]);
    setFromUnit('');
    setRate('');
    setConvSellPrice('');
  };

  const handleDeleteConversion = (indexToRemove) => {
    setConversions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // --- Form Submit (General Info + Units + Variants) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.name?.trim()) {
      setErrorMsg('Tên hàng hóa không được để trống.');
      return;
    }
    if (!formData.categoryId) {
      setErrorMsg('Vui lòng chọn danh mục hàng hóa.');
      return;
    }
    if (!formData.baseUnitName?.trim()) {
      setErrorMsg('Vui lòng nhập đơn vị tính cơ bản (Gốc).');
      return;
    }
    if (formData.sellingPrice === '' || formData.sellingPrice === null || Number(formData.sellingPrice) < 0) {
      setErrorMsg('Giá bán không được để trống và phải lớn hơn hoặc bằng 0.');
      return;
    }

    // Build attributes payload for parent
    let attributesPayload = [];
    if (parentAttributes.length > 0) {
      parentAttributes.forEach((pa) => {
        if (pa.name?.trim()) {
          pa.values.forEach((val) => {
            attributesPayload.push({ name: pa.name.trim(), value: val });
          });
        }
      });
    } else {
      attributesPayload = itemAttributes
        .filter((a) => a.name?.trim() && a.value?.trim())
        .map((a) => ({ name: a.name.trim(), value: a.value.trim() }));
    }

    // Build units payload
    const unitsPayload = [
      {
        name: formData.baseUnitName?.trim() || '',
        isBase: true,
        unitBase: 1,
        sellingPrice: Number(formData.sellingPrice) || 0,
      },
      ...conversions.map((c) => ({
        id: c.id,
        name: c.name,
        isBase: false,
        unitBase: Number(c.unitBase),
        sellingPrice: Number(c.sellingPrice) || 0,
      })),
    ];

    // Build variants payload (if parent product has child variants)
    const variantsPayload = variants
      .filter((v) => !v.isRemoved)
      .map((v) => ({
        id: v.id || null,
        name: v.name?.trim() || '',
        sku: v.sku?.trim() || null,
        barcode: v.barcode?.trim() || null,
        costPrice: Number(v.costPrice) || 0,
        sellingPrice: Number(v.sellingPrice) || 0,
        status: v.status || 'active',
        attributes: (v.attrValues || []).map((a) => ({
          name: a.name || 'Thuộc tính',
          value: a.value || '',
        })),
      }));

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku?.trim() || null,
      barcode: formData.barcode?.trim() || null,
      categoryId: Number(formData.categoryId),
      parentId: formData.parentId ? Number(formData.parentId) : null,
      costPrice: Number(formData.costPrice) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      minStock: Number(computedBaseMinStock) || 0,
      seasonTag: null,
      isReturnable: false,
      status: formData.status || 'active',
      description: formData.description?.trim() || null,
      units: unitsPayload,
      attributes: attributesPayload,
      variants: variantsPayload,
    };

    setSubmitting(true);
    try {
      // Step 1: Save/Update Parent or Child Product
      let savedProduct;
      if (isCreateMode) {
        savedProduct = await productsApi.create(payload);
      } else {
        savedProduct = await productsApi.update(product.id, payload);
      }

      const parentId = savedProduct?.id || product?.id;

      // Step 2: Upload Image if selected
      if (formData.imageFile && parentId) {
        try {
          await productsApi.uploadImage(parentId, formData.imageFile);
        } catch {
          console.error('Lỗi khi tải ảnh lên');
        }
      }

      setSuccessMsg(isCreateMode ? 'Đã tạo hàng hóa và các biến thể thành công!' : 'Đã cập nhật hàng hóa và biến thể thành công!');
      onProductUpdated?.();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu hàng hóa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pi-modal-backdrop" onClick={onClose}>
      <div className="pi-modal-dialog pi-edit-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pi-modal-header">
          <div>
            <h2 className="pi-modal-title">
              {isCreateMode ? 'Thêm mới hàng hóa' : 'Cập nhật hàng hóa'}
            </h2>
            <div className="pi-modal-subtitle">
              {isCreateMode ? (
                'Nhập thông tin chi tiết để thêm hàng hóa vào hệ thống'
              ) : (
                product?.name || ''
              )}
            </div>
          </div>
          <button type="button" className="pi-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation inside Modal (2 Tabs: Thông tin hàng hóa & Thẻ kho) */}
        {!isCreateMode && (
          <div className="pi-edit-tabs">
            <button
              type="button"
              className={`pi-edit-tab-item ${modalTab === 'info' ? 'active' : ''}`}
              onClick={() => {
                setModalTab('info');
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              <Box size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Thông tin hàng hóa
            </button>
            <button
              type="button"
              className={`pi-edit-tab-item ${modalTab === 'stockCard' ? 'active' : ''}`}
              onClick={() => {
                setModalTab('stockCard');
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              <BookOpen size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Thẻ kho & Lịch sử giá
            </button>
          </div>
        )}

        {/* TAB 1: THÔNG TIN HÀNG HÓA */}
        {modalTab === 'info' && (
          <form onSubmit={handleSubmit} className="pi-edit-form">
            <div className="pi-modal-body pi-edit-modal-body">
              {errorMsg && <div className="pi-unit-alert-error">{errorMsg}</div>}
              {successMsg && <div className="pi-unit-alert-success">{successMsg}</div>}

              {/* Section 1: Thông tin nhận diện */}
              <div className="pi-edit-section">
                <div className="pi-edit-sec-head">
                  <h3 className="pi-edit-sec-title">
                    <Box size={16} color="#004AC6" />
                    Thông tin nhận diện
                  </h3>
                </div>

                <div className="pi-edit-grid-layout">
                  {/* Left: Ảnh hàng hóa */}
                  <div className="pi-edit-image-col">
                    <div className="pi-edit-image-label">Ảnh hàng hóa</div>
                    <div className="pi-edit-image-box">
                      {formData.imagePreview ? (
                        <img
                          src={formData.imagePreview}
                          alt="Ảnh sản phẩm"
                          className="pi-edit-img-preview"
                        />
                      ) : (
                        <div className="pi-edit-img-placeholder">
                          <Package size={42} color="#94A3B8" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageSelect}
                    />
                    <div className="pi-edit-image-btns">
                      <button
                        type="button"
                        className="pi-edit-btn-upload"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={13} />
                        Tải ảnh
                      </button>
                      {formData.imagePreview && (
                        <button
                          type="button"
                          className="pi-edit-btn-remove-img"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              imageFile: null,
                              imagePreview: null,
                            }));
                          }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Các trường thông tin */}
                  <div className="pi-edit-fields-col">
                    {/* Row 1: Tên hàng hóa */}
                    <div className="pi-edit-field">
                      <label className="pi-edit-label">Tên hàng hóa *</label>
                      <input
                        type="text"
                        className="pi-edit-input"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Nhập tên hàng hóa (VD: Bánh Chocopie, Nước ngọt Fanta...)"
                        required
                      />
                    </div>

                    {/* Row 2: Mã vạch & Danh mục */}
                    <div className="pi-edit-field-row">
                      <div className="pi-edit-field">
                        <label className="pi-edit-label">Mã vạch</label>
                        <div className="pi-edit-input-with-btn">
                          <input
                            type="text"
                            ref={barcodeInputRef}
                            className="pi-edit-input"
                            value={formData.barcode}
                            onChange={(e) => handleInputChange('barcode', e.target.value)}
                            placeholder="Quét hoặc nhập mã vạch"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="pi-btn-scan-mini"
                            title="Quét mã vạch bằng máy quét"
                            onClick={handleScanBarcodeForParent}
                          >
                            <ScanLine size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="pi-edit-field" ref={categoryDropdownRef}>
                        <label className="pi-edit-label">Nhóm hàng hóa (Danh mục) *</label>

                        {/* Searchable Select Dropdown */}
                        <div className="pi-search-select-wrap">
                          <div
                            className={`pi-search-select-trigger ${isCategoryDropdownOpen ? 'is-open' : ''} ${isChild ? 'is-disabled' : ''}`}
                            onClick={() => {
                              if (!isChild) {
                                setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                                setCategorySearchTerm('');
                              }
                            }}
                          >
                            <span style={{ color: selectedCategory ? '#0F172A' : '#94A3B8', fontWeight: selectedCategory ? 500 : 400 }}>
                              {selectedCategory ? selectedCategory.name : '-- Chọn nhóm hàng hóa --'}
                            </span>
                            <ChevronDown
                              size={16}
                              color="#64748B"
                              style={{
                                transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s ease',
                              }}
                            />
                          </div>

                          {isCategoryDropdownOpen && (
                            <div className="pi-search-select-dropdown">
                              <div className="pi-search-select-header">
                                <div className="pi-search-select-searchbox">
                                  <Search size={14} className="pi-search-select-search-icon" />
                                  <input
                                    type="text"
                                    placeholder="Tìm kiếm danh mục..."
                                    value={categorySearchTerm}
                                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="pi-search-select-quick-add-btn"
                                  onClick={() => handleOpenCreateCategoryModal(categorySearchTerm)}
                                  title="Thêm danh mục mới"
                                >
                                  <Plus size={13} />
                                  Tạo mới
                                </button>
                              </div>

                              <div className="pi-search-select-list">
                                {filteredCategories.length > 0 ? (
                                  filteredCategories.map((c) => {
                                    const isSelected = String(c.id) === String(formData.categoryId);
                                    return (
                                      <div
                                        key={c.id}
                                        className={`pi-search-select-item ${isSelected ? 'is-selected' : ''}`}
                                        onClick={() => {
                                          handleInputChange('categoryId', String(c.id));
                                          setIsCategoryDropdownOpen(false);
                                          setCategorySearchTerm('');
                                        }}
                                      >
                                        <span>{c.name}</span>
                                        {isSelected && <Check size={15} color="#004AC6" />}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="pi-search-select-empty">
                                    <span>Không tìm thấy danh mục "{categorySearchTerm}"</span>
                                    <button
                                      type="button"
                                      className="pi-search-select-quick-add-btn"
                                      onClick={() => handleOpenCreateCategoryModal(categorySearchTerm)}
                                      style={{ alignSelf: 'center' }}
                                    >
                                      <Plus size={13} />
                                      Tạo danh mục "{categorySearchTerm}"
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {isChild && (
                          <span className="pi-field-lock-hint">🔒 Kế thừa từ sản phẩm cha</span>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Mô tả sản phẩm */}
                    <div className="pi-edit-field">
                      <label className="pi-edit-label">Mô tả sản phẩm</label>
                      <textarea
                        className="pi-edit-input"
                        rows={2}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Nhập mô tả chi tiết, xuất xứ, công dụng, bảo quản…"
                        style={{
                          width: '100%',
                          minHeight: 58,
                          maxHeight: 120,
                          padding: '8px 12px',
                          fontSize: 13.5,
                          lineHeight: 1.5,
                          resize: 'vertical',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          boxSizing: 'border-box',
                          background: '#FFFFFF',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Đơn vị tính & Quy đổi */}
              <div className="pi-edit-section" style={{ marginTop: 20 }}>
                <div className="pi-edit-sec-head">
                  <h3 className="pi-edit-sec-title">
                    <Scale size={16} color="#004AC6" />
                    Đơn vị tính & Quy đổi
                  </h3>
                  <p className="pi-edit-sec-desc">
                    Thiết lập đơn vị tính cơ bản (đơn vị nhỏ nhất khi bán lẻ) và các đơn vị tính quy đổi (VD: 1 Thùng = 24 Chai).
                  </p>
                </div>

                {/* Đơn vị cơ bản (Gốc) */}
                <div className="pi-conv-add-card" style={{ marginBottom: 16 }}>
                  <div className="pi-edit-field" style={{ maxWidth: 380 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="pi-edit-label" style={{ marginBottom: 0 }}>Đơn vị tính cơ bản (Gốc) *</label>
                      {!formData.baseUnitName?.trim() && !isChild && (
                        <span style={{ fontSize: 11.5, color: '#DC2626', fontWeight: 600, background: '#FEE2E2', padding: '1px 6px', borderRadius: 4 }}>
                          Chưa điền
                        </span>
                      )}
                    </div>
                    <UnitAutocompleteInput
                      value={formData.baseUnitName}
                      onChange={(val) => handleInputChange('baseUnitName', val)}
                      options={COMMON_UNITS}
                      placeholder="Nhập hoặc chọn đơn vị cơ bản (VD: Lon, Chai, Cái...)"
                      required
                      disabled={isChild}
                      hasError={!formData.baseUnitName?.trim() && !isChild}
                    />
                    {!formData.baseUnitName?.trim() && !isChild && (
                      <span style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                        ⚠️ Bắt buộc điền: Vui lòng nhập đơn vị tính cơ bản (đơn vị nhỏ nhất khi bán lẻ)
                      </span>
                    )}
                    {isChild && (
                      <span className="pi-field-lock-hint">
                        🔒 Đơn vị tính cơ bản được cố định theo sản phẩm cha
                      </span>
                    )}
                  </div>
                </div>

                {/* Thêm / Xem đơn vị quy đổi */}
                {isChild ? (
                  <div className="pi-conv-add-card">
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginBottom: 10 }}>
                      🔒 Bảng đơn vị quy đổi (Kế thừa từ sản phẩm cha):
                    </div>
                    {conversions.length > 0 ? (
                      <div className="pi-conv-table-wrap">
                        <table className="pi-conv-table">
                          <thead>
                            <tr>
                              <th>Tên đơn vị</th>
                              <th>Tỷ lệ quy đổi</th>
                              <th>Giá bán theo ĐV</th>
                            </tr>
                          </thead>
                          <tbody>
                            {conversions.map((conv, idx) => (
                              <tr key={conv.id || conv.name || idx}>
                                <td style={{ fontWeight: 600, color: '#0F172A' }}>{conv.name || 'N/A'}</td>
                                <td style={{ color: '#0369A1', fontWeight: 600 }}>
                                  1 {conv.name || 'ĐV'} = {conv.unitBase} {formData.baseUnitName || 'N/A'}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {(conv.sellingPrice != null && conv.sellingPrice !== '' && Number(conv.sellingPrice) > 0)
                                    ? `${Number(conv.sellingPrice).toLocaleString('vi-VN')} đ`
                                    : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: '#94A3B8', fontStyle: 'italic' }}>
                        Sản phẩm cha chưa thiết lập đơn vị quy đổi.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pi-conv-add-card">
                    <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', marginBottom: 12 }}>
                      + Thêm đơn vị tính quy đổi (Bao, Thùng, Lốc, Vỉ...)
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr auto', gap: 12, alignItems: 'flex-end' }}>
                      <div className="pi-edit-field">
                        <label className="pi-edit-label">Đơn vị quy đổi *</label>
                        <UnitAutocompleteInput
                          value={fromUnit}
                          onChange={(val) => setFromUnit(val)}
                          options={COMMON_CONVERSION_UNITS.filter((u) => u.toLowerCase() !== (formData.baseUnitName || '').toLowerCase())}
                          placeholder="Ví dụ: Thùng, Hộp, Lốc, Két…"
                        />
                      </div>

                      <div className="pi-edit-field">
                        <label className="pi-edit-label">
                          Tỷ lệ quy đổi ({formData.baseUnitName || 'Gốc'}) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="pi-edit-input"
                          placeholder={`1 ${fromUnit.trim() || 'ĐV'} = ? ${formData.baseUnitName || 'ĐV gốc'}`}
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                        />
                      </div>

                      <div className="pi-edit-field">
                        <label className="pi-edit-label">Giá bán theo ĐV này (VNĐ)</label>
                        <MoneyInput
                          className="pi-edit-input"
                          placeholder="Mặc định = Tỷ lệ × Giá gốc"
                          value={convSellPrice}
                          onChange={(val) => setConvSellPrice(val)}
                        />
                      </div>

                      <button
                        type="button"
                        className="pi-unit-btn-add"
                        style={{ height: 38, padding: '0 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: 1 }}
                        onClick={handleAddConversion}
                      >
                        <Plus size={15} style={{ marginRight: 4 }} />
                        Thêm
                      </button>
                    </div>

                    {fromUnit.trim() && rate && Number(rate) > 0 && (
                      <div className="pi-conv-rate-preview" style={{ marginTop: 10 }}>
                        Công thức: <strong>1 {fromUnit.trim()} = {rate} {formData.baseUnitName || 'N/A'}</strong>
                      </div>
                    )}

                    {/* Danh sách quy đổi hiện có */}
                    {conversions.length > 0 && (
                      <div className="pi-conv-table-wrap" style={{ marginTop: 14 }}>
                        <table className="pi-conv-table">
                          <thead>
                            <tr>
                              <th>Tên đơn vị</th>
                              <th>Tỷ lệ quy đổi</th>
                              <th>Giá bán theo ĐV</th>
                              <th style={{ width: 60, textAlign: 'center' }}>Xóa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {conversions.map((conv, idx) => (
                              <tr key={conv.id || conv.name || idx}>
                                <td style={{ fontWeight: 600, color: '#0F172A' }}>{conv.name || 'N/A'}</td>
                                <td style={{ color: '#0369A1', fontWeight: 600 }}>
                                  1 {conv.name || 'ĐV'} = {conv.unitBase} {formData.baseUnitName || 'N/A'}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {(conv.sellingPrice != null && conv.sellingPrice !== '' && Number(conv.sellingPrice) > 0)
                                    ? `${Number(conv.sellingPrice).toLocaleString('vi-VN')} đ`
                                    : 'N/A'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className="pi-unit-item-del"
                                    onClick={() => handleDeleteConversion(idx)}
                                    title="Xóa đơn vị quy đổi này"
                                  >
                                    <Trash2 size={15} color="#EF4444" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Định mức tồn tối thiểu (Chọn theo đơn vị) */}
                <div className="pi-conv-add-card" style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={15} color="#2563EB" />
                    Định mức tồn tối thiểu
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, alignItems: 'flex-start' }}>
                    <div className="pi-edit-field">
                      <label className="pi-edit-label">Số lượng tồn tối thiểu</label>
                      <input
                        type="number"
                        min="0"
                        className="pi-edit-input"
                        value={minStockInputQty}
                        onChange={(e) => setMinStockInputQty(e.target.value)}
                        placeholder="Nhập số lượng an toàn"
                      />
                    </div>

                    <div className="pi-edit-field">
                      <label className="pi-edit-label">Theo đơn vị tính</label>
                      <select
                        className="pi-edit-input"
                        value={minStockUnit || formData.baseUnitName || ''}
                        onChange={(e) => setMinStockUnit(e.target.value)}
                      >
                        <option value={formData.baseUnitName || ''}>
                          {formData.baseUnitName || 'Đơn vị cơ bản'} (Đơn vị gốc)
                        </option>
                        {conversions.map((conv) => (
                          <option key={conv.id || conv.name} value={conv.name}>
                            {conv.name} (1 {conv.name} = {conv.unitBase} {formData.baseUnitName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: '#475569', marginTop: 8, background: '#F8FAFC', padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    💡 Tương đương: <strong style={{ color: '#0369A1' }}>{computedBaseMinStock} {formData.baseUnitName || 'ĐV gốc'}</strong>. Hệ thống sẽ cảnh báo khi tổng tồn kho &le; mức này.
                  </div>
                </div>
              </div>

              {/* Section 3: Thuộc tính & Ma trận biến thể */}
              {isChild ? (
                <div className="pi-edit-section" style={{ marginTop: 20 }}>
                  <div className="pi-edit-sec-head">
                    <h3 className="pi-edit-sec-title">
                      <Tag size={16} color="#7C3AED" />
                      Thuộc tính phân loại của biến thể
                    </h3>
                    <p className="pi-edit-sec-desc">
                      Giá trị phân loại định danh cho biến thể này (được thiết lập và quản lý từ sản phẩm cha).
                    </p>
                  </div>

                  <div className="pi-child-attr-chips-wrap">
                    {itemAttributes.length > 0 ? (
                      itemAttributes.map((a, idx) => (
                        <div key={a.id || idx} className="pi-child-attr-chip">
                          <span className="pi-child-attr-name">{a.name || 'Thuộc tính'}:</span>
                          <span className="pi-child-attr-val">{a.value}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>
                        Biến thể này chưa có thuộc tính định danh cụ thể.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pi-edit-section" style={{ marginTop: 20 }}>
                  <div className="pi-edit-sec-head">
                    <h3 className="pi-edit-sec-title">
                      <Tag size={16} color="#7C3AED" />
                      Thuộc tính & Phân loại biến thể
                    </h3>
                    <p className="pi-edit-sec-desc">
                      Thiết lập các nhóm thuộc tính (Vị, Màu sắc, Kích cỡ...). Mỗi giá trị được thêm sẽ tự động sinh một biến thể với mã vạch và giá riêng.
                    </p>
                  </div>

                  <div className="pi-attr-groups-container">
                    {parentAttributes.map((attr) => (
                      <div key={attr.id} className="pi-attr-group-card">
                        <input
                          type="text"
                          className="pi-edit-input pi-attr-name-input"
                          placeholder="Tên thuộc tính (VD: Vị, Màu sắc, Kích cỡ...)"
                          value={attr.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setParentAttributes((prev) =>
                              prev.map((a) => (a.id === attr.id ? { ...a, name: val } : a)),
                            );
                          }}
                        />

                        <div className="pi-attr-tags-box">
                          {attr.values.map((v) => (
                            <span key={v} className="pi-attr-tag-chip">
                              {v}
                              <button
                                type="button"
                                className="pi-attr-tag-chip-del"
                                onClick={() => handleRemoveParentAttrValue(attr.id, v)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <div className="pi-attr-tag-add-inline">
                            <input
                              type="text"
                              className="pi-attr-tag-input"
                              placeholder="Nhập giá trị (VD: Dâu, Cam, Nho)..."
                              value={attr.inputValue || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParentAttributes((prev) =>
                                  prev.map((a) => (a.id === attr.id ? { ...a, inputValue: val } : a)),
                                );
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddParentAttrValue(attr.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="pi-attr-btn-confirm"
                              onClick={() => handleAddParentAttrValue(attr.id)}
                            >
                              Thêm
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="pi-attr-del-btn"
                          onClick={() => handleRemoveParentAttr(attr.id)}
                          title="Xóa nhóm thuộc tính này"
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </button>
                      </div>
                    ))}

                    <div>
                      <button
                        type="button"
                        className="pi-btn-add-attr"
                        onClick={handleAddParentAttr}
                      >
                        <Plus size={14} />
                        Thêm nhóm thuộc tính phân loại
                      </button>
                    </div>
                  </div>

                  {/* BẢNG MA TRẬN BIẾN THỂ SINH TỰ ĐỘNG */}
                  {variants.length > 0 && (
                    <div className="pi-variant-matrix-section">
                      <div className="pi-variant-matrix-head">
                        <div className="pi-variant-matrix-title">
                          <Layers size={16} color="#004AC6" />
                          Danh sách biến thể hàng hóa ({variants.filter((v) => !v.isRemoved).length} biến thể)
                        </div>
                        <div className="pi-variant-matrix-actions">
                          <button
                            type="button"
                            className="pi-btn-variant-action"
                            onClick={handleApplyParentPricesToAll}
                            title="Gán giá vốn và giá bán của sản phẩm cha cho tất cả biến thể"
                          >
                            <DollarSign size={13} />
                            Áp dụng giá cha cho tất cả
                          </button>
                        </div>
                      </div>

                      <div className="pi-variant-table-wrap">
                        <table className="pi-variant-table">
                          <thead>
                            <tr>
                              <th>Tên biến thể</th>
                              <th style={{ width: 220 }}>Mã vạch</th>
                              <th style={{ width: 125 }}>Giá vốn (đ)</th>
                              <th style={{ width: 125 }}>Giá bán (đ)</th>
                              <th style={{ width: 115 }}>Trạng thái</th>
                              <th style={{ width: 50, textAlign: 'center' }}>Xóa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variants.filter((v) => !v.isRemoved).map((v) => (
                              <tr key={v.key}>
                                <td className="pi-variant-name-cell">
                                  <input
                                    type="text"
                                    className="pi-edit-input"
                                    value={v.name}
                                    onChange={(e) => handleVariantChange(v.key, 'name', e.target.value)}
                                    style={{ fontSize: 13, padding: '5px 8px' }}
                                  />
                                </td>
                                <td>
                                  <div className="pi-variant-barcode-wrap">
                                    <input
                                      type="text"
                                      className="pi-edit-input"
                                      placeholder="Quét/Nhập mã vạch"
                                      value={v.barcode}
                                      onChange={(e) => handleVariantChange(v.key, 'barcode', e.target.value)}
                                      style={{ fontSize: 13, padding: '5px 8px' }}
                                    />
                                    <button
                                      type="button"
                                      className="pi-btn-scan-mini"
                                      title="Quét mã vạch cho biến thể này"
                                      onClick={() => handleScanBarcodeForVariant(v.key)}
                                    >
                                      <ScanLine size={13} />
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  <MoneyInput
                                    className="pi-edit-input"
                                    value={v.costPrice}
                                    onChange={(val) => handleVariantChange(v.key, 'costPrice', val)}
                                    style={{ fontSize: 13, padding: '5px 8px', textAlign: 'right' }}
                                    placeholder="0"
                                  />
                                </td>
                                <td>
                                  <MoneyInput
                                    className="pi-edit-input"
                                    value={v.sellingPrice}
                                    onChange={(val) => handleVariantChange(v.key, 'sellingPrice', val)}
                                    style={{ fontSize: 13, padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}
                                    placeholder="0"
                                  />
                                </td>
                                <td>
                                  <select
                                    className="pi-edit-input"
                                    value={v.status}
                                    onChange={(e) => handleVariantChange(v.key, 'status', e.target.value)}
                                    style={{ fontSize: 12.5, padding: '4px 6px' }}
                                  >
                                    <option value="active">Đang bán</option>
                                    <option value="inactive">Ngừng bán</option>
                                  </select>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className="pi-attr-del-btn"
                                    onClick={() => handleRemoveVariant(v.key)}
                                    title="Xóa biến thể này"
                                  >
                                    <Trash2 size={15} color="#EF4444" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section 4: Giá vốn & Giá bán */}
              <div className="pi-edit-section" style={{ marginTop: 20 }}>
                <div className="pi-edit-sec-head">
                  <h3 className="pi-edit-sec-title">
                    <DollarSign size={16} color="#059669" />
                    {isChild ? 'Giá vốn & Giá bán của biến thể này' : 'Giá vốn & Giá bán chung'}
                  </h3>
                  {isParent && variants.length > 0 && (
                    <p className="pi-edit-sec-desc">
                      Giá này sẽ là giá mặc định cho sản phẩm cha và các biến thể con mới thêm.
                    </p>
                  )}
                  {isChild && (
                    <p className="pi-edit-sec-desc">
                      Bạn có thể đặt giá vốn và giá bán riêng cho biến thể này độc lập với sản phẩm cha.
                    </p>
                  )}
                </div>

                <div className="pi-edit-field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="pi-edit-field">
                    <label className="pi-edit-label">Giá vốn (VNĐ)</label>
                    <MoneyInput
                      className="pi-edit-input"
                      value={formData.costPrice}
                      onChange={(val) => handleInputChange('costPrice', val)}
                      placeholder="0"
                    />
                  </div>

                  <div className="pi-edit-field">
                    <label className="pi-edit-label">Giá bán (VNĐ) *</label>
                    <MoneyInput
                      className="pi-edit-input"
                      value={formData.sellingPrice}
                      onChange={(val) => handleInputChange('sellingPrice', val)}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pi-modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="pi-modal-footer-left" style={{ display: 'flex', alignItems: 'center' }}>
                {!isCreateMode && (
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      cursor: 'pointer',
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: '#1E293B',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      className="pi-cb"
                      checked={formData.status !== 'inactive'}
                      onChange={(e) => handleInputChange('status', e.target.checked ? 'active' : 'inactive')}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#004AC6' }}
                    />
                    <span>Đang kinh doanh</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 15,
                        height: 15,
                        borderRadius: '50%',
                        border: '1.2px solid #94A3B8',
                        color: '#64748B',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'help',
                      }}
                      title="Cho phép kinh doanh và hiển thị hàng hóa này trên hệ thống bán hàng"
                    >
                      i
                    </span>
                  </label>
                )}
              </div>

              <div className="pi-modal-footer-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="pi-modal-btn pi-modal-btn--secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="pi-modal-btn pi-modal-btn--primary"
                  disabled={submitting}
                >
                  {submitting
                    ? (isCreateMode ? 'Đang tạo…' : 'Đang cập nhật…')
                    : (isCreateMode ? 'Lưu sản phẩm' : 'Lưu thay đổi')}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: THẺ KHO & LỊCH SỬ GIÁ */}
        {modalTab === 'stockCard' && (
          <div className="pi-modal-body pi-stock-card-body">
            {/* Overview Stats Bar */}
            <div className="pi-stock-overview-bar" style={{ marginBottom: 20 }}>
              <div className="pi-stock-stat-item">
                <span className="pi-stock-stat-label">Tồn kho hiện tại</span>
                <span className="pi-stock-stat-val pi-stock-stat-val--blue">
                  {product?.onHand ?? product?.stock ?? 0} {formData.baseUnitName}
                </span>
              </div>
              <div className="pi-stock-stat-item">
                <span className="pi-stock-stat-label">Giá vốn hiện tại</span>
                <span className="pi-stock-stat-val">
                  {(formData.costPrice != null && formData.costPrice !== '' && Number(formData.costPrice) > 0)
                    ? `${Number(formData.costPrice).toLocaleString('vi-VN')} đ`
                    : 'N/A'}
                </span>
              </div>
              <div className="pi-stock-stat-item">
                <span className="pi-stock-stat-label">Giá bán niêm yết</span>
                <span className="pi-stock-stat-val pi-stock-stat-val--green">
                  {(formData.sellingPrice != null && formData.sellingPrice !== '' && Number(formData.sellingPrice) > 0)
                    ? `${Number(formData.sellingPrice).toLocaleString('vi-VN')} đ`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Body: History Table */}
            <h3 className="pi-unit-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} color="#64748B" />
              Lịch sử biến động giá nhập & Giao dịch kho
            </h3>

            {loadingStockHistory && (
              <div className="pi-stock-loading">
                Đang tải dữ liệu thẻ kho…
              </div>
            )}

            {!loadingStockHistory && stockHistory.length === 0 && (
              <div className="pi-stock-empty">
                <Package size={36} color="#CBD5E1" />
                <p>Chưa có biến động giao dịch hoặc lịch sử giá cho sản phẩm này.</p>
              </div>
            )}

            {!loadingStockHistory && stockHistory.length > 0 && (
              <div className="pi-stock-table-wrap">
                <table className="pi-stock-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Loại biến động</th>
                      <th>Giá vốn (Cũ → Mới)</th>
                      <th>Giá bán (Cũ → Mới)</th>
                      <th>Số lượng</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockHistory.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td style={{ color: '#64748B', whiteSpace: 'nowrap' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : (item.date || 'N/A')}
                        </td>
                        <td>
                          <span className="pi-badge-parent" style={{ background: '#F1F5F9', color: '#334155' }}>
                            {item.changeType || item.type || 'Cập nhật giá'}
                          </span>
                        </td>
                        <td>
                          {item.oldCostPrice != null && item.newCostPrice != null ? (
                            <span>
                              {Number(item.oldCostPrice).toLocaleString('vi-VN')} → <strong>{Number(item.newCostPrice).toLocaleString('vi-VN')} đ</strong>
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>
                          {item.oldSellingPrice != null && item.newSellingPrice != null ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>
                              {Number(item.oldSellingPrice).toLocaleString('vi-VN')} → <strong>{Number(item.newSellingPrice).toLocaleString('vi-VN')} đ</strong>
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {item.quantity != null ? `${item.quantity > 0 ? `+${item.quantity}` : item.quantity} ${formData.baseUnitName || 'N/A'}` : 'N/A'}
                        </td>
                        <td style={{ color: '#64748B', fontSize: 12.5 }}>
                          {item.note || item.reason || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer for StockCard tab */}
        {modalTab !== 'info' && (
          <div className="pi-modal-footer">
            <button
              type="button"
              className="pi-modal-btn pi-modal-btn--secondary"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        )}

        {/* Interactive Barcode Capture Modal */}
        <BarcodeCaptureModal
          isOpen={Boolean(barcodeScannerTarget)}
          onClose={() => setBarcodeScannerTarget(null)}
          onCapture={handleBarcodeCaptured}
          targetTitle={barcodeScannerTarget?.title || 'hàng hóa'}
        />

        {/* Pop-up Thêm nhanh nhóm hàng hóa (Danh mục) */}
        {isCreateCategoryModalOpen && (
          <div className="pi-nested-modal-backdrop" onClick={() => setIsCreateCategoryModalOpen(false)}>
            <div className="pi-nested-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pi-nested-modal-header">
                <h3 className="pi-nested-modal-title">
                  <FolderPlus size={18} color="#004AC6" />
                  Thêm nhanh nhóm hàng hóa (Danh mục)
                </h3>
                <button
                  type="button"
                  className="pi-nested-modal-close"
                  onClick={() => setIsCreateCategoryModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveNewCategory}>
                <div className="pi-nested-modal-body">
                  {createCategoryError && (
                    <div style={{ padding: '8px 12px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 13 }}>
                      {createCategoryError}
                    </div>
                  )}
                  <div className="pi-edit-field">
                    <label className="pi-edit-label">Tên nhóm hàng hóa (Danh mục) *</label>
                    <input
                      type="text"
                      className="pi-edit-input"
                      placeholder="Nhập tên danh mục (ví dụ: Nước giải khát, Bánh kẹo...)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="pi-edit-field">
                    <label className="pi-edit-label">Mô tả danh mục (Tùy chọn)</label>
                    <textarea
                      className="pi-edit-input"
                      style={{ minHeight: 70, resize: 'vertical' }}
                      placeholder="Mô tả ngắn về nhóm hàng hóa..."
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pi-nested-modal-footer">
                  <button
                    type="button"
                    className="pi-edit-btn-cancel"
                    onClick={() => setIsCreateCategoryModalOpen(false)}
                    disabled={creatingCategory}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="pi-edit-btn-save"
                    disabled={creatingCategory}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {creatingCategory ? 'Đang lưu...' : 'Lưu danh mục'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
