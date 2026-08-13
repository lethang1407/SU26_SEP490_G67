import { useState, useEffect } from "react";
import { Modal, Table, Spinner, Alert, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getTodayDebtSummary } from "../api";

const formatCurrency = (value) => {
  if (!value) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TodayDebtSalesModal({ show, onHide }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await getTodayDebtSummary();
          setData(result);
        } catch (err) {
          setError("Không thể tải dữ liệu. Vui lòng thử lại.");
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [show]);

  const handleRowClick = (customerId, orderId) => {
    if (!customerId || !orderId) return;
    // Điều hướng đến trang chi tiết khách hàng và truyền ID đơn hàng cần mở qua URL
    navigate(`/admin/customer/${customerId}?openOrder=${orderId}`);
    // Đóng modal sau khi điều hướng
    onHide();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" />
        </div>
      );
    }
    if (error) {
      return <Alert variant="danger">{error}</Alert>;
    }
    if (!data || !data.debtSalesDetails || data.debtSalesDetails.length === 0) {
      return (
        <p className="text-muted text-center p-4">
          Không có đơn bán nợ nào phát sinh trong hôm nay.
        </p>
      );
    }

    return (
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Mã đơn</th>
            <th>Khách hàng</th>
            <th>Giá trị đơn</th>
            <th>Đã trả</th>
            <th>Còn nợ</th>
            <th>Thời gian</th>
            <th>Người bán</th>
            {/* <th>Hành động</th> */}
          </tr>
        </thead>
        <tbody>
          {data.debtSalesDetails.map((item, index) => (
            <tr
              key={item.id}
              onClick={() => handleRowClick(item.customerId, item.id)}
              className={item.isCheckDebtUnstable ? "debt-unstable-row" : ""}
              style={{ cursor: "pointer" }}
              title={
                item.isCheckDebtUnstable
                  ? "Đơn nợ của khách hàng mới, cần kiểm tra lại"
                  : `Xem chi tiết đơn ${item.orderCode}`
              }
            >
              <td>{index + 1}</td>
              <td className="text-primary fw-medium">{item.orderCode}</td>
              <td>{item.customerName}</td>
              <td className="text-end fw-bold">
                {formatCurrency(item.totalAmount)}
              </td>
              <td className="text-end fw-bold text-success">
                {formatCurrency(item.amountPaid)}
              </td>
              <td className="text-end fw-bold text-danger">
                {formatCurrency(item.amountRemaining)}
              </td>
              <td>{formatDate(item.orderDate)}</td>
              <td>{item.createdBy}</td>
              {/* <td>-</td> */}
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Các đơn bán nợ phát sinh hôm nay</Modal.Title>
      </Modal.Header>
      <Modal.Body>{renderContent()}</Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          Đóng
        </button>
      </Modal.Footer>
    </Modal>
  );
}
