import { AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';

const TONE_ICON = {
  positive: TrendingUp,
  warning: AlertTriangle,
};

export default function RevenueHighlights({ highlights }) {
  const items = highlights ?? [];

  return (
    <aside className="rr-highlights">
      <h3 className="rr-highlights_title">
        <Lightbulb size={14} /> Điểm đáng chú ý
      </h3>

      {items.length === 0 ? (
        <p className="rr-highlights_empty">Chưa đủ dữ liệu để rút ra nhận xét.</p>
      ) : (
        items.map((item, index) => {
          const tone = item.tone === 'warning' ? 'warning' : 'positive';
          const Icon = TONE_ICON[tone];
          return (
            <div key={`${tone}-${index}`} className={`rr-highlights_item rr-highlights_item--${tone}`}>
              <p>
                <Icon size={14} />
                <span>{item.message}</span>
              </p>
              {item.recommendation && (
                <p className="rr-highlights_note">
                  <strong>Khuyến nghị:</strong> {item.recommendation}
                </p>
              )}
            </div>
          );
        })
      )}
    </aside>
  );
}
