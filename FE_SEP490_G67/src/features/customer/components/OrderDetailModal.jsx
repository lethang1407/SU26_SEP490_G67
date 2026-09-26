import { useEffect, useState } from "react";
import { getSalesOrderDetail } from "../api";
import { X, FileText } from "lucide-react";
import "../../../css/SalesOrderDetailModal.css";

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "N/A";
const PAYMENT_LABELS = {
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
  DEBT: "Ghi nợ",
};

function ItemTable({ items = [], returnItems = false }) {
  return (
    <table className="sod-items">
      <thead>
        <tr>
          <th className="sod-col-idx">#</th>
          <th>Sản phẩm</th>
          <th>ĐVT</th>
          <th className="sod-num">{returnItems ? "SL trả" : "SL mua"}</th>
          {!returnItems && <th className="sod-num">SL đã trả</th>}
          <th className="sod-num">Đơn giá</th>
          <th className="sod-num">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 && (
          <tr>
            <td colSpan={returnItems ? 6 : 7} className="sod-empty">
              Không có dòng hàng nào
            </td>
          </tr>
        )}
        {items.map((item, index) => (
          <tr
            key={
              item.salesOrderDetailId ||
              item.returnOrderDetailId ||
              `${item.productName}-${index}`
            }
          >
            <td className="sod-col-idx">{index + 1}</td>
            <td>
              {item.productName ?? ""}
              {item.productCode ? ` (${item.productCode})` : ""}
            </td>
            <td>{item.unitName ?? "N/A"}</td>
            <td className="sod-num">
              {returnItems
                ? item.quantity
                : (item.quantityPurchased ?? item.quantity ?? 0)}
            </td>
            {!returnItems && (
              <td className="sod-num">{item.quantityReturned ?? 0}</td>
            )}
            <td className="sod-num">{formatCurrency(item.unitPrice)}</td>
            <td className="sod-num sod-strong">
              {formatCurrency(item.lineTotal ?? item.lineRefund)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TotalRow = ({ label, value, grand = false }) => (
  <div className={`sod-total-row${grand ? " sod-total-row--grand" : ""}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default function OrderDetailModal({ show, onHide, orderId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show || !orderId) return undefined;
    let alive = true;
    setLoading(true);
    setError("");
    getSalesOrderDetail(orderId)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setError("Không thể tải chi tiết đơn hàng.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [show, orderId]);

  if (!show) return null;
  const returnOrders = data?.returnOrders ?? [];
  const exchangeOrders = data?.exchangeOrders ?? [];
  return (
    <div className="sod-overlay" onClick={onHide}>
      <div className="sod-modal" onClick={(event) => event.stopPropagation()}>
        <div className="sod-header">
          <div className="sod-header-title">
            <span className="sod-header-icon">
              <FileText size={20} />
            </span>
            <div>
              <div className="sod-title">
                Chi tiết đơn hàng{" "}
                <span className="sod-code">
                  {data?.orderCode ?? `#${orderId}`}
                </span>
              </div>
              <div className="sod-subtitle">
                {formatDateTime(data?.createdAt)}
              </div>
            </div>
          </div>
          <button className="sod-close-btn" onClick={onHide} title="Đóng">
            <X size={20} />
          </button>
        </div>
        <div className="sod-body">
          {loading && <div className="sod-state">Đang tải...</div>}
          {!loading && error && (
            <div className="sod-state sod-state--error">{error}</div>
          )}
          {!loading && !error && data && (
            <>
              <dl className="sod-meta">
                <div>
                  <dt>Khách hàng</dt>
                  <dd>{data.customer?.fullName ?? "Khách lẻ"}</dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{data.customer?.phoneNumber ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Thanh toán</dt>
                  <dd>
                    {data.isDebt
                      ? PAYMENT_LABELS.DEBT
                      : (PAYMENT_LABELS[data.paymentMethod] ??
                        data.paymentMethod ??
                        "N/A")}
                  </dd>
                </div>
                <div></div>
              </dl>
              <div className="sod-group-title">Sản phẩm đã mua</div>
              <ItemTable items={data.items} />
              {(returnOrders.length > 0 || exchangeOrders.length > 0) && (
                <div className="sod-related">
                  <div className="sod-totals">
                    <TotalRow
                      label="Tổng tiền"
                      value={formatCurrency(data.totalAmount)}
                      grand
                    />
                  </div>

                  <div className="sod-group-title">
                    Chứng từ đổi/trả (
                    {returnOrders.length + exchangeOrders.length})
                  </div>
                  {returnOrders.map((returnOrder, index) => (
                    <div
                      key={returnOrder.returnOrderId || index}
                      className="sod-related-doc"
                    >
                      <div className="sod-related-head">
                        <span className="sod-related-kind">Phiếu trả</span>
                        <span className="sod-code">
                          {returnOrder.returnCode ??
                            `#${returnOrder.returnOrderId}`}
                        </span>
                        <span className="sod-related-time">
                          {formatDateTime(returnOrder.createdAt)}
                        </span>
                        <span className="sod-related-amount">
                          {formatCurrency(returnOrder.refundAmount)}
                        </span>
                      </div>
                      <ItemTable items={returnOrder.items} returnItems />
                    </div>
                  ))}
                  {exchangeOrders.map((exchangeOrder, index) => (
                    <div
                      key={exchangeOrder.exchangeOrderId || index}
                      className="sod-related-doc"
                    >
                      <div className="sod-related-head">
                        <span className="sod-related-kind">Đơn đổi</span>
                        <span className="sod-code">
                          {exchangeOrder.exchangeCode ??
                            `#${exchangeOrder.exchangeOrderId}`}
                        </span>
                        <span className="sod-related-time">
                          {formatDateTime(exchangeOrder.createdAt)}
                        </span>
                        <span className="sod-related-amount">
                          {formatCurrency(exchangeOrder.totalAmount)}
                        </span>
                      </div>
                      <ItemTable items={exchangeOrder.items} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="sod-footer">
          <button className="sod-btn" onClick={onHide}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
