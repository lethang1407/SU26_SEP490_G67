export default function ProductBulkBar({ count, onClear, onPrepare }) {
  if (!count) return null;

  return (
    <div className="bulkbar">
      <div className="bulk-left">
        Đã chọn <b>{count} sản phẩm</b>
      </div>
      <div className="bulk-actions">
        <button type="button" className="btn" onClick={onClear}>
          Bỏ chọn
        </button>
        <button type="button" className="btn primary" onClick={onPrepare}>
          Chuẩn bị →
        </button>
      </div>
    </div>
  );
}
