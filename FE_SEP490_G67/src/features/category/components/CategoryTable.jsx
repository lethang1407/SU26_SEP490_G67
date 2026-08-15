import { Pencil } from 'lucide-react';
import { formatProductCount, formatUpdatedAt } from '../utils/categoryUtils';

export default function CategoryTable({ items, loading, onEdit }) {
  if (loading) {
    return (
      <div className="cat-table-card cat-table-card--empty">
        <p>Đang tải danh mục…</p>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="cat-table-card cat-table-card--empty">
        <p>Chưa có danh mục phù hợp. Thêm danh mục đầu tiên để bắt đầu.</p>
      </div>
    );
  }

  return (
    <div className="cat-table-card">
      <div className="cat-table-wrap">
        <table className="cat-table">
          <thead>
            <tr>
              <th>Danh mục</th>
              <th>Số sản phẩm</th>
              <th>Cập nhật</th>
              <th className="cat-table__actions-col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="cat-name">{row.name}</div>
                  {row.description ? (
                    <div className="cat-desc">{row.description}</div>
                  ) : (
                    <div className="cat-desc cat-desc--empty">Chưa có mô tả</div>
                  )}
                </td>
                <td>
                  <span className="cat-count-pill">{formatProductCount(row.productCount)}</span>
                </td>
                <td className="cat-table__muted">{formatUpdatedAt(row.updatedAt)}</td>
                <td>
                  <div className="cat-rowact">
                    <button
                      type="button"
                      className="cat-iconbtn"
                      onClick={() => onEdit?.(row)}
                    >
                      <Pencil size={14} />
                      Chỉnh sửa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
