import { useState, useEffect } from "react";
import { Modal, Table, Spinner, Alert, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { getTodayDebtSummary, updateCustomerUnstableDebtStatus } from "../api";

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
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState([]);

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
      setExpandedGroups([]); // Reset khi mở lại modal
    }
  }, [show]);

  const handleOrderClick = (customerId, orderId) => {
    if (!customerId || !orderId) return;
    // Điều hướng đến trang chi tiết khách hàng và truyền ID đơn hàng cần mở qua URL
    navigate(`/admin/customer/${customerId}?openOrder=${orderId}`);
    onHide();
  };

  const handleCustomerClick = (customerId) => {
    if (!customerId) return;
    navigate(`/admin/customer/${customerId}`);
    onHide();
  }

  const toggleGroup = (customerId) => {
    setExpandedGroups(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  }

  const handleProcessUnstableDebt = async (customerId) => {
    try {
      const response = await updateCustomerUnstableDebtStatus(customerId, { isCheckUnstableDebt: false });
      if (response.code === 1000) {
        // Cập nhật lại trạng thái của khách hàng trong danh sách để UI thay đổi ngay lập tức
        setData(prevData =>
          prevData.map(group =>
            group.customerId === customerId
              ? { ...group, isCheckDebtUnstable: false }
              : group
          )
        );
      }
    } catch (err) {
      console.error("Failed to update unstable debt status:", err);
      alert("Đã có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  const renderContent = () => {
    if (error) {
      return <Alert variant="danger">{error}</Alert>;
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
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="text-center p-5">
                <Spinner animation="border" />
              </td>
            </tr>
          ) : !data || data.length === 0 ? (
            <tr>
              <td colSpan="9" className="text-center text-muted p-4">
                Không có đơn ghi nợ nào phát sinh trong hôm nay.
              </td>
            </tr>
          ) : (() => {
            let globalIndex = 0;
            return data.map((customerGroup) => {
              const isExpanded = expandedGroups.includes(customerGroup.customerId);
              const hasMultipleItems = customerGroup.debtSalesDetails.length > 1;
              const itemsToShow = isExpanded ? customerGroup.debtSalesDetails : customerGroup.debtSalesDetails.slice(0, 1);

              const rows = itemsToShow.map((item, itemIndex) => {
                globalIndex++;
                const isFirstItemInGroup = itemIndex === 0;
                return (
                  <tr
                    key={item.id}
                    className={customerGroup.isCheckDebtUnstable ? "debt-unstable-row" : ""}
                  >
                    <td>{globalIndex}</td>
                    <td className="text-primary fw-medium" style={{ cursor: "pointer" }} onClick={() => handleOrderClick(customerGroup.customerId, item.id)} title={`Xem chi tiết đơn ${item.orderCode}`}>
                      {item.orderCode}
                    </td>
                    {isFirstItemInGroup && <td style={{ verticalAlign: 'top', cursor: 'pointer' }} rowSpan={itemsToShow.length} onClick={() => handleCustomerClick(customerGroup.customerId)} title={`Xem chi tiết khách hàng ${customerGroup.customerName}`}>
                      {customerGroup.customerName}
                    </td>}
                    <td className="text-end fw-bold">{formatCurrency(item.totalAmount)}</td>
                    <td className="text-end fw-bold text-success">{formatCurrency(item.amountPaid)}</td>
                    <td className="text-end fw-bold text-danger">{formatCurrency(item.amountRemaining)}</td>
                    <td>{formatDate(item.orderDate)}</td>
                    <td>{item.createdBy}</td>
                    {isFirstItemInGroup && (
                      <td style={{ verticalAlign: 'top' }} rowSpan={itemsToShow.length}>
                        {customerGroup.isCheckDebtUnstable && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleProcessUnstableDebt(customerGroup.customerId)}
                          >
                            Đã xử lý
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              });

              if (hasMultipleItems) {
                rows.push(
                  <tr key={`expand-button-${customerGroup.customerId}`}>
                    <td colSpan="9" className="text-center p-1" style={{ borderTop: 'none' }}>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleGroup(customerGroup.customerId)}
                        className="d-flex align-items-center justify-content-center w-100"
                      >
                        {isExpanded ? (
                          <><FiChevronUp className="me-1" /> Thu gọn</>
                        ) : (
                          <><FiChevronDown className="me-1" /> Xem thêm {customerGroup.debtSalesDetails.length - 1} đơn hàng khác</>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              }

              return rows;
            });
          })()}
        </tbody>
      </Table>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Các đơn ghi nợ phát sinh hôm nay</Modal.Title>
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
