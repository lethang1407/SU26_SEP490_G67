import { useState, useEffect } from 'react';
import { Modal, Table, Spinner, Pagination, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getTodayDebtPayments } from '../api';

const formatCurrency = (value) => {
    if (value === null || value === undefined) return "0 đ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
};

const formatVnDateTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const getPaymentMethodLabel = (method) => {
    switch (method) {
        case 'CASH':
            return 'Tiền mặt';
        case 'BANK':
            return 'Chuyển khoản';
        case 'RETURN_OFFSET':
            return 'Đổi trả hàng';
        default:
            return method || '—';
    }
};

export default function TodayPaymentsModal({ show, onHide }) {
    const navigate = useNavigate();
    const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!show) return;

        const fetchPayments = async () => {
            setLoading(true);
            setError('');
            try {
                const result = await getTodayDebtPayments({ page: page, size: 10 });
                setData(result || { content: [], totalPages: 0, totalElements: 0 });
            } catch (err) {
                console.error("Failed to fetch today's debt payments:", err);
                setError('Không thể tải danh sách phiếu thu. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, [show, page]);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= data.totalPages) {
            setPage(newPage);
        }
    };

    const handleCustomerClick = (customerId) => {
        navigate(`/admin/customer/${customerId}`);
        onHide(); // Đóng modal sau khi điều hướng
    };

    const renderPagination = () => {
        if (data.totalPages <= 1) return null;

        let items = [];
        for (let number = 1; number <= data.totalPages; number++) {
            items.push(
                <Pagination.Item key={number} active={number === page} onClick={() => setPage(number)}>
                    {number}
                </Pagination.Item>,
            );
        }

        return (
            <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">Hiển thị {data.content.length} / {data.totalElements} kết quả</small>
                <Pagination className="mb-0">
                    <Pagination.Prev onClick={() => handlePageChange(page - 1)} disabled={page === 1} />
                    {items}
                    <Pagination.Next onClick={() => handlePageChange(page + 1)} disabled={page === data.totalPages} />
                </Pagination>
            </div>
        );
    };

    return (
        <Modal show={show} onHide={onHide} centered size="xl">
            <Modal.Header closeButton>
                <Modal.Title>Các phiếu thu nợ trong ngày</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Khách hàng</th>
                            <th>Số tiền thu</th>
                            <th>Phương thức</th>
                            <th>Hóa đơn</th>
                            <th>Thời gian</th>
                            <th>Người thu</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center py-5"><Spinner animation="border" size="sm" /> Đang tải...</td></tr>
                        ) : data.content.length === 0 ? (
                            <tr><td colSpan="7" className="text-center py-4 text-muted">Không có phiếu thu nào trong hôm nay.</td></tr>
                        ) : (
                            (() => {
                                let globalIndex = 0;
                                return data.content.map((customerGroup) =>
                                    customerGroup.debtPaymentDetails.map((payment, paymentIndex) => {
                                        globalIndex++;
                                        const isFirstItemInGroup = paymentIndex === 0;
                                        return (
                                            <tr key={payment.id}>
                                                <td>{(page - 1) * 10 + globalIndex}</td>
                                                {isFirstItemInGroup && (
                                                    <td
                                                        rowSpan={customerGroup.debtPaymentDetails.length}
                                                        onClick={() => handleCustomerClick(customerGroup.customerId)}
                                                        className="fw-medium"
                                                        style={{
                                                            cursor: 'pointer',
                                                            color: '#0d6efd',
                                                            verticalAlign: 'top',
                                                        }}
                                                        title={`Xem chi tiết khách hàng ${customerGroup.customerName}`}
                                                    >
                                                        {customerGroup.customerName}
                                                    </td>
                                                )}
                                                <td className="text-end">{formatCurrency(payment.amountPaid)}</td>
                                                <td>{getPaymentMethodLabel(payment.paymentMethod)}</td>
                                                <td>{payment.orderCode}</td>
                                                <td>{formatVnDateTime(payment.paymentDate)}</td>
                                                <td>{payment.staffName}</td>
                                            </tr>
                                        );
                                    })
                                );
                            })()
                        )}
                    </tbody>
                </Table>
                {renderPagination()}
            </Modal.Body>
        </Modal>
    );
}