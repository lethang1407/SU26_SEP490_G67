import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Download, Upload } from 'lucide-react';
import CategoryTable from './CategoryTable';
import CategoryPagination from './CategoryPagination';
import CategoryFormModal from './CategoryFormModal';
import { categoriesApi } from '../api';
import { CATEGORY_PAGE_SIZE, CATEGORY_SORT, CATEGORY_SORT_OPTIONS } from '../constants';
import {
  MOCK_CATEGORIES,
  filterAndSortCategories,
} from '../utils/categoryUtils';
import '../../../css/Category.css';

export default function CategoryListSection({ onCategoryUpdated }) {
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState(CATEGORY_SORT.NAME_ASC);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editing, setEditing] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await categoriesApi.getPage({
        search: keyword || undefined,
        page: page - 1,
        size: CATEGORY_PAGE_SIZE,
      });
      let content = result.content || [];
      if (sort === CATEGORY_SORT.NAME_DESC) {
        content = [...content].sort((a, b) => b.name.localeCompare(a.name, 'vi'));
      } else if (sort === CATEGORY_SORT.COUNT_DESC) {
        content = [...content].sort(
          (a, b) => (b.productCount || 0) - (a.productCount || 0),
        );
      }
      setRows(content);
      setTotalElements(result.totalElements ?? 0);
      setTotalPages(Math.max(1, result.totalPages ?? 1));
      setUsingMock(false);
    } catch {
      const filtered = filterAndSortCategories(MOCK_CATEGORIES, { keyword, sort });
      const start = (page - 1) * CATEGORY_PAGE_SIZE;
      const slice = filtered.slice(start, start + CATEGORY_PAGE_SIZE);
      setRows(slice);
      setTotalElements(filtered.length);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / CATEGORY_PAGE_SIZE)));
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [keyword, page, sort]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const subtitle = useMemo(() => {
    if (usingMock) return 'Demo · thêm / sửa ngay trên danh sách';
    return `${totalElements.toLocaleString('vi-VN')} nhóm · thêm / sửa ngay trên danh sách`;
  }, [totalElements, usingMock]);

  const startIndex = totalElements === 0 ? 0 : (page - 1) * CATEGORY_PAGE_SIZE + 1;
  const endIndex = Math.min(page * CATEGORY_PAGE_SIZE, totalElements);

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setModalMode('edit');
    setEditing(row);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (payload) => {
    if (usingMock) {
      if (modalMode === 'edit' && editing) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === editing.id
              ? {
                  ...r,
                  name: payload.name,
                  description: payload.description,
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        );
      } else {
        const next = {
          id: Date.now(),
          name: payload.name,
          description: payload.description,
          productCount: 0,
          updatedAt: new Date().toISOString(),
        };
        setRows((prev) => [next, ...prev]);
        setTotalElements((n) => n + 1);
      }
      closeModal();
      onCategoryUpdated?.();
      return;
    }

    if (modalMode === 'edit' && editing) {
      await categoriesApi.update(editing.id, payload);
    } else {
      await categoriesApi.create(payload);
    }
    closeModal();
    await loadList();
    onCategoryUpdated?.();
  };

  return (
    <div className="cat-section-container">
      <header className="cat-page__header">
        <div>
          <h1 className="cat-page__title">Danh sách nhóm hàng hóa</h1>
          <p className="cat-page__subtitle">{subtitle}</p>
        </div>
        <div className="cat-page__actions">
          <button
            type="button"
            className="cat-btn cat-btn--outline-green"
            onClick={() => alert('Đang xuất danh sách nhóm hàng hóa ra Excel...')}
          >
            <Download size={15} />
            Xuất Excel
          </button>
          <button
            type="button"
            className="cat-btn cat-btn--outline-gray"
            onClick={() => alert('Tính năng Nhập từ Excel đang được cập nhật!')}
          >
            <Upload size={15} />
            Nhập từ Excel
          </button>
          <button type="button" className="cat-btn cat-btn--primary" onClick={openCreate}>
            <Plus size={16} />
            Thêm nhóm hàng hóa
          </button>
        </div>
      </header>

      <div className="cat-toolbar">
        <label className="cat-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Tìm kiếm theo tên hoặc mã nhóm…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Tìm danh mục"
          />
        </label>
        <label className="cat-sort">
          <span>Sắp xếp:</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            {CATEGORY_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CategoryTable items={rows} loading={loading} onEdit={openEdit} />

      <CategoryPagination
        page={page}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={totalElements}
        onPageChange={setPage}
      />

      <CategoryFormModal
        open={modalOpen}
        mode={modalMode}
        initialData={editing}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
