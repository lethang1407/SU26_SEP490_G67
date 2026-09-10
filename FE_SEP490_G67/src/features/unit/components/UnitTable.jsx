import { Eye, Pencil, Trash2, Package } from 'lucide-react';

export default function UnitTable({
  items = [],
  loading = false,
  onEdit,
  onDelete,
  onViewProducts,
}) {
  if (loading) {
    return (
      <div className="unit-table-card unit-table-card--empty">
        <p>Đang tải danh sách đơn vị tính…</p>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="unit-table-card unit-table-card--empty">
        <p>Không tìm thấy đơn vị tính phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="unit-table-card">
      <div className="unit-table-wrap">
        <table className="unit-table">
          <thead>
            <tr>
              <th>Đơn vị tính</th>
              <th>Vai trò thường dùng</th>
              <th>Số sản phẩm áp dụng</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const hasProducts = (row.totalCount || 0) > 0;
              const isMainlyBase = (row.baseCount || 0) >= (row.convCount || 0) && row.baseCount > 0;
              const isMainlyConv = (row.convCount || 0) > (row.baseCount || 0);

              return (
                <tr key={row.name}>
                  <td>
                    <div className="unit-name-cell">
                      <div className="unit-avatar-icon">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="unit-name-title">{row.name}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {isMainlyBase ? (
                      <span className="unit-type-pill unit-type-pill--blue">Đơn vị gốc</span>
                    ) : isMainlyConv ? (
                      <span className="unit-type-pill unit-type-pill--purple">Đơn vị quy đổi</span>
                    ) : (
                      <span className="unit-type-pill unit-type-pill--emerald">Đơn vị chuẩn</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`unit-count-pill ${!hasProducts ? 'is-zero' : ''}`}
                      onClick={() => hasProducts && onViewProducts?.(row)}
                      title={hasProducts ? 'Bấm để xem danh sách sản phẩm' : 'Chưa có sản phẩm'}
                    >
                      <Package size={13} />
                      <span>{row.totalCount || 0} sản phẩm</span>
                    </button>
                  </td>
                  <td>
                    <div className="unit-actions-cell">
                      {hasProducts && (
                        <button
                          type="button"
                          className="unit-action-btn"
                          title="Xem các sản phẩm dùng đơn vị này"
                          onClick={() => onViewProducts?.(row)}
                        >
                          <Eye size={14} />
                          Xem SP
                        </button>
                      )}
                      <button
                        type="button"
                        className="unit-action-btn"
                        title="Chỉnh sửa tên đơn vị"
                        onClick={() => onEdit?.(row)}
                      >
                        <Pencil size={14} />
                        Sửa
                      </button>
                      {!row.isSystem && (
                        <button
                          type="button"
                          className="unit-action-btn unit-action-btn--delete"
                          title="Xóa đơn vị tùy chỉnh"
                          onClick={() => onDelete?.(row)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
