import { useState, useEffect, useCallback } from "react";
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
  Accordion,
  Spinner,
  Dropdown,
} from "react-bootstrap";
import {
  FiDollarSign,
  FiCheckCircle,
  FiPlus,
  FiFilter,
  FiChevronDown,
  FiUsers,
} from "react-icons/fi";
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
  const { allowDebt, debtStatus, isOverdue } = customer;

  if (debtStatus === 'NO_DEBT') {
    return allowDebt
      ? { className: 'priority-5', tooltip: 'Khách hàng được phép nợ, hiện không có nợ' }
      : { className: 'priority-6', tooltip: 'Khách hàng không được phép nợ, hiện không có nợ' };
  }

  // Customers with debt
  if (isOverdue) {
    return allowDebt
      ? { className: 'priority-1', tooltip: 'Nợ quá hạn - Cần xử lý ngay' }
      : { className: 'priority-3', tooltip: 'Nghiêm trọng: Nợ quá hạn và không được phép nợ' };
  } else {
    return allowDebt
      ? { className: 'priority-2', tooltip: 'Đang nợ trong hạn' }
      : { className: 'priority-4', tooltip: 'Cảnh báo: Đang nợ dù không được phép' };
  }

  // Mặc định
  return { className: 'priority-6', tooltip: '' };
};


