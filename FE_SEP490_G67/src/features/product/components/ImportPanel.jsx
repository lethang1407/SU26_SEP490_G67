import ImportPanelProductTab from './ImportPanelProductTab';
import ImportPanelPreview from './ImportPanelPreview';
import { formatMoney, groupSuggestionsBySupplier } from '../utils/productUtils';

export default function ImportPanel({
  panelItems,
  overrides,
  step,
  suggesting = false,
  supplierFallback = [],
  onChangeQty,
  onChangeCover,
  onChangeSupplier,
  onChangeOrderTiming,
  onChangeUnit,
  onRemove,
  onPreview,
  onBackSetup,
  onCreate,
  onClose,
  creating,
}) {
  const title = step === 'preview' ? 'Xem trước đơn' : 'Chuẩn bị đơn nhập';
  const qtyTotal = panelItems.reduce((sum, i) => {
    const unitBase = Number(overrides[i.productId]?.unitBase ?? 1) || 1;
    const packQty = Number(overrides[i.productId]?.quantity ?? i.suggestedQty) || 0;
    return sum + Math.round(packQty * unitBase);
  }, 0);

  const previewGroups =
    step === 'preview'
      ? groupSuggestionsBySupplier(
          panelItems.map((item) => {
            const ov = overrides[item.productId] || {};
            const unitBase = Number(ov.unitBase ?? 1) || 1;
            const packQty = Number(ov.quantity ?? item.suggestedQty) || 0;
            const baseQty = Math.round(packQty * unitBase);
            const cost = Number(ov.costPerUnit ?? item.costPerUnit) || 0;
            return {
              ...item,
              suggestedQty: baseQty,
              quantity: baseQty,
              packQty,
              unitName: ov.unitName || item.unitName || 'sp',
              unitBase,
              supplierName: ov.supplierName ?? item.supplierName,
              supplierId: ov.supplierId ?? item.supplierId,
              costPerUnit: cost,
              lineTotal: baseQty * cost,
            };
          }),
        )
      : [];
  const previewTotal = previewGroups.reduce((s, g) => s + g.total, 0);

  return (
    <aside className="setting-panel">
      <div className="sp-head">
        <div className="sp-head-top">
          <div>
            <div className="sp-title">{title}</div>
          </div>
          <button type="button" className="sp-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="sp-steps">
          <div className={`sp-step ${step === 'setup' ? 'on' : 'done'}`}>1. Chỉnh đơn</div>
          <div className={`sp-step ${step === 'preview' ? 'on' : ''}`}>2. Xem trước</div>
        </div>
      </div>

      <div className="sp-body-wrap">
        {suggesting ? (
          <div className="sp-loading" aria-live="polite">
            Đang thêm sản phẩm vào đơn…
          </div>
        ) : null}
        {step === 'setup' && (
          <ImportPanelProductTab
            items={panelItems}
            overrides={overrides}
            supplierFallback={supplierFallback}
            onChangeQty={onChangeQty}
            onChangeCover={onChangeCover}
            onChangeSupplier={onChangeSupplier}
            onChangeOrderTiming={onChangeOrderTiming}
            onChangeUnit={onChangeUnit}
            onRemove={onRemove}
          />
        )}
        {step === 'preview' && (
          <ImportPanelPreview items={panelItems} overrides={overrides} />
        )}
      </div>

      <div className="sp-foot">
        <div className="sp-summary">
          {step === 'preview' ? (
            <>
              {previewGroups.length} đơn · tổng <b>{formatMoney(previewTotal)}</b>
            </>
          ) : (
            `${panelItems.length} sản phẩm${qtyTotal > 0 ? ` · ${qtyTotal} sp` : ''}`
          )}
        </div>
        {step === 'setup' ? (
          <div className="sp-foot-row">
            <button
              type="button"
              className="btn primary"
              onClick={onPreview}
              disabled={!panelItems.length || suggesting}
            >
              Xem trước
            </button>
          </div>
        ) : (
          <div className="sp-foot-row">
            <button type="button" className="btn ghost" onClick={onBackSetup}>
              Quay lại
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={onCreate}
              disabled={creating || !panelItems.length}
            >
              {creating ? 'Đang tạo…' : `Tạo ${Math.max(previewGroups.length, 1)} đơn`}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
