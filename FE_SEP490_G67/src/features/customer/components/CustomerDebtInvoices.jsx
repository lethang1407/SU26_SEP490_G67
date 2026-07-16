import { useState, useEffect } from "react";
import {
  Row,
  Col,
  InputGroup,
  Form,
  Table,
  Badge,
  Pagination,
  Spinner,
} from "react-bootstrap";
import { FiSearch, FiClock } from "react-icons/fi";
import { getCustomerDebtOrders } from "../api";

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("vi-VN");
};

const getStatusBadge = (status) => {
  switch (status) {
    case "PAID":
      return <Badge bg="success">Đã thanh toán</Badge>;
    case "PARTIALLY_PAID":
      return <Badge bg="warning" text="dark">Thanh toán một phần</Badge>;
    case "UNPAID":
      return <Badge bg="danger">Chưa thanh toán</Badge>;
    case "OVERDUE":
        return <Badge bg="danger">Quá hạn</Badge>;
    default:
      return <Badge bg="secondary">{status}</Badge>;
  }
};

export default function CustomerDebtInvoices({ customerId }) {
  const [invoices, setInvoices] = useState({ content: [], totalPages: 1, page: 1, totalElements: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    size: 10,
    keyword: "",
  });

  // Debouncing for search keyword
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((prev) => ({ ...prev, keyword: searchTerm, page: 1 }));
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!customerId) return;
      setIsLoading(true);
      try {
        const data = await getCustomerDebtOrders(customerId, filters);
        setInvoices(data);
      } catch (error) {
        console.error("Failed to fetch debt orders:", error);
        // Optionally, set an error state to show in the UI
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [customerId, filters]);

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="p-4">
      {/* Search + Filter */}
      <Row className="mb-4">
        <Col md={5}>
          <InputGroup>
            <InputGroup.Text>
              <FiSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Tìm theo mã hóa đơn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3} className="ms-auto">
          <InputGroup>
            <InputGroup.Text>
              <FiClock />
            </InputGroup.Text>
            <Form.Select>
              <option>Tất cả</option>
              <option>7 ngày</option>
              <option>30 ngày</option>
              <option>90 ngày</option>
            </Form.Select>
          </InputGroup>
        </Col>
      </Row>

      {/* Table */}
      <Table hover responsive className="align-middle">
        <thead>
          <tr>
            <th>Ngày mua</th>
            <th>Mã hóa đơn</th>
            <th className="text-end">Tổng tiền</th>
            <th className="text-end">Đã trả</th>
            <th className="text-end">Còn nợ</th>
            <th className="text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="6" className="text-center py-5">
                <Spinner animation="border" size="sm" /> Đang tải...
              </td>
            </tr>
          ) : invoices.content.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center py-5 text-muted">
                Không có hóa đơn nợ nào.
              </td>
            </tr>
          ) : (
            invoices.content.map((invoice) => (
              <tr key={invoice.id}>
                <td>{formatDate(invoice.orderDate)}</td>
                <td><a href="#">{invoice.orderCode}</a></td>
                <td className="text-end">{formatCurrency(invoice.totalAmount)}</td>
                <td className="text-end">{formatCurrency(invoice.amountPaid)}</td>
                <td className="text-end text-danger fw-bold">{formatCurrency(invoice.amountRemaining)}</td>
                <td className="text-center">{getStatusBadge(invoice.status)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Pagination */}
      {invoices.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted">
            Hiển thị {invoices.content.length} / {invoices.totalElements} hóa đơn
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page === 1} />
            {[...Array(invoices.totalPages).keys()].map((number) => (
              <Pagination.Item key={number + 1} active={number + 1 === invoices.page} onClick={() => handlePageChange(number + 1)}>
                {number + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page === invoices.totalPages} />
          </Pagination>
        </div>
      )}
    </div>
  );
}