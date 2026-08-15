import { useRef, useState } from 'react';

export default function ProductExcelModal({
  open,
  onClose,
  onExport,
  onDownloadTemplate,
  onImportFile,
  busy = false,
}) {
  const fileRef = useRef(null);
  const [localError, setLocalError] = useState('');

  if (!open) return null;

  const handlePick = () => {
    setLocalError('');
    fileRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setLocalError('Chỉ nhận file .xlsx');
      return;
    }
    try {
      await onImportFile?.(file);
    } catch (err) {
      setLocalError(
        err?.response?.data?.message ||
          err?.message ||
          'Không nhập được file Excel.',
      );
    }
  };

  return (
    <>
      <div className="pi-overlay" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div className="excel-modal" role="dialog" aria-label="Nhập / Xuất Excel">
        <div className="excel-modal__head">
          <div>
            <div className="excel-modal__kicker">Excel</div>
            <div className="excel-modal__title">Nhập / Xuất danh sách</div>
          </div>
          <button
            type="button"
            className="excel-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="excel-modal__body">
          <p className="excel-modal__hint">
            Xuất danh sách đang lọc để đối chiếu. Nhập file mẫu để thêm sản phẩm vào panel chuẩn bị đơn
            (theo SKU hoặc mã vạch + số lượng).
          </p>

          <div className="excel-modal__actions">
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => onExport?.()}
            >
              Xuất danh sách (.xlsx)
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => onDownloadTemplate?.()}
            >
              Tải mẫu nhập đơn
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={handlePick}
            >
              {busy ? 'Đang xử lý…' : 'Chọn file để nhập…'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={handleFile}
            />
          </div>

          {localError ? <div className="excel-modal__error">{localError}</div> : null}
        </div>
      </div>
    </>
  );
}
