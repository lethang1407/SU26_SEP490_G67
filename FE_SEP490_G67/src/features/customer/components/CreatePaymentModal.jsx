import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { getCustomerDebtOrders, createDebtPayment } from '../api';
import { getApiErrorMessage } from '../../profile/utils/profileUtils';

const formatCurrency = (value) => {
    if (value === null || value === undefined) return "0 đ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
};

function formatAmountInput(rawValue) {
    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) return '';
    return new Intl.NumberFormat('en-US').format(Number(digitsOnly));
}

const suggestionAmounts = [5000, 10000, 20000, 50000, 100000, 200000, 500000];

export default function CreatePaymentModal({ show, onHide, onSuccess, customer }) {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [note, setNote] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientError, setClientError] = useState('');
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (!show || !customer?.id) return;

        // Reset form state when modal opens
        setSelectedOrderId('');
        setAmount('');
        setNote('');
        setPaymentMethod('CASH');
        setClientError('');
        setApiError('');
        setOrders([]);

        const fetchOrders = async () => {
            setLoadingOrders(true);
            try {
                const data = await getCustomerDebtOrders(customer.id, { size: 100, status: 'UNPAID' });
                setOrders(data?.content || []);
            } catch (error) {
                console.error("Failed to fetch debt orders:", error);
                setApiError("Không thể tải danh sách hóa đơn nợ.");
            } finally {
                setLoadingOrders(false);
            }
        };

        fetchOrders();
    }, [show, customer?.id]);

    const selectedOrder = useMemo(
        () => orders.find((order) => String(order.id) === String(selectedOrderId)) || null,
        [orders, selectedOrderId]
    );

    const parsedAmount = Number(String(amount).replace(/\D/g, '')) || 0;
    const remainingAfterPayment = selectedOrder ? Math.max(selectedOrder.amountRemaining - parsedAmount, 0) : 0;
    const changeToCustomer = selectedOrder ? Math.max(0, parsedAmount - selectedOrder.amountRemaining) : 0;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setClientError('');
        setApiError('');

        if (!selectedOrder) {
            setClientError('Vui lòng chọn hóa đơn cần thu nợ.');
            return;
        }
        if (parsedAmount <= 0) {
            setClientError('Số tiền thu phải lớn hơn 0.');
            return;
        }

        setIsSubmitting(true);
        try {
            const actualPayment = Math.min(parsedAmount, selectedOrder.amountRemaining);
            await createDebtPayment({
                orderId: selectedOrder.id,
                amountPaid: actualPayment,
                paymentMethod,
                note: note.trim(),
            });
            onSuccess();
        } catch (err) {
            setApiError(getApiErrorMessage(err, 'Tạo phiếu thu thất bại. Vui lòng thử lại.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayError = apiError || clientError;

    return (
        <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>Tạo phiếu thu nợ</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <p className="mb-3">Khách hàng: <strong className="text-primary">{customer?.fullName}</strong></p>

                    {displayError && <Alert variant="danger">{displayError}</Alert>}

                    <Form.Group as={Row} className="mb-3 align-items-center">
                        <Form.Label column sm={4}>Chọn hóa đơn nợ <span className="text-danger">*</span></Form.Label>
                        <Col sm={8}>
                            <Form.Select
                                value={selectedOrderId}
                                onChange={(e) => {
                                    setSelectedOrderId(e.target.value);
                                    setAmount('');
                                    setClientError('');
                                }}
                                disabled={loadingOrders || orders.length === 0 || isSubmitting}
                                required
                            >
                                <option value="">{loadingOrders ? 'Đang tải...' : '-- Chọn hóa đơn --'}</option>
                                {orders.map((order) => (
                                    <option key={order.id} value={order.id}>
                                        {`${order.orderCode} - Nợ: ${formatCurrency(order.amountRemaining)}`}
                                    </option>
                                ))}
                            </Form.Select>
                            {!loadingOrders && orders.length === 0 && (
                                <Form.Text className="text-muted">Khách hàng này không có hóa đơn nào chưa thanh toán.</Form.Text>
                            )}
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3 align-items-center">
                        <Form.Label column sm={4}>Số tiền khách đưa <span className="text-danger">*</span></Form.Label>
                        <Col sm={8}>
                            <Form.Control
                                type="text"
                                inputMode="numeric"
                                placeholder="Nhập số tiền"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(formatAmountInput(e.target.value));
                                    setClientError('');
                                }}
                                disabled={!selectedOrder || isSubmitting}
                                required
                            />
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3">
                        <Col sm={{ span: 8, offset: 4 }}>
                            <div className="d-flex flex-wrap gap-2">
                                <Button
                                    variant="outline-success"
                                    size="sm"
                                    disabled={!selectedOrder || isSubmitting}
                                    onClick={() => {
                                        if (selectedOrder) {
                                            setAmount(formatAmountInput(String(selectedOrder.amountRemaining)));
                                        }
                                    }}
                                >
                                    Trả hết nợ
                                </Button>
                                {suggestionAmounts.map((suggAmount) => (
                                    <Button
                                        key={suggAmount}
                                        variant="outline-secondary"
                                        size="sm"
                                        disabled={!selectedOrder || isSubmitting}
                                        onClick={() => {
                                            const newAmount = parsedAmount + suggAmount;
                                            setAmount(formatAmountInput(String(newAmount)));
                                        }}
                                    >
                                        + {new Intl.NumberFormat('vi-VN').format(suggAmount)}
                                    </Button>
                                ))}
                            </div>
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3 align-items-center">
                        <Form.Label column sm={4}>Hình thức thanh toán</Form.Label>
                        <Col sm={8}>
                            <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={isSubmitting}>
                                <option value="CASH">Tiền mặt</option>
                                <option value="BANK">Chuyển khoản</option>
                            </Form.Select>
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={4}>Ghi chú</Form.Label>
                        <Col sm={8}>
                            <Form.Control as="textarea" rows={3} placeholder="Thêm ghi chú nếu cần" value={note} onChange={(e) => setNote(e.target.value)} disabled={isSubmitting} />
                        </Col>
                    </Form.Group>

                    <hr />

                    <div className="mt-3">
                        <Row className="mb-2"><Col sm={4} className="text-muted">Nợ của đơn</Col><Col sm={8}><strong>{selectedOrder ? formatCurrency(selectedOrder.amountRemaining) : '—'}</strong></Col></Row>
                        <Row className="mb-2"><Col sm={4} className="text-muted">Số tiền khách đưa</Col><Col sm={8}><strong>{formatCurrency(parsedAmount)}</strong></Col></Row>
                        <Row className="mb-2"><Col sm={4} className="text-muted">Nợ còn lại</Col><Col sm={8}><strong className="text-danger">{selectedOrder ? formatCurrency(remainingAfterPayment) : '—'}</strong></Col></Row>
                        {changeToCustomer > 0 && (
                            <Row className="mt-3 pt-2 border-top">
                                <Col sm={4} className="text-muted fw-bold">Tiền trả lại khách</Col><Col sm={8}><strong className="text-success fs-5">{formatCurrency(changeToCustomer)}</strong></Col>
                            </Row>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>Hủy</Button>
                    <Button variant="primary" type="submit" disabled={!selectedOrder || isSubmitting}>
                        {isSubmitting ? <><Spinner as="span" size="sm" /> Đang xử lý...</> : 'Xác nhận thu nợ'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}