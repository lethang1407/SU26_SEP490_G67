import { Modal, Table, Badge } from "react-bootstrap";
import { FiTrendingUp } from "react-icons/fi";

const formatCurrency = (value) => {
    if (value === null || value === undefined) return "0 đ";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
};

const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

export default function TodayDebtSalesModal({ show, onHide, data }) {
    const { debtSalesDetails = [], totalDebtAmountIncurredToday = 0 } = data || {};

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        <FiTrendingUp className="text-warning" />
                        <span>Chi tiết đơn bán nợ hôm nay</span>
                    </div>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {debtSalesDetails.length > 0 ? (
                    <Table striped bordered hover responsive="sm" className="align-middle">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Mã đơn</th>
                                <th>Thời gian</th>
                                <th>Người Nợ</th>
                                <th>Tổng tiền</th>
                                <th>Còn lại</th>
                                <th>Người tạo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debtSalesDetails.map((order, index) => (
                                <tr key={order.id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <Badge bg="secondary">{order.orderCode}</Badge>
                                    </td>
                                    <td>{formatDateTime(order.orderDate)}</td>
                                    <td>{order.customerName}</td>
                                    <td className="text-end">{formatCurrency(order.totalAmount)}</td>
                                    <td className="text-end fw-bold text-danger">
                                        {formatCurrency(order.amountRemaining)}
                                    </td>
                                    <td>{order.createdBy}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="table-light">
                                <td colSpan="4" className="text-end fw-bold">
                                    Tổng nợ phát sinh
                                </td>
                                <td colSpan="2" className="text-end fw-bold fs-5 text-warning">
                                    {formatCurrency(totalDebtAmountIncurredToday)}
                                </td>
                            </tr>
                        </tfoot>
                    </Table>
                ) : (
                    <div className="text-center text-muted py-4">
                        <p>Không có đơn bán nợ nào được tạo trong hôm nay.</p>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-secondary" onClick={onHide}>
                    Đóng
                </button>
            </Modal.Footer>
        </Modal>
    );
}