export default function CustomerDebtPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [debtCustomers, setDebtCustomers] = useState({
    content: [],
    totalPages: 1,
    page: 1,
    totalElements: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeAccordionKey, setActiveAccordionKey] = useState(["debt"]); // 'debt' or 'no-debt'

  const [noDebtCustomers, setNoDebtCustomers] = useState({
    content: [],
    totalPages: 1,
    page: 1,
    totalElements: 0,
  });
  const [isLoadingDebt, setIsLoadingDebt] = useState(true);
  const [isLoadingNoDebt, setIsLoadingNoDebt] = useState(true);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  // State for filters
  const [globalFilters, setGlobalFilters] = useState({
    size: 20,
    keyword: "",
    fromDate: null,
    toDate: null,
  });

  const [debtFilters, setDebtFilters] = useState({
    isOverdue: null,
    allowDebt: null,
  });

  const [noDebtFilters, setNoDebtFilters] = useState({
    allowDebt: null,
  });

  // Debouncing for search keyword
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setGlobalFilters((prev) => ({ ...prev, keyword: searchTerm }));
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchDebtData = useCallback(async (page = 1) => {
    setIsLoadingDebt(true);
    const params = { ...globalFilters, ...debtFilters, status: 'IN_DEBT', page, sortBy: 'priority' };
    Object.keys(params).forEach(key => (params[key] === null || params[key] === '') && delete params[key]);
    try {
      const res = await getCustomerDebts(params);
      setDebtCustomers(res);
    } catch (error) {
      console.error("Failed to fetch debt customers:", error);
    } finally {
      setIsLoadingDebt(false);
      setIsLoading(false);
    }
  }, [globalFilters, debtFilters]);

  const fetchNoDebtData = useCallback(async (page = 1) => {
    setIsLoadingNoDebt(true);
    const params = { ...globalFilters, ...noDebtFilters, status: 'NO_DEBT', page, sortBy: 'priority' };
    Object.keys(params).forEach(key => (params[key] === null || params[key] === '') && delete params[key]);
    try {
      const res = await getCustomerDebts(params);
      setNoDebtCustomers(res);
    } catch (error) {
      console.error("Failed to fetch no-debt customers:", error);
    } finally {
      setIsLoadingNoDebt(false);
      setIsLoading(false);
    }
  }, [globalFilters, noDebtFilters]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const overviewRes = await getOverviewCustomer();
        setOverview(overviewRes);
      } catch (error) {
        console.error("Failed to fetch overview:", error);
      }
    };
    fetchOverview();
    // Initial fetch for both lists
    fetchDebtData();
    fetchNoDebtData();
  }, []);

  // When global filters (search, date) change, refetch both lists.
  useEffect(() => {
    fetchDebtData(1);
    fetchNoDebtData(1);
  }, [globalFilters]);

  // When local filters change, only refetch the corresponding list.
  useEffect(() => {
    fetchDebtData(1);
  }, [debtFilters]);
  useEffect(() => {
    fetchNoDebtData(1);
  }, [noDebtFilters]);

  const handleCreationSuccess = (newCustomer) => {
    setShowCreateModal(false);
    fetchDebtData(1); // Refetch debt customers
    fetchNoDebtData(1); // Also refetch no-debt customers in case the new customer has no debt
    // Ensure the debt accordion is open to see the new customer if they have debt
    setActiveAccordionKey(['debt']);

    setToastMessage(`Đã tạo thành công khách hàng: ${newCustomer.fullName}`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleDateFilterChange = (value) => {
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    let fromDate = null;
    let toDate = null;

    if (value === 'custom') {
      setShowCustomDateRange(true);
      return; // Don't set filters yet, wait for user input
    }
    setShowCustomDateRange(false);
    switch (value) {
      case "today":
        fromDate = formatDate(today);
        toDate = formatDate(today);
        break;
      case "7days": {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // Bao gồm cả ngày hôm nay
        fromDate = formatDate(sevenDaysAgo);
        toDate = formatDate(today);
        break;
      }
      case "30days": {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 29); // Bao gồm cả ngày hôm nay
        fromDate = formatDate(thirtyDaysAgo);
        toDate = formatDate(today);
        break;
      }
      default: // "all"
        break;
    }

    setGlobalFilters((prev) => ({ ...prev, fromDate, toDate }));
  };

  const handleCustomDateChange = (field, value) => {
    setGlobalFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleDebtFilterChange = (key) => {
    const newFilters = { isOverdue: null, allowDebt: null };
    if (key === 'overdue') newFilters.isOverdue = true;
    if (key === 'not_overdue') newFilters.isOverdue = false;
    if (key === 'not_allowed') newFilters.allowDebt = false;
    setDebtFilters(newFilters);
  };

  const handleNoDebtFilterChange = (key) => {
    const newFilters = { allowDebt: null };
    if (key === 'allowed') { newFilters.allowDebt = true; }
    if (key === 'not_allowed') { newFilters.allowDebt = false; }
    setNoDebtFilters(newFilters);
  };

  const getActiveFilterLabel = (filters, type) => {
    if (type === 'debt') {
      if (filters.isOverdue === true) return 'Nợ quá hạn';
      if (filters.isOverdue === false) return 'Đang trong hạn nợ';
      if (filters.allowDebt === false) return 'Không được phép nợ';
      return 'Tất cả đang nợ';
    }
    if (type === 'no-debt') {
      if (filters.allowDebt === true) return 'Được phép nợ';
      if (filters.allowDebt === false) return 'Không được phép nợ';
      return 'Tất cả không nợ';
    }
  };

  const renderTable = (data, loading, onPageChange, currentPage) => (
    <div className="table-responsive">
      <Table hover responsive className="customer-debt-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Khách hàng</th>
            <th>Điện thoại</th>
            <th>Tổng nợ hiện tại</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="5" className="text-center py-5"><Spinner animation="border" size="sm" /> Đang tải...</td></tr>
          ) : data.content.length === 0 ? (
            <tr><td colSpan="5" className="text-center py-5 text-muted">Không tìm thấy dữ liệu.</td></tr>
          ) : (
            data.content.map((item, index) => {
              const priority = getPriorityInfo(item);
              const highlightClasses = [];
              if (item.isOverdue) {
                highlightClasses.push('customer-row--overdue');
              } else if (item.debtStatus === 'IN_DEBT') {
                highlightClasses.push('customer-row--in-debt');
              }

              const overdueAllowedClass = item.isOverdue && item.allowDebt ? 'overdue-allowed-field' : '';
              const notAllowedFieldClass = !item.allowDebt ? 'not-allowed-field' : '';

              return (
                <tr key={item.id} className={`${priority.className} customer-row ${highlightClasses.join(' ')}`} title={priority.tooltip} onClick={() => navigate(`/admin/customer/${item.id}`)}>
                  <td>{(currentPage - 1) * globalFilters.size + index + 1}</td>
                  <td className={`fw-medium ${notAllowedFieldClass} ${overdueAllowedClass}`}>{item.fullName}</td>
                  <td className={`${notAllowedFieldClass} ${overdueAllowedClass}`}>{item.phoneNumber || '-'}</td>
                  <td className="fw-medium">
                    {formatCurrency(item.totalDebt)}
                    {item.totalDebt > 0 && item.totalOrdersInDebt > 0 && (
                      <span className="text-muted ms-1">({item.totalOrdersInDebt} đơn)</span>
                    )}
                  </td>
                  <td>
                    {getStatusBadge(item.debtStatus)}
                    {item.totalOverdueOrders > 0 && (
                      <span className="text-muted ms-1">({item.totalOverdueOrders} đơn)</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>
      {!loading && data.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">Hiển thị {data.content.length} / {data.totalElements} kết quả</small>
          <Pagination className="mb-0">
            <Pagination.Prev onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} />
            {[...Array(Math.min(data.totalPages, 5)).keys()].map(i => {
              const pageNum = currentPage > 3 ? currentPage - 2 + i : i + 1;
              if (pageNum > data.totalPages) return null;
              return <Pagination.Item key={pageNum} active={pageNum === currentPage} onClick={() => onPageChange(pageNum)}>{pageNum}</Pagination.Item>;
            })}
            <Pagination.Next onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === data.totalPages} />
          </Pagination>
        </div>
      )}
    </div>
  );

  return (
    <div className="d-flex vh-100">
      <SideBar />
      <div className="flex-grow-1 d-flex flex-column">
        <Header />
        <main className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>
          {toastMessage && <div className="customer-page__toast">{toastMessage}</div>}
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
                className="d-flex align-items-center gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <FiPlus /> Tạo khách hàng
              </Button>
            </div>
          </div>

          {/* Statistic Cards */}
          <Row className="mb-4">
            <Col >
              <Card className="shadow-sm border-0 h-100">
                <Card.Body>
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon bg-primary-soft"><FiDollarSign className="text-primary" size={24} /></div>
                    <div>
                      <small className="text-muted">TỔNG NỢ PHẢI THU</small>
                      <h3 className="fw-bold text-primary mb-0 mt-1">
                        {formatCurrency(overview?.totalDebt)}
                      </h3>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col >
              <Card className="shadow-sm border-0 h-100 d-none d-md-block">
                <Card.Body>
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon bg-success-soft"><FiCheckCircle className="text-success" size={24} /></div>
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

          {/* Filter & Search Area */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <Row className="g-3 align-items-end">
                <Col md={5} lg={4}>
                  <Form.Label>Tìm kiếm</Form.Label>
                  <Form.Control
                    placeholder="Tên hoặc SĐT khách hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Col>
                <Col md={4} lg={3}>
                  <Form.Label>Lọc theo thời gian</Form.Label>
                  <Form.Select onChange={(e) => handleDateFilterChange(e.target.value)} defaultValue="">
                    <option value="">Tất cả thời gian</option>
                    <option value="today">Hôm nay</option>
                    <option value="7days">7 ngày qua</option>
                    <option value="30days">30 ngày qua</option>
                    <option value="custom">Tùy chỉnh...</option>
                  </Form.Select>
                </Col>
                {showCustomDateRange && (
                  <>
                    <Col md={3} lg={2}>
                      <Form.Label>Từ ngày</Form.Label>
                      <Form.Control type="date" value={globalFilters.fromDate || ''} onChange={(e) => handleCustomDateChange('fromDate', e.target.value)} />
                    </Col>
                    <Col md={3} lg={2}>
                      <Form.Label>Đến ngày</Form.Label>
                      <Form.Control type="date" value={globalFilters.toDate || ''} onChange={(e) => handleCustomDateChange('toDate', e.target.value)} />
                    </Col>
                  </>
                )}
              </Row>
            </Card.Body>
          </Card>

          <Accordion activeKey={activeAccordionKey} onSelect={(k) => setActiveAccordionKey(k)} alwaysOpen>
            <Accordion.Item eventKey="debt">
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 pe-2">
                  <span className="fw-bold">Khách hàng đang nợ ({debtCustomers.totalElements})</span>
                  <Dropdown onClick={(e) => e.stopPropagation()} onSelect={handleDebtFilterChange}>
                    <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-debt-filter">
                      {getActiveFilterLabel(debtFilters, 'debt')}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item eventKey="all">Tất cả đang nợ</Dropdown.Item>
                      <Dropdown.Item eventKey="overdue">Nợ quá hạn</Dropdown.Item>
                      <Dropdown.Item eventKey="not_overdue">Đang trong hạn nợ</Dropdown.Item>
                      <Dropdown.Item eventKey="not_allowed">Không được phép nợ</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                {renderTable(debtCustomers, isLoadingDebt, fetchDebtData, debtCustomers.page)}
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="no-debt">
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 pe-2">
                  <span className="fw-bold">Khách hàng không nợ ({noDebtCustomers.totalElements})</span>
                  <Dropdown onClick={(e) => e.stopPropagation()} onSelect={handleNoDebtFilterChange}>
                    <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-no-debt-filter">
                      {getActiveFilterLabel(noDebtFilters, 'no-debt')}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item eventKey="all">Tất cả không nợ</Dropdown.Item>
                      <Dropdown.Item eventKey="allowed">Được phép nợ</Dropdown.Item>
                      <Dropdown.Item eventKey="not_allowed">Không được phép nợ</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                {renderTable(noDebtCustomers, isLoadingNoDebt, fetchNoDebtData, noDebtCustomers.page)}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
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
