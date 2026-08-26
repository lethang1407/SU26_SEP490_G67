import { useMemo, useState } from 'react';
import { FACETS } from '../constants';

const TOP_CATEGORY_COUNT = 5;

const CATEGORY_NAME_MAP = {
  'do dung gia dinh': 'Đồ dùng gia đình',
  'do uong': 'Đồ uống',
  'thuc pham kho': 'Thực phẩm khô',
  'banh keo': 'Bánh kẹo',
  'gia vi': 'Gia vị',
  'gia vi & che bien': 'Gia vị & Chế biến',
  'sua & tuoi': 'Sữa & tươi',
  'sua': 'Sữa',
  'hoa my pham': 'Hóa mỹ phẩm',
  'dau an': 'Dầu ăn',
  'tp kho': 'Thực phẩm khô',
};

export function formatCategoryName(name) {
  if (!name) return '';
  const key = String(name).trim().toLowerCase();
  return CATEGORY_NAME_MAP[key] || name;
}

function normalizeCategories(categories) {
  const list = Array.isArray(categories) ? categories : [];
  return list
    .map((cat) => {
      if (typeof cat === 'string') {
        return { id: cat, name: formatCategoryName(cat), productCount: 0 };
      }
      return {
        id: cat.id,
        name: formatCategoryName(cat.name),
        productCount: Number(cat.productCount) || 0,
      };
    })
    .filter((cat) => cat.id != null && cat.name)
    .sort((a, b) => {
      if (b.productCount !== a.productCount) {
        return b.productCount - a.productCount;
      }
      return String(a.name).localeCompare(String(b.name), 'vi');
    });
}

export default function ProductFacet({
  facet,
  onFacetChange,
  categories = [],
  categoryId,
  onCategoryChange,
}) {
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const sortedCategories = useMemo(
    () => normalizeCategories(categories),
    [categories],
  );

  const visibleCategories = useMemo(() => {
    if (categoriesExpanded || sortedCategories.length <= TOP_CATEGORY_COUNT) {
      return sortedCategories;
    }
    const top = sortedCategories.slice(0, TOP_CATEGORY_COUNT);
    // Nếu đang chọn danh mục ngoài top 5 → vẫn hiện nó
    if (categoryId != null) {
      const selected = sortedCategories.find(
        (c) => String(c.id) === String(categoryId),
      );
      if (selected && !top.some((c) => String(c.id) === String(selected.id))) {
        return [...top, selected];
      }
    }
    return top;
  }, [sortedCategories, categoriesExpanded, categoryId]);

  const hiddenCount = Math.max(0, sortedCategories.length - TOP_CATEGORY_COUNT);

  return (
    <aside className="facet pi-autohide-scroll">
      <div className="facet-title">Nhóm sản phẩm</div>

      {FACETS.map((group) => (
        <div key={group.group}>
          <div className="facet-group">{group.group}</div>
          {group.items.map((item) => {
            const isActive = facet === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`chip ${item.nested ? 'nested' : ''} ${isActive ? 'active' : ''}`}
                onClick={() => onFacetChange(isActive ? 'all' : item.key)}
              >
                <span className="label">
                  <span className={`dot ${item.dot}`} />
                  <span className="chip-main">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      ))}

      <div className="facet-divider" />
      <div className="facet-title">Danh mục</div>

      {!sortedCategories.length ? (
        <div className="cat-empty">Chưa có danh mục từ hệ thống.</div>
      ) : (
        <>
          {visibleCategories.map((cat) => {
            const active =
              categoryId != null && String(categoryId) === String(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                className={`cat ${active ? 'active' : ''}`}
                onClick={() => onCategoryChange?.(active ? null : cat.id)}
              >
                {cat.name}
              </button>
            );
          })}

          {hiddenCount > 0 && !categoriesExpanded ? (
            <button
              type="button"
              className="cat-more"
              onClick={() => setCategoriesExpanded(true)}
            >
              +{hiddenCount} danh mục…
            </button>
          ) : null}

          {categoriesExpanded && sortedCategories.length > TOP_CATEGORY_COUNT ? (
            <button
              type="button"
              className="cat-more"
              onClick={() => setCategoriesExpanded(false)}
            >
              Thu gọn
            </button>
          ) : null}
        </>
      )}
    </aside>
  );
}
