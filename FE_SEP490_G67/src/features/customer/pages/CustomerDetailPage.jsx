import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Form,
  Breadcrumb,
  Tabs,
  Spinner,
} from "react-bootstrap";

import {
  FiPlus,
  FiEdit2,
  FiPhone,
  FiMapPin,
  FiDollarSign,
  FiFileText,
  FiRotateCcw,
} from "react-icons/fi";
import { getCustomerDetail, updateCustomer } from "../api";
import SideBar from "../../../components/ui/sidebar/SideBar";
import Header from "../../../components/ui/header-footer/Header";
import CustomerDebtInvoices from "../components/CustomerDebtInvoices";
import EditCustomerModal from "../components/EditCustomerModal";
import CreatePaymentModal from "../components/CreatePaymentModal";
import ConfirmationModal from "../components/ConfirmationModal";
import CustomerPaymentHistory from "../components/CustomerPaymentHistory";
import "../../../css/CustomerDetail.css";

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const getStatusBadge = (status) => {
  const commonProps = { className: "px-3 py-2" };
  switch (status) {
    case "IN_DEBT":
      return (
        <Badge bg="warning" {...commonProps}>
          Đang nợ
        </Badge>
      );
    case "NO_DEBT":
      return (
        <Badge bg="primary" {...commonProps}>
          Không nợ
        </Badge>
      );
    case "OVERDUE":
      return (
        <Badge bg="danger" {...commonProps}>
          Nợ quá hạn
        </Badge>
      );
    default:
      return (
        <Badge bg="secondary" {...commonProps}>
          {status || "Không rõ"}
        </Badge>
      );
  }
};

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // For allowDebt switch
  const [confirmation, setConfirmation] = useState({
    show: false,
    message: "",
    onConfirm: () => {},
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('invoice');

  const fetchCustomer = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerDetail(customerId);
      setCustomer(data);
      setError(null);
    } catch (err) {
      setError("Không thể tải dữ liệu khách hàng. Vui lòng thử lại.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId, refreshKey]);

  if (isLoading) {
    // Render loading state within the layout
    // Avoid re-fetching on modal close by checking if customer data already exists
    if (!customer) {
    }
    return (
      <div className="d-flex vh-100">
        <SideBar />
        <div className="flex-grow-1 d-flex flex-column">
          <Header />
          <main className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>
            <div className="d-flex justify-content-center align-items-center h-100">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </Spinner>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleUpdateSuccess = () => {
    setShowEditModal(false);
    fetchCustomer(); // Re-fetch data to show the latest updates
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    // Trigger re-fetch for all components that depend on this key
    setRefreshKey(prev => prev + 1);
  };

  const handleAllowDebtChange = async (e) => {
    const isChecked = e.target.checked;

    const message = isChecked ? (
      <>
        Bạn có chắc chắn muốn <strong>CHO PHÉP</strong> khách hàng{" "}
        <b>"{customer.fullName}"</b> mua nợ không?
      </>
    ) : (
      <>
        Bạn có chắc chắn muốn <strong>CHẶN</strong> khách hàng{" "}
        <b>"{customer.fullName}"</b> mua nợ không?
      </>
    );

    setConfirmation({
      show: true,
      message: message,
      onConfirm: async () => {
        await performUpdateAllowDebt(isChecked);
      },
    });
  };

  const performUpdateAllowDebt = async (allow) => {
    setIsUpdating(true);
    try {
      const updateData = {
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        address: customer.address,
        note: customer.note,
        allowDebt: allow,
      };
      await updateCustomer(customerId, updateData);
      setCustomer((prev) => ({ ...prev, allowDebt: allow }));
      setConfirmation({ show: false }); // Close modal on success
    } catch (err) {
      console.error("Failed to update allowDebt status:", err);
      // Optionally show an error toast. Modal remains open for user to see.
    } finally {
      setIsUpdating(false);
    }
  };

  const renderContent = () => {
    if (error) {
      return (
        <Container fluid className="text-center">
          <p className="text-danger">{error}</p>
          <Button variant="primary" onClick={() => navigate("/admin/customer")}>
            Quay lại danh sách
          </Button>
        </Container>
      );
    }

    if (!customer) {
      return (
        <Container fluid className="text-center">
          <p>Không tìm thấy thông tin khách hàng.</p>
          <Button variant="primary" onClick={() => navigate("/admin/customer")}>
            Quay lại danh sách
          </Button>
        </Container>
      );
    }

    return (
      <Container fluid>
        {/* ================= HEADER ================= */}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="breadcrumb-wrapper">
            <nav aria-label="breadcrumb" className="custom-breadcrumb">
              <span
                className="custom-breadcrumb__link"
                onClick={() => navigate("/admin/customer")}
              >
                Khách hàng
              </span>

              <span className="custom-breadcrumb__sep">&gt;</span>

              <span className="custom-breadcrumb__current">
                Chi tiết khách hàng
              </span>
            </nav>
          </div>

          <Button
            variant="primary"
            className="px-4 d-flex align-items-center gap-2"
            onClick={() => setShowPaymentModal(true)}
          >
            <FiPlus />
            Tạo phiếu thu nợ
          </Button>
        </div>

        {/* ================= CUSTOMER CARD ================= */}

        <Card className="border-0 shadow-sm rounded-4 mb-4">
          <Card.Body className="p-4">
            <Row>
              {/* Left Column: Customer Info */}
              <Col md={7} className="border-end-md">
                <div className="d-flex align-items-center mb-4">
                  <h3 className="fw-bold mb-0 me-3">{customer.fullName}</h3>
                  <Button
                    variant="link"
                    className="text-decoration-none p-0"
                    onClick={() => setShowEditModal(true)}
                  >
                    <FiEdit2 className="me-1" />
                    Chỉnh sửa
                  </Button>
                </div>

                <Row className="align-items-center gy-3">
                  <Col lg={5}>
                    <div className="d-flex align-items-center">
                      <FiPhone className="text-secondary me-2" />
                      {customer.phoneNumber || "Chưa có SĐT"}
                    </div>
                  </Col>

                  <Col lg={7}>
                    <div className="d-flex">
                      <FiMapPin className="text-secondary me-2 mt-1" />
                      <span>{customer.address || "Chưa có địa chỉ"}</span>
                    </div>
                  </Col>

                  <Col lg={5} className="mt-4">
                    {getStatusBadge(customer.debtStatus)}
                  </Col>

                  <Col
                    lg={7}
                    className="d-flex justify-content-lg-start align-items-center mt-4"
                  >
                    <span className="me-2 text-muted">Cho phép nợ</span>
                    <Form.Check
                      type="switch"
                      checked={customer.allowDebt}
                      onChange={handleAllowDebtChange}
                      disabled={isUpdating}
                    />
                  </Col>
                </Row>
              </Col>

              {/* Right Column: Note */}
              <Col md={5} className="ps-md-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Ghi chú</h5>
                </div>
                <Card className="bg-light border-0">
                  <Card.Body>
                    <p className="mb-0" style={{ fontSize: "14px" }}>
                      {customer.note || "Không có ghi chú."}
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ================= SUMMARY ================= */}

        <Row className="mb-4">
          <Col md={6}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-muted mb-2">Nợ hiện tại</div>

                    <h2 className="text-danger fw-bold">
                      {formatCurrency(customer.totalDebt)}
                    </h2>
                  </div>

                  <div
                    className="rounded-circle bg-danger bg-opacity-10
                                    d-flex align-items-center justify-content-center"
                    style={{
                      width: 60,
                      height: 60,
                    }}
                  >
                    <FiDollarSign size={28} className="text-danger" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-muted mb-2">Tổng đơn đang nợ</div>

                    <h2 className="text-primary fw-bold">
                      {/* TODO: Cần API trả về số hóa đơn nợ */}
                      {customer.totalOrdersInDebt || 0}
                    </h2>
                  </div>

                  <div
                    className="rounded-circle bg-primary bg-opacity-10
                                    d-flex align-items-center justify-content-center"
                    style={{
                      width: 60,
                      height: 60,
                    }}
                  >
                    <FiFileText size={28} className="text-primary" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ===================== TABS ===================== */}

        <Card className="border-0 shadow-sm rounded-4">
          <Card.Body className="p-0">
            <div className="customer-detail-tabs">
              <div className="customer-detail-tabs__nav" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'invoice'}
                  className={`customer-detail-tabs__btn ${activeTab === 'invoice' ? 'customer-detail-tabs__btn--active' : ''}`}
                  onClick={() => setActiveTab('invoice')}
                >
                  <FiFileText className="me-2" />
                  Hóa đơn nợ
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'history'}
                  className={`customer-detail-tabs__btn ${activeTab === 'history' ? 'customer-detail-tabs__btn--active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  <FiRotateCcw className="me-2" />
                  Lịch sử thu nợ
                </button>
              </div>

              <div className="customer-detail-tabs__panel" role="tabpanel">
                {activeTab === 'invoice' && (
                  <CustomerDebtInvoices customerId={customerId} refreshKey={refreshKey} />
                )}
                {activeTab === 'history' && (
                  <CustomerPaymentHistory customerId={customerId} refreshKey={refreshKey} />
                )}
              </div>
            </div>
          </Card.Body>
        </Card>

        <EditCustomerModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          onSuccess={handleUpdateSuccess}
          customer={customer}
        />

        <CreatePaymentModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          customer={customer}
        />

        <ConfirmationModal
          show={confirmation.show}
          onHide={() => !isUpdating && setConfirmation({ show: false })}
          onConfirm={confirmation.onConfirm}
          title="Xác nhận thay đổi"
          body={confirmation.message}
          isConfirming={isUpdating}
        />
      </Container>
    );
  };

  return (
    <div className="d-flex vh-100">
      <SideBar />
      <div className="flex-grow-1 d-flex flex-column">
        <Header />
        <main className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
