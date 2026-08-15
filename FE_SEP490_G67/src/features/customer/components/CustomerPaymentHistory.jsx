import { useState, useEffect } from "react";
import { Table, Pagination, Spinner, Row } from "react-bootstrap";
import { getDebtPaymentHistory } from "../api";

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const translatePaymentMethod = (method) => {
  switch (method) {
    case "CASH":
      return "Tiền mặt";
    case "BANK":
      return "Chuyển khoản";
    case "RETURN_OFFSET":
      return "Đổi trả hàng";
    default:
      return method || "N/A";
  }
};

export default function CustomerPaymentHistory({ customerId, refreshKey }) {
  const [historyData, setHistoryData] = useState({
    content: [],
    totalPages: 1,
    page: 1,
    totalElements: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    size: 10,
    customerId: customerId,
  });

  useEffect(() => {
    const fetchHistory = async () => {
      if (!customerId) return;
      setIsLoading(true);
      try {
        const data = await getDebtPaymentHistory(filters);
        setHistoryData(data);
      } catch (error) {
        console.error("Failed to fetch payment history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [customerId, filters, refreshKey]);

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      <Table hover responsive className="align-middle customer-detail-table">
        <thead>
          <tr>
            <th>Ngày thu</th>
            <th>Mã phiếu thu</th>
            <th>Hóa đơn liên quan</th>
            <th>Số tiền</th>
            <th>
              Phương thức
              <br />
              thanh toán
            </th>
            <th>Người thu</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="7" className="text-center py-5">
                <Spinner animation="border" size="sm" /> Đang tải...
              </td>
            </tr>
          ) : historyData.content.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-5 text-muted">
                Chưa có lịch sử thu nợ nào.
              </td>
            </tr>
          ) : (
            historyData.content.map((item) => (
              <tr key={item.id}>
                <td>{formatDateTime(item.paymentDate)}</td>
                <td>{item.paymentCode}</td>
                <td>
                  {item.orderCode}
                </td>
                <td className="text-success fw-bold">
                  {formatCurrency(item.amountPaid)}
                </td>
                <td>{translatePaymentMethod(item.paymentMethod)}</td>
                <td>{item.staffName}</td>
                <td>{item.note || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {historyData.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted">
            Hiển thị {historyData.content.length} / {historyData.totalElements}{" "}
            mục
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page === 1}
            />
            {[...Array(historyData.totalPages).keys()].map((number) => (
              <Pagination.Item
                key={number + 1}
                active={number + 1 === historyData.page}
                onClick={() => handlePageChange(number + 1)}
              >
                {number + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page === historyData.totalPages}
            />
          </Pagination>
        </div>
      )}
    </>
  );
}
