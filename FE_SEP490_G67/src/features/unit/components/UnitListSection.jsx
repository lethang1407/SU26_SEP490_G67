import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Download } from 'lucide-react';
import UnitTable from './UnitTable';
import UnitFormModal from './UnitFormModal';
import UnitProductsModal from './UnitProductsModal';
import {
  UNIT_SORT,
  UNIT_SORT_OPTIONS,
} from '../constants/unitConstants';
import {
  getCustomUnitNames,
  saveCustomUnitNames,
  aggregateUnitsFromProducts,
  filterAndSortUnits,
} from '../utils/unitUtils';
import { productsApi } from '../../product/api';
import '../../../css/Unit.css';

export default function UnitListSection({
  onOpenConversionModal,
  onUnitChanged,
}) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [sortOption, setSortOption] = useState(UNIT_SORT.NAME_ASC);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState('create');
  const [editingUnit, setEditingUnit] = useState(null);

  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [selectedUnitForProducts, setSelectedUnitForProducts] = useState(null);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load products data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getProducts({ facet: 'all', size: 1000 });
      const items = res?.content || [];
      setProducts(items);
    } catch (err) {
      console.error('Failed to load products for unit management', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Aggregated units from actual products + library
  const allAggregatedUnits = useMemo(() => {
    return aggregateUnitsFromProducts(products);
  }, [products]);

  // Filtered & sorted units
  const filteredUnits = useMemo(() => {
    return filterAndSortUnits(allAggregatedUnits, {
      keyword: debouncedKeyword,
      sort: sortOption,
    });
  }, [allAggregatedUnits, debouncedKeyword, sortOption]);

  const subtitle = useMemo(() => {
    return `${filteredUnits.length} đơn vị tính · thêm / sửa ngay trên danh sách`;
  }, [filteredUnits.length]);

  // Actions
  const handleOpenCreate = () => {
    setFormModalMode('create');
    setEditingUnit(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (unit) => {
    setFormModalMode('edit');
    setEditingUnit(unit);
    setFormModalOpen(true);
  };

  const handleSaveUnit = ({ name }) => {
    const custom = getCustomUnitNames();
    const cleanName = name.trim();

    if (formModalMode === 'edit' && editingUnit) {
      const updated = custom.map((n) =>
        n.toLowerCase() === editingUnit.name.toLowerCase() ? cleanName : n,
      );
      if (!custom.some((n) => n.toLowerCase() === cleanName.toLowerCase())) {
        updated.push(cleanName);
      }
      saveCustomUnitNames(updated);
      setSuccessMsg(`Đã cập nhật đơn vị tính "${cleanName}" thành công.`);
    } else {
      const exists = allAggregatedUnits.some(
        (u) => u.name.toLowerCase() === cleanName.toLowerCase(),
      );
      if (exists) {
        setErrorMsg(`Đơn vị "${cleanName}" đã tồn tại.`);
        return;
      }
      saveCustomUnitNames([...custom, cleanName]);
      setSuccessMsg(`Đã thêm mới đơn vị tính "${cleanName}" thành công.`);
    }

    setFormModalOpen(false);
    onUnitChanged?.();
    loadData();
  };

  const handleDeleteUnit = (unit) => {
    if (unit.isSystem) {
      alert('Không thể xóa đơn vị chuẩn hệ thống.');
      return;
    }
    if ((unit.totalCount || 0) > 0) {
      const confirmDelete = window.confirm(
        `Đơn vị "${unit.name}" đang được sử dụng bởi ${unit.totalCount} sản phẩm. Bạn có chắc chắn muốn xóa khỏi danh mục tùy chỉnh?`,
      );
      if (!confirmDelete) return;
    } else {
      const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa đơn vị "${unit.name}"?`);
      if (!confirmDelete) return;
    }

    const custom = getCustomUnitNames();
    const next = custom.filter((n) => n.toLowerCase() !== unit.name.toLowerCase());
    saveCustomUnitNames(next);
    setSuccessMsg(`Đã xóa đơn vị tính "${unit.name}".`);
    onUnitChanged?.();
    loadData();
  };

  const handleViewProducts = (unit) => {
    setSelectedUnitForProducts(unit);
    setProductsModalOpen(true);
  };

  const handleExportExcel = () => {
    alert('Đang trích xuất danh sách đơn vị tính ra file Excel...');
  };

  return (
    <div className="unit-section-container">
      {/* ─── Page Header ─── */}
      <header className="unit-page__header">
        <div>
          <h1 className="unit-page__title">Danh sách đơn vị tính</h1>
          <p className="unit-page__subtitle">{subtitle}</p>
        </div>
        <div className="unit-page__actions">
          <button
            type="button"
            className="cat-btn cat-btn--outline-green"
            onClick={handleExportExcel}
          >
            <Download size={15} />
            Xuất Excel
          </button>
          <button
            type="button"
            className="cat-btn cat-btn--primary"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            Thêm đơn vị tính
          </button>
        </div>
      </header>

      {/* ─── Notification Alerts ─── */}
      {successMsg && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065F46' }}
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠ {errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#991B1B' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Toolbar: Tìm kiếm & Sắp xếp ─── */}
      <div className="unit-toolbar">
        <label className="cat-search" style={{ flex: 1 }}>
          <Search size={16} />
          <input
            type="search"
            placeholder="Tìm kiếm theo tên đơn vị tính…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Tìm kiếm đơn vị"
          />
        </label>

        <label className="cat-sort">
          <span>Sắp xếp:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            {UNIT_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ─── Main Unit Table ─── */}
      <UnitTable
        items={filteredUnits}
        loading={loading}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteUnit}
        onViewProducts={handleViewProducts}
      />

      {/* ─── Modals ─── */}
      <UnitFormModal
        open={formModalOpen}
        mode={formModalMode}
        initialData={editingUnit}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleSaveUnit}
      />

      <UnitProductsModal
        open={productsModalOpen}
        unit={selectedUnitForProducts}
        onClose={() => {
          setProductsModalOpen(false);
          setSelectedUnitForProducts(null);
        }}
        onOpenProductConversion={(p) => {
          onOpenConversionModal?.(p);
        }}
      />
    </div>
  );
}
