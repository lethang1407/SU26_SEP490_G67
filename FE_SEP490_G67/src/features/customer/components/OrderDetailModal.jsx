import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Table, Badge, Row, Col } from 'react-bootstrap';
import { getSalesOrderDetail } from '../api';
import { FiDollarSign, FiCalendar, FiUser, FiPhone, FiTag, FiPackage, FiRefreshCcw } from 'react-icons/fi';

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(value);
};

const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getOrderStatusBadge = (status) => {
    switch (status) {
        case 'COMPLETED': return <Badge bg="success">Hoàn thành</Badge>;
        case 'PENDING': return <Badge bg="warning">Chờ xử lý</Badge>;
        case 'CANCELLED': return <Badge bg="danger">Đã hủy</Badge>;
        case 'PARTIALLY_RETURNED': return <Badge bg="info">Trả hàng một phần</Badge>;
        case 'RETURNED': return <Badge bg="secondary">Đã trả hàng</Badge>;
        default: return <Badge bg="secondary">{status}</Badge>;
    }
};

const getPaymentMethodLabel = (method) => {
    switch (method) {
        case 'CASH': return 'Tiền mặt';
        case 'TRANSFER': return 'Chuyển khoản';
        case 'DEBT': return 'Ghi nợ';
        default: return method;
    }
};

const getItemConditionBadge = (condition) => {
    switch (condition) {
        case 'RESELLABLE': return <Badge bg="success">Nguyên vẹn</Badge>;
        case 'DAMAGED': return <Badge bg="danger">Hỏng</Badge>;
        case 'EXPIRED': return <Badge bg="warning">Hết hạn</Badge>;
        case 'OPENED': return <Badge bg="info">Đã mở</Badge>;
        default: return <Badge bg="secondary">{condition}</Badge>;
    }
};

export default function OrderDetailModal({ show, onHide, orderId }) {
    const [orderDetail, setOrderDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Nếu modal không hiển thị, không làm gì cả.
        if (!show) {
            return;
        }

        // Chỉ fetch dữ liệu khi có orderId và nó khác với orderId của dữ liệu đang có.
        // Điều này giúp cache lại kết quả, tránh gọi API lại khi mở cùng 1 hóa đơn.
        if (orderId && orderDetail?.id !== orderId) {
            const fetchOrderDetail = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const data = await getSalesOrderDetail(orderId);
                    setOrderDetail(data);
                } catch (err) {
                    console.error("Failed to fetch order detail:", err);
                    setError("Không thể tải chi tiết đơn hàng. Vui lòng thử lại.");
                } finally {
                    setIsLoading(false);
                }
            };

            fetchOrderDetail();
        }
    }, [show, orderId]);

    return (
        <Modal show={show} onHide={onHide} size="lg" centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title>Chi tiết đơn hàng: {orderDetail?.orderCode || orderId}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {isLoading && (
                    <div className="text-center py-5">
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                        </Spinner>
                    </div>
                )}
                {error && <Alert variant="danger">{error}</Alert>}
                {orderDetail && (
                    <>
                        <Row className="mb-3">
                            <Col md={6}>
                                <h5>Thông tin chung</h5>
                                <p><FiTag className="me-2" />Mã đơn: <strong>{orderDetail.orderCode}</strong></p>
                                <p><FiCalendar className="me-2" />Ngày tạo: {formatDateTime(orderDetail.createdAt)}</p>
                                <p><FiDollarSign className="me-2" />Tổng tiền: <strong>{formatCurrency(orderDetail.totalAmount)}</strong></p>
                                {orderDetail.isDebt && (
                                    <>
                                        <p className="text-success"><FiDollarSign className="me-2" />Đã trả: <strong>{formatCurrency(orderDetail.paidAmount)}</strong></p>
                                    </>
                                )}
                                <p><FiPackage className="me-2" />Trạng thái đơn: {getOrderStatusBadge(orderDetail.orderStatus)}</p>
                                <p><FiRefreshCcw className="me-2" />Thanh toán: {orderDetail.isDebt && <Badge bg="danger">Đơn nợ</Badge>}</p>
                            </Col>
                            <Col md={6}>
                                <h5>Thông tin khách hàng</h5>
                                {orderDetail.customer ? (
                                    <>
                                        <p><FiUser className="me-2" />Tên: {orderDetail.customer.fullName}</p>
                                        <p><FiPhone className="me-2" />SĐT: {orderDetail.customer.phoneNumber}</p>
                                    </>
                                ) : (
                                    <p>Khách lẻ</p>
                                )}
                                {orderDetail.note && <p>Ghi chú: {orderDetail.note}</p>}
                            </Col>
                        </Row>

                        <h5 className="mt-4">Sản phẩm đã mua</h5>
                        <Table striped bordered hover responsive size="sm" className="mb-4">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Sản phẩm</th>
                                    <th>ĐVT</th>
                                    <th className="text-end">SL mua</th>
                                    <th className="text-end">SL trả</th>
                                    <th className="text-end">Đơn giá</th>
                                    <th className="text-end">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderDetail.items.map((item, index) => (
                                    <tr key={item.salesOrderDetailId}>
                                        <td>{index + 1}</td>
                                        <td>{item.productName} ({item.productCode})</td>
                                        <td>{item.unitName}</td>
                                        <td className="text-end">{item.quantityPurchased}</td>
                                        <td className="text-end">{item.quantityReturned}</td>
                                        <td className="text-end">{formatCurrency(item.unitPrice)}</td>
                                        <td className="text-end">{formatCurrency(item.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        {orderDetail.returnOrders && orderDetail.returnOrders.length > 0 && (
                            <>
                                <h5 className="mt-4">Phiếu đổi/trả liên quan</h5>
                                {orderDetail.returnOrders.map((returnOrder, rIndex) => (
                                    <div key={returnOrder.returnOrderId} className="mb-4 p-3 border rounded">
                                        <h6>Phiếu #{rIndex + 1}: {returnOrder.returnCode}</h6>
                                        <p>Lý do: {returnOrder.returnReason}</p>
                                        <p>Ngày tạo: {formatDateTime(returnOrder.createdAt)}</p>
                                        <p>Tổng hoàn tiền: {formatCurrency(returnOrder.refundAmount)}</p>
                                        {returnOrder.note && <p>Ghi chú phiếu: {returnOrder.note}</p>}

                                        <Table striped bordered hover responsive size="sm" className="mt-3">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Sản phẩm</th>
                                                    <th>SL</th>
                                                    <th>Đơn giá</th>
                                                    <th>Hoàn tiền</th>
                                                    <th>Tình trạng</th>
                                                    <th>Ghi chú</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {returnOrder.items.map((returnItem, riIndex) => (
                                                    <tr key={returnItem.returnOrderDetailId}>
                                                        <td>{riIndex + 1}</td>
                                                        <td>{returnItem.productName}</td>
                                                        <td>{returnItem.quantity}</td>
                                                        <td>{formatCurrency(returnItem.unitPrice)}</td>
                                                        <td>{formatCurrency(returnItem.lineRefund)}</td>
                                                        <td>{getItemConditionBadge(returnItem.itemCondition)}</td>
                                                        <td>{returnItem.note || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Đóng
                </Button>
            </Modal.Footer>
        </Modal>
    );
}