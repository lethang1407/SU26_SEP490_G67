import { MOCK_CATEGORIES } from '../constants';

export default function ImportPanelCategoryTab({ categories = MOCK_CATEGORIES }) {
  return (
    <div className="sp-body sp-body--category">
      <div className="cover-src" style={{ marginBottom: 4, padding: '0 2px' }}>
        Cài một lần cho cả nhóm hàng. Sản phẩm trong nhóm dùng số này trừ khi có cài riêng hoặc bạn
        đổi lúc tạo đơn.
      </div>
      <div className="cat-rule">
        <table className="cat-table">
          <thead>
            <tr>
              <th>Nhóm hàng</th>
              <th>Đủ bán (ngày)</th>
              <th>NCC mặc định</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="field-box">
                    {c.name} <span className="caret">▾</span>
                  </div>
                </td>
                <td>
                  <div className="field-box">{c.coverDays} ngày</div>
                </td>
                <td>
                  <div className="field-box">
                    {c.defaultSupplierName || '—'} <span className="caret">▾</span>
                  </div>
                </td>
                <td>
                  <button type="button" className="rm">
                    Bỏ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="cat-add">
        + Thêm nhóm hàng
      </button>
    </div>
  );
}
