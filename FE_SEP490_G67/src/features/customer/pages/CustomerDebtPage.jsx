import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Table,
  Badge,
  Pagination,
} from "react-bootstrap";
import {
  BsBank,
  BsPeople,
  BsCheckCircle,
  BsEye,
  BsArrowCounterclockwise,
  BsFileEarmarkArrowDown,
  BsPlus,
} from "react-icons/bs";
import SideBar from "../../../components/ui/sidebar/SideBar";
import Header from "../../../components/ui/header-footer/Header";
import { getOverviewCustomer, getCustomerDebts } from "../api";
import CreateCustomerDebtModal from "../components/CreateCustomerDebtModal";

const formatCurrency = (value) => {
  if (!value) return "0đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const getStatusBadge = (status) => {
  switch (status) {
    case "IN_DEBT":
      return <Badge bg="warning">Đang nợ</Badge>;

    case "NO_DEBT":
      return <Badge bg="primary">Không nợ</Badge>;

    case "NOT_ALLOW_DEBT":
      return <Badge bg="danger">Không cho nợ</Badge>;

    default:
      return <Badge bg="secondary">{status || "Không rõ"}</Badge>;
  }
};

export default function CustomerDebtPage() {
  const [overview, setOverview] = useState(null);
  const [debtData, setDebtData] = useState({
    content: [],
    totalPages: 1,
    page: 1,
    totalElements: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // State for filters
  const [filters, setFilters] = useState({
    page: 1,
    size: 10,
    keyword: "",
    status: "",
  });

  // Debouncing for search keyword
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((prev) => ({ ...prev, keyword: searchTerm, page: 1 }));
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    // Chỉ fetch dữ liệu tổng quan một lần khi component được mount
    const fetchOverview = async () => {
      const overviewRes = await getOverviewCustomer();
      setOverview(overviewRes);
    };
    fetchOverview();
  }, []);

  useEffect(() => {
    // Fetch danh sách công nợ mỗi khi filters thay đổi (trang, tìm kiếm, trạng thái)
    const fetchDebts = async () => {
      setIsLoading(true);
      const debtRes = await getCustomerDebts(filters);
      setDebtData(debtRes);
      setIsLoading(false);
    };
    fetchDebts();
  }, [filters]);

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleCreationSuccess = () => {
    setShowCreateModal(false);
    // Tải lại danh sách ở trang đầu tiên để thấy khách hàng mới
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="d-flex vh-100">
      <SideBar />
      <div className="flex-grow-1 d-flex flex-column">
        <Header />
        <main className="p-4 flex-grow-1" style={{ overflowY: 'auto' }}>
          <div className="d-flex justify-content-between align-items-center mb-4 sticky-top bg-white py-2" style={{ top: -16, zIndex: 1 }}>
            <div>
              <h2 className="fw-bold mb-1">Công nợ khách hàng</h2>
              <p className="text-muted mb-0">
                Theo dõi và quản lý các khoản nợ phải thu từ khách hàng
              </p>
            </div>

            <div className="d-flex gap-2">
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <BsPlus className="me-2" />
                Tạo khách nợ
              </Button>
            </div>
          </div>

          {/* Statistic Cards */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <div className="d-flex align-items-center gap-3">
                    <BsBank size={30} className="text-primary" />
                    <div>
                      <small className="text-muted">TỔNG NỢ PHẢI THU</small>
                      <h3 className="fw-bold text-primary mt-2">
                        {formatCurrency(overview?.totalDebt)}
                      </h3>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <div className="d-flex align-items-center gap-3">
                    <BsPeople size={30} className="text-secondary" />
                    <div>
                      <small className="text-muted">KHÁCH HÀNG ĐANG NỢ</small>
                      <h3 className="fw-bold mt-2">
                        {overview?.debtCustomerCount || 0}
                      </h3>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <div className="d-flex align-items-center gap-3">
                    <BsCheckCircle size={30} className="text-success" />
                    <div>
                      <small className="text-muted">ĐÃ THU HÔM NAY</small>
                      <h3 className="fw-bold text-success mt-2">
                        {formatCurrency(overview?.todayCollectedAmount)}
                      </h3>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Table Area */}
          <Card className="shadow-sm border-0">
            <Card.Body>
              {/* Filter */}
              <Row className="mb-4">
                <Col md={6}>
                  <Form.Control
                    placeholder="Tìm kiếm tên hoặc số điện thoại khách hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Col>

                <Col md={3}>
                  <Form.Select>
                    <option value="">Tất cả thời gian</option>
                    <option>Hôm nay</option>
                    <option>7 ngày qua</option>
                    <option>30 ngày qua</option>
                  </Form.Select>
                </Col>

                <Col md={3}>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: e.target.value,
                        page: 1,
                      }))
                    }
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="IN_DEBT">Đang nợ</option>
                    <option value="NO_DEBT">Không nợ</option>
                    <option value="NOT_ALLOW_DEBT">Không cho nợ</option>
                  </Form.Select>
                </Col>
              </Row>

              {/* Table */}
              <Table hover responsive>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Khách hàng</th>
                    <th>Điện thoại</th>
                    <th>Tổng nợ hiện tại</th>
                    <th>Trạng thái</th>
                    <th className="text-center">Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : debtData.content.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        Không tìm thấy dữ liệu phù hợp.
                      </td>
                    </tr>
                  ) : (
                    debtData.content.map((item, index) => (
                      <tr key={item.id}>
                        <td>{(filters.page - 1) * filters.size + index + 1}</td>
                        <td>{item.fullName}</td>
                        <td>{item.phoneNumber}</td>
                        <td>{formatCurrency(item.totalDebt)}</td>
                        <td>{getStatusBadge(item.debtStatus)}</td>

                        <td>
                          <div className="d-flex justify-content-center gap-3">
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-primary"
                            >
                              <BsArrowCounterclockwise />
                            </Button>

                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-success"
                            >
                              <BsEye />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>

              {/* Footer */}
              <div className="d-flex justify-content-between align-items-center mt-4">
                <small className="text-muted">
                  Hiển thị {debtData.content.length} trong tổng số{" "}
                  {debtData.totalElements} khách hàng nợ
                </small>

                <Pagination className="mb-0">
                  <Pagination.Prev
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page === 1}
                  />
                  {[...Array(debtData.totalPages).keys()].map((number) => (
                    <Pagination.Item
                      key={number + 1}
                      active={number + 1 === debtData.page}
                      onClick={() => handlePageChange(number + 1)}
                    >
                      {number + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={
                      filters.page === debtData.totalPages ||
                      debtData.totalPages === 0
                    }
                  />
                </Pagination>
              </div>
            </Card.Body>
          </Card>
        </main>

        <CreateCustomerDebtModal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          onSuccess={handleCreationSuccess}
        />
      </div>
    </div>
  );
}
