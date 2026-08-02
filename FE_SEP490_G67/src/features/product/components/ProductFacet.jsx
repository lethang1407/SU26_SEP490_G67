import { DEMO_CATEGORY_NAMES, FACETS } from '../constants';

export default function ProductFacet({
  facet,
  onFacetChange,
  categories = DEMO_CATEGORY_NAMES,
  categoryId,
  onCategoryChange,
}) {
  return (
    <aside className="facet">
      <div className="facet-title">Lọc để chọn</div>

      {FACETS.map((group) => (
        <div key={group.group}>
          <div className="facet-group">{group.group}</div>
          {group.items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`chip ${item.nested ? 'nested' : ''} ${facet === item.key ? 'active' : ''}`}
              onClick={() => onFacetChange(item.key)}
            >
              <span className="label">
                <span className={`dot ${item.dot}`} />
                <span className="chip-main">{item.label}</span>
              </span>
            </button>
          ))}
        </div>
      ))}

      <div className="facet-divider" />
      <div className="facet-title">Danh mục</div>
      {categories.slice(0, 4).map((cat) => {
        const name = typeof cat === 'string' ? cat : cat.name;
        const id = typeof cat === 'string' ? name : cat.id;
        const active = categoryId != null && String(categoryId) === String(id);
        return (
          <button
            key={id}
            type="button"
            className={`cat ${active ? 'active' : ''}`}
            onClick={() => onCategoryChange?.(active ? null : id)}
          >
            {name}
          </button>
        );
      })}
      <div className="cat-more">+{Math.max(categories.length - 4, 214)} danh mục…</div>
    </aside>
  );
}
