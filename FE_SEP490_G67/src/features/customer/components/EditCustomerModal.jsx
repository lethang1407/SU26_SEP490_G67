import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { getApiErrorMessage } from '../../profile/utils/profileUtils';
import { updateCustomer } from '../api';

export default function EditCustomerModal({ show, onHide, onSuccess, customer }) {
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
        note: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (customer) {
            setFormData({
                fullName: customer.fullName || '',
                phoneNumber: customer.phoneNumber || '',
                address: customer.address || '',
                note: customer.note || '',
            });
        }
    }, [customer, show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const { fullName, phoneNumber } = formData;

        if (!fullName.trim()) {
            newErrors.fullName = 'Tên khách hàng không được để trống';
        } else if (fullName.trim().length > 100) {
            newErrors.fullName = 'Tên khách hàng không được vượt quá 100 ký tự';
        }

        const phoneRegex = /^(03[2-9]|05[689]|07[06789]|08[1-689]|09[0-46-9])\d{7}$/;
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
            newErrors.phoneNumber = 'Số điện thoại không hợp lệ';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setApiError(null);

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Backend requires allowDebt, so we pass the original value
            const payload = {
                ...formData,
                allowDebt: customer.allowDebt,
            };
            await updateCustomer(customer.id, payload);
            onSuccess();
        } catch (err) {
            setApiError(getApiErrorMessage(err, 'Cập nhật thất bại. Vui lòng thử lại.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHide = () => {
        setErrors({});
        setApiError(null);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Chỉnh sửa thông tin khách hàng</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleFormSubmit}>
                <Modal.Body>
                    {apiError && <Alert variant="danger">{apiError}</Alert>}
                    <Form.Group className="mb-3">
                        <Form.Label>Tên khách hàng <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="fullName" value={formData.fullName} onChange={handleChange} isInvalid={!!errors.fullName} />
                        <Form.Control.Feedback type="invalid">{errors.fullName}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Số điện thoại</Form.Label>
                        <Form.Control type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} isInvalid={!!errors.phoneNumber} />
                        <Form.Control.Feedback type="invalid">{errors.phoneNumber}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Địa chỉ</Form.Label>
                        <Form.Control type="text" name="address" value={formData.address} onChange={handleChange} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Ghi chú</Form.Label>
                        <Form.Control as="textarea" rows={3} name="note" value={formData.note} onChange={handleChange} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleHide} disabled={isSubmitting}>Hủy</Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <><Spinner as="span" animation="border" size="sm" /> Đang lưu...</>
                        ) : 'Lưu thay đổi'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}