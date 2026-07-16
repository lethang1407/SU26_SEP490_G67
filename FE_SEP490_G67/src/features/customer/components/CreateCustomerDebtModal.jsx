import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { createCustomerDebt } from '../api';

export default function CreateCustomerDebtModal({ show, onHide, onSuccess }) {
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
        note: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await createCustomerDebt(formData);
            if (response.code === 1000) {
                onSuccess(); // Gọi callback thành công từ component cha
            } else {
                setError(response.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
            }
        } catch (err) {
            setError(err.message || 'Không thể kết nối đến máy chủ.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHide = () => {
        // Reset form khi đóng modal
        setFormData({ fullName: '', phoneNumber: '', address: '', note: '' });
        setError(null);
        onHide();
    }

    return (
        <Modal show={show} onHide={handleHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Tạo khách nợ mới</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleFormSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form.Group className="mb-3" controlId="formCustomerName">
                        <Form.Label>Tên khách hàng <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Nhập tên đầy đủ" required />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formCustomerPhone">
                        <Form.Label>Số điện thoại <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Nhập số điện thoại" required />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formCustomerAddress">
                        <Form.Label>Địa chỉ</Form.Label>
                        <Form.Control type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Nhập địa chỉ" />
                    </Form.Group>
                    <Form.Group controlId="formCustomerNote">
                        <Form.Label>Ghi chú</Form.Label>
                        <Form.Control as="textarea" rows={3} name="note" value={formData.note} onChange={handleChange} placeholder="Thêm ghi chú nếu cần" />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleHide} disabled={isSubmitting}>
                        Hủy
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                {' '}Đang lưu...
                            </>
                        ) : 'Lưu khách hàng'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}