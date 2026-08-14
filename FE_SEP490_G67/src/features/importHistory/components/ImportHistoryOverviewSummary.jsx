import { formatMoneyCompact } from '../utils/importHistoryUtils';

export default function ImportHistoryOverviewSummary({ summary, weekly }) {
  return (
    <div className="ih-summary">
      <section className="ih-card ih-month-card">
        <div className="ih-month-card__head">
          <h2 className="ih-card__title">
            Tổng số lượng sản phẩm đã nhập trong {summary.monthLabel}
          </h2>
          <span className="ih-badge">{summary.todayLabel}</span>
        </div>
        <div className="ih-month-card__stats">
          <div>
            <div className="ih-stat__label">Tổng SL nhập</div>
            <div className="ih-stat__value">
              {formatMoneyCompact(summary.totalQty)} <span>món</span>
            </div>
          </div>
          <div>
            <div className="ih-stat__label">Tổng số đơn</div>
            <div className="ih-stat__value">
              {summary.totalOrders} <span>đơn</span>
            </div>
          </div>
        </div>
        <div className="ih-month-card__cost">
          <div className="ih-stat__label">Tổng chi phí</div>
          <div className="ih-month-card__cost-value">
            {formatMoneyCompact(summary.totalCost)} <span>VNĐ</span>
          </div>
        </div>
      </section>

      <section className="ih-card ih-week-card">
        <div className="ih-week-card__head">
          <h2 className="ih-card__title">Dòng tiền nhập hàng theo tuần</h2>
          <span className="ih-week-card__month">{weekly.monthTitle}</span>
        </div>
        <div className="ih-week-table-wrap">
          <table className="ih-week-table">
            <thead>
              <tr>
                <th>Tuần</th>
                <th>Ngày dự kiến</th>
                <th>Số đơn nhập</th>
                <th>Tổng tiền cần chuẩn bị</th>
              </tr>
            </thead>
            <tbody>
              {weekly.weeks.map((w) => (
                <tr key={w.id} className={w.isCurrent ? 'is-current' : ''}>
                  <td>
                    <span className="ih-week-label">
                      {w.weekLabel}
                      {w.isCurrent ? <span className="ih-now-badge">Hiện tại</span> : null}
                    </span>
                  </td>
                  <td>{w.dateRange}</td>
                  <td>{w.orderCount}</td>
                  <td className="ih-week-amount">{formatMoneyCompact(w.amount)} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
