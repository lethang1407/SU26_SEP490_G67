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
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [note, setNote] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientError, setClientError] = useState('');
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (!show || !customer?.id) return;

        // Reset form state when modal opens
        setSelectedOrderIds([]);
        setAmount('');
        setNote('');
        setPaymentMethod('CASH');
        setClientError('');
        setApiError('');
        setOrders([]);

        const fetchOrders = async () => {
            setLoadingOrders(true);
            try {
                const data = await getCustomerDebtOrders(customer.id, { size: 100, status: 'IN_DEBT' });
                // Lọc chỉ lấy những đơn hàng còn nợ > 0
                const filteredOrders = (data?.content || []).filter(order => order.amountRemaining > 0);
                setOrders(filteredOrders);
            } catch (error) {
                console.error("Failed to fetch debt orders:", error);
                setApiError("Không thể tải danh sách hóa đơn nợ.");
            } finally {
                setLoadingOrders(false);
            }
        };

        fetchOrders();
    }, [show, customer?.id]);

    const handleOrderSelectionChange = (orderId) => {
        setSelectedOrderIds(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
        setClientError('');
    };

    const selectedOrders = useMemo(
        () => orders.filter(order => selectedOrderIds.includes(order.id)),
        [orders, selectedOrderIds]
    );

    const totalRemainingDebt = useMemo(
        () => selectedOrders.reduce((sum, order) => sum + order.amountRemaining, 0),
        [selectedOrders]
    );

    const parsedAmount = Number(String(amount).replace(/\D/g, '')) || 0;
    const remainingAfterPayment = Math.max(totalRemainingDebt - parsedAmount, 0);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setClientError('');
        setApiError('');

        if (selectedOrderIds.length === 0) {
            setClientError('Vui lòng chọn ít nhất một hóa đơn để thanh toán.');
            return;
        }
        if (parsedAmount <= 0) {
            setClientError('Số tiền thu phải lớn hơn 0.');
            return;
        }
        if (parsedAmount > totalRemainingDebt) {
            setClientError(`Số tiền không được vượt quá tổng nợ đã chọn (${formatCurrency(totalRemainingDebt)}).`);
            return;
        }

        setIsSubmitting(true);
        try {
            await createDebtPayment({
                salesOrderIds: selectedOrderIds,
                amountPaid: parsedAmount,
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
                            <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {loadingOrders && <Spinner size="sm" />}
                                {!loadingOrders && orders.length > 0 && orders.map((order) => (
                                    <Form.Check
                                        key={order.id}
                                        type="checkbox"
                                        id={`order-${order.id}`}
                                        label={`${order.orderCode} - Nợ: ${formatCurrency(order.amountRemaining)}`}
                                        checked={selectedOrderIds.includes(order.id)}
                                        onChange={() => handleOrderSelectionChange(order.id)}
                                        disabled={isSubmitting}
                                    />
                                ))}
                                {!loadingOrders && orders.length === 0 && (
                                    <Form.Text className="text-muted">Khách hàng này không có hóa đơn nào chưa thanh toán.</Form.Text>
                                )}
                            </div>
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
                                disabled={selectedOrderIds.length === 0 || isSubmitting}
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
                                    disabled={selectedOrderIds.length === 0 || isSubmitting}
                                    onClick={() => {
                                        setAmount(formatAmountInput(String(totalRemainingDebt)));
                                    }}
                                >
                                    Trả hết nợ
                                </Button>
                                {suggestionAmounts.map((suggAmount) => (
                                    <Button
                                        key={suggAmount}
                                        variant="outline-secondary"
                                        size="sm"
                                        disabled={selectedOrderIds.length === 0 || isSubmitting}
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
                        <Row className="mb-2"><Col sm={4} className="text-muted">Tổng nợ đã chọn</Col><Col sm={8}><strong>{formatCurrency(totalRemainingDebt)}</strong></Col></Row>
                        <Row className="mb-2"><Col sm={4} className="text-muted">Số tiền khách đưa</Col><Col sm={8}><strong>{formatCurrency(parsedAmount)}</strong></Col></Row>
                        <Row className="mb-2"><Col sm={4} className="text-muted">Nợ còn lại</Col><Col sm={8}><strong className="text-danger">{formatCurrency(remainingAfterPayment)}</strong></Col></Row>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>Hủy</Button>
                    <Button variant="primary" type="submit" disabled={selectedOrderIds.length === 0 || isSubmitting}>
                        {isSubmitting ? <><Spinner as="span" size="sm" /> Đang xử lý...</> : 'Xác nhận thu nợ'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}