import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { getApiErrorMessage } from '../../profile/utils/profileUtils';
import { createCustomerDebt } from '../api';
import { validatePhoneNumber } from '../../auth/utils/validation';

export default function CreateCustomerDebtModal({ show, onHide, onSuccess }) {
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
        note: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear validation error for the field being edited
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const { fullName, phoneNumber } = formData;

        // FullName validation
        if (!fullName.trim()) {
            newErrors.fullName = 'Tên khách hàng không được để trống';
        }

        // PhoneNumber validation
        // Only validate if phone number is not empty
        if (phoneNumber.trim()) {
            const phoneValidation = validatePhoneNumber(phoneNumber);
            if (!phoneValidation.isValid) {
                newErrors.phoneNumber = phoneValidation.error;
            }
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
            const response = await createCustomerDebt(formData);
            onSuccess(response.result); 
        } catch (err) {
            setApiError(getApiErrorMessage(err, 'Đã có lỗi xảy ra. Vui lòng thử lại.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHide = () => {
        // Reset form and errors when closing modal
        setFormData({ fullName: '', phoneNumber: '', address: '', note: '' });
        setErrors({});
        setApiError(null);
        onHide();
    }

    return (
        <Modal show={show} onHide={handleHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Tạo khách hàng mới</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleFormSubmit}>
                <Modal.Body>
                    {apiError && <Alert variant="danger">{apiError}</Alert>}
                    <Form.Group className="mb-3" controlId="formCustomerName">
                        <Form.Label>Tên khách hàng <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Nhập tên đầy đủ" isInvalid={!!errors.fullName} />
                        <Form.Control.Feedback type="invalid">{errors.fullName}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formCustomerPhone">
                        <Form.Label>Số điện thoại</Form.Label>
                        <Form.Control type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Nhập số điện thoại" isInvalid={!!errors.phoneNumber} />
                        <Form.Control.Feedback type="invalid">{errors.phoneNumber}</Form.Control.Feedback>
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
                        ) : 'Lưu'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}