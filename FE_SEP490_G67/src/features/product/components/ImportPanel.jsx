import ImportPanelProductTab from './ImportPanelProductTab';
import ImportPanelCategoryTab from './ImportPanelCategoryTab';
import ImportPanelPreview from './ImportPanelPreview';
import { formatMoney, groupSuggestionsBySupplier } from '../utils/productUtils';

export default function ImportPanel({
  panelItems,
  overrides,
  activeTab,
  step,
  onTabChange,
  onChangeQty,
  onChangeCover,
  onChangeSupplier,
  onRemove,
  onPreview,
  onBackSetup,
  onCreate,
  onClose,
  creating,
}) {
  const title = step === 'preview' ? 'Xem trước đơn' : 'Chuẩn bị đơn nhập';
  const qtySum = panelItems
    .map((i) => overrides[i.productId]?.quantity ?? i.suggestedQty)
    .join(' + ');

  const previewGroups =
    step === 'preview'
      ? groupSuggestionsBySupplier(
          panelItems.map((item) => ({
            ...item,
            suggestedQty: overrides[item.productId]?.quantity ?? item.suggestedQty,
            supplierName: overrides[item.productId]?.supplierName ?? item.supplierName,
            supplierId: overrides[item.productId]?.supplierId ?? item.supplierId,
          })),
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
          <div className={`sp-step ${step === 'setup' ? 'on' : 'done'}`}>1. Cấu hình</div>
          <div className={`sp-step ${step === 'preview' ? 'on' : ''}`}>2. Xem trước</div>
        </div>
        {step === 'setup' && (
          <div className="sp-tabs">
            <button
              type="button"
              className={`sp-tab ${activeTab === 'product' ? 'active' : ''}`}
              onClick={() => onTabChange('product')}
            >
              Theo sản phẩm
            </button>
            <button
              type="button"
              className={`sp-tab ${activeTab === 'category' ? 'active' : ''}`}
              onClick={() => onTabChange('category')}
            >
              Theo nhóm hàng
            </button>
          </div>
        )}
      </div>

      {step === 'setup' && activeTab === 'product' && (
        <ImportPanelProductTab
          items={panelItems}
          overrides={overrides}
          onChangeQty={onChangeQty}
          onChangeCover={onChangeCover}
          onChangeSupplier={onChangeSupplier}
          onRemove={onRemove}
        />
      )}
      {step === 'setup' && activeTab === 'category' && <ImportPanelCategoryTab />}
      {step === 'preview' && (
        <ImportPanelPreview items={panelItems} overrides={overrides} />
      )}

      <div className="sp-foot">
        <div className="sp-summary">
          {step === 'preview' ? (
            <>
              {previewGroups.length} đơn · tổng <b>{formatMoney(previewTotal)}</b>
            </>
          ) : activeTab === 'category' ? (
            'Cài đủ bán theo nhóm hàng'
          ) : (
            `${panelItems.length} sản phẩm · gợi ý ${qtySum || '—'}`
          )}
        </div>
        {step === 'setup' ? (
          <div className="sp-foot-row">
            <button type="button" className="btn ghost">
              Lưu NCC
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={onPreview}
              disabled={!panelItems.length}
            >
              Xem trước →
            </button>
          </div>
        ) : (
          <div className="sp-foot-row">
            <button type="button" className="btn ghost" onClick={onBackSetup}>
              ← Quay lại
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
