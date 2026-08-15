export default function ProductBulkBar({ count, onClear }) {
  if (!count) return null;

  return (
    <div className="bulkbar">
      <div className="bulk-left">
        Đã chọn <b>{count} sản phẩm</b>
        <span className="bulk-hint"> — tự thêm vào đơn nhập bên phải</span>
      </div>
      <div className="bulk-actions">
        <button type="button" className="btn" onClick={onClear}>
          Bỏ chọn tất cả
        </button>
      </div>
    </div>
  );
}
