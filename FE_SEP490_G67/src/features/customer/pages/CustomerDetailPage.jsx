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
  Tab,  
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
import { getCustomerDetail } from "../api";
import SideBar from "../../../components/ui/sidebar/SideBar";
import Header from "../../../components/ui/header-footer/Header";
import CustomerDebtInvoices from "../components/CustomerDebtInvoices";

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  if (isLoading) {
    // Render loading state within the layout
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
          <div>
            <Breadcrumb listProps={{ className: "mb-0" }}>
              <Breadcrumb.Item
                onClick={() => navigate("/admin/customer")}
                style={{ cursor: "pointer" }}
              >
                Khách hàng
              </Breadcrumb.Item>

              <Breadcrumb.Item active>{customer.fullName}</Breadcrumb.Item>
            </Breadcrumb>
          </div>

          <Button
            variant="primary"
            className="px-4 d-flex align-items-center gap-2"
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
                  <h3 className="fw-bold mb-0">{customer.fullName}</h3>
                  <Button variant="link" className="text-decoration-none ms-3 p-0">
                    <FiEdit2 className="me-1" />
                    Chỉnh sửa
                  </Button>
                </div>

                <Row className="align-items-center gy-3">
                  <Col lg={5}>
                    <div className="d-flex align-items-center">
                      <FiPhone className="text-secondary me-2" />
                      {customer.phoneNumber}
                    </div>
                  </Col>

                  <Col lg={7}>
                    <div className="d-flex">
                      <FiMapPin className="text-secondary me-2 mt-1" />
                      <span>{customer.address || "Chưa có địa chỉ"}</span>
                    </div>
                  </Col>

                  <Col lg={5} className="mt-4">
                    <Badge bg="danger" className="px-3 py-2">
                      {customer.debtStatus || "N/A"}
                    </Badge>
                  </Col>

                  <Col lg={7} className="d-flex justify-content-lg-start align-items-center mt-4">
                    <span className="me-2 text-muted">Cho phép nợ</span>
                    <Form.Check type="switch" checked={customer.allowDebt} readOnly />
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
                    <p className="mb-0" style={{ fontSize: '14px' }}>
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
            <Tabs defaultActiveKey="invoice" className="px-4 pt-3">
              {/* ================= HÓA ĐƠN ================= */}

              <Tab
                eventKey="invoice"
                title={
                  <>
                    <FiFileText className="me-2" />
                    Hóa đơn nợ
                  </>
                }
              >
                <CustomerDebtInvoices customerId={customerId} />
              </Tab>

              {/* ================= LỊCH SỬ THU NỢ ================= */}

              <Tab
                eventKey="history"
                title={
                  <>
                    <FiRotateCcw className="me-2" />
                    Lịch sử thu nợ
                  </>
                }
              >
                {/* <div className="p-4">
                  <Table hover responsive>
                    <thead>
                      <tr>
                        <th>Ngày thu</th>

                        <th>Mã phiếu</th>

                        <th>Người thu</th>

                        <th className="text-end">Số tiền</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td>20/10/2023</td>

                        <td>PT0012</td>

                        <td>Nguyễn Văn A</td>

                        <td className="text-end text-success fw-bold">
                          100.000đ
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </div> */}
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>
    );
  }

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
