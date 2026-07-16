import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  BsPlus, BsExclamationTriangleFill, BsExclamationCircleFill, BsShieldCheck, BsSlashCircleFill
} from "react-icons/bs";
import SideBar from "../../../components/ui/sidebar/SideBar";
import Header from "../../../components/ui/header-footer/Header";
import { getOverviewCustomer, getCustomerDebts } from "../api";
import CreateCustomerDebtModal from "../components/CreateCustomerDebtModal";
import '../../../css/CustomerDebt.css'; 

const formatCurrency = (value) => {
  if (!value) return "0 đ";
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

    case "OVERDUE":
      return <Badge bg="danger">Nợ quá hạn</Badge>;

    default:
      return <Badge bg="secondary">{status || "Không rõ"}</Badge>;
  }
};

/**
 * Xác định cấp độ ưu tiên và style tương ứng cho khách hàng
 * @param {object} customer - Dữ liệu khách hàng từ API
 * @returns {{className: string, icon: JSX.Element, tooltip: string}}
 */
const getPriorityInfo = (customer) => {
  const { allowDebt, totalDebt, isOverdue } = customer;

  // Cấp 1: Nợ Quá Hạn (Được phép)
  if (allowDebt && totalDebt > 0 && isOverdue) {
    return { className: 'priority-1', icon: <BsExclamationTriangleFill />, tooltip: 'Nợ quá hạn - Cần xử lý ngay' };
  }
  // Cấp 2: Đang Nợ (Trong hạn)
  if (allowDebt && totalDebt > 0 && !isOverdue) {
    return { className: 'priority-2', icon: <BsExclamationCircleFill />, tooltip: 'Đang nợ trong hạn' };
  }
  // Cấp 3: Nợ Quá Hạn (Không được phép)
  if (!allowDebt && totalDebt > 0 && isOverdue) { // Trường hợp nghiêm trọng nhất
    return { className: 'priority-3', icon: <BsSlashCircleFill />, tooltip: 'Nghiêm trọng: Nợ quá hạn và không được phép nợ' };
  }
  // Cấp 4: Đang Nợ (Không được phép)
  if (!allowDebt && totalDebt > 0 && !isOverdue) {
    return { className: 'priority-4', icon: <BsExclamationCircleFill />, tooltip: 'Cảnh báo: Đang nợ dù không được phép' }; // Style riêng cho cấp 4
  }
  // Cấp 5: Khách hàng tốt (Không nợ)
  if (allowDebt && totalDebt === 0) {
    return { className: 'priority-5', icon: <BsShieldCheck />, tooltip: 'Khách hàng thông thường, không có nợ' };
  }
  // Cấp 6: Khách hàng thường (Không nợ)
  if (!allowDebt && totalDebt === 0) {
    return { className: 'priority-6', icon: null, tooltip: 'Khách hàng không cho phép nợ, không có nợ' };
  }

  // Mặc định
  return { className: 'priority-6', icon: null, tooltip: '' };
};


export default function CustomerDebtPage() {
  const navigate = useNavigate();
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
    sortBy: "priority",
    startDate: null,
    endDate: null,
    isOverdue: null,
    allowDebt: null,
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

  const handleDateFilterChange = (value) => {
    const today = new Date();
    const formatDate = (date) => date.toISOString().split("T")[0];
    let startDate = null;
    let endDate = null;

    switch (value) {
      case "today":
        startDate = formatDate(today);
        endDate = formatDate(today);
        break;
      case "7days": {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // Bao gồm cả ngày hôm nay
        startDate = formatDate(sevenDaysAgo);
        endDate = formatDate(today);
        break;
      }
      case "30days": {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 29); // Bao gồm cả ngày hôm nay
        startDate = formatDate(thirtyDaysAgo);
        endDate = formatDate(today);
        break;
      }
      default: // "all"
        break;
    }

    setFilters((prev) => ({ ...prev, startDate, endDate, page: 1 }));
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (value) => {
    const newFilterState = {
      status: "",
      isOverdue: null,
      allowDebt: null,
      page: 1,
    };

    if (value === "OVERDUE") {
      newFilterState.isOverdue = true;
    } else if (value === "NOT_ALLOWED_DEBT") {
      newFilterState.allowDebt = false;
    } else if (value) { // IN_DEBT, NO_DEBT
      newFilterState.status = value;
    }
    setFilters((prev) => ({ ...prev, ...newFilterState }));
  };

  return (
    <div className="d-flex vh-100">
      <SideBar />
      <div className="flex-grow-1 d-flex flex-column">
        <Header />
        <main className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
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
                  <Form.Select
                    onChange={(e) => handleDateFilterChange(e.target.value)}
                    defaultValue=""
                  >
                    <option value="">Tất cả thời gian</option>
                    <option value="today">Hôm nay</option>
                    <option value="7days">7 ngày qua</option>
                    <option value="30days">30 ngày qua</option>
                    {/* Giả định API sẽ hỗ trợ startDate và endDate */}
                    {/* Ví dụ: /api/customers/debts?startDate=2023-10-27&endDate=2023-11-26 */}
                  </Form.Select>
                </Col>

                <Col md={3}>
                  <Form.Select
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    // Không dùng value trực tiếp vì một lựa chọn có thể thay đổi nhiều state
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="IN_DEBT">Đang nợ</option>
                    <option value="NO_DEBT">Không nợ</option>
                    <option value="OVERDUE">Nợ quá hạn</option>
                    <option value="NOT_ALLOWED_DEBT">Không được phép nợ</option>
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
                    debtData.content.map((item, index) => {
                      const priority = getPriorityInfo(item);
                      // Điều kiện mới: Chỉ cần không được phép nợ là làm nổi bật
                      const isCriticalViolation = !item.allowDebt;
                      return (
                      <tr key={item.id} className={priority.className} title={priority.tooltip}>
                        <td>{(filters.page - 1) * filters.size + index + 1}</td>
                        <td className={`fw-medium ${isCriticalViolation ? 'text-highlight-critical' : ''}`}>
                          {item.fullName}
                        </td>
                        <td className={isCriticalViolation ? 'text-highlight-critical' : ''}>{item.phoneNumber}</td>
                        <td>{formatCurrency(item.totalDebt)}</td>
                        <td>{getStatusBadge(item.debtStatus)}</td>

                        <td>
                          <div className="d-flex justify-content-center gap-3">
                            {/* <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-primary"
                            >
                              <BsArrowCounterclockwise />
                            </Button> */}

                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-success"
                              onClick={() => navigate(`/admin/customer/${item.id}`)}
                            >
                              <BsEye />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
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
