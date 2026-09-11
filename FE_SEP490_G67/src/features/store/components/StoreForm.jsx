import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Modal } from 'react-bootstrap';
import { FileText, TriangleAlert, Landmark } from 'lucide-react';
import { updateStoreInfor } from '../api';
import { VIETQR_BANKS, bankNameOf } from '../constants/banks';
import { getApiErrorMessage } from '../../../utils/api-utils';

function StoreForm({ initialData, onUpdateSuccess }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [errors, setErrors] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
        if (message) setMessage(null);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.storeName?.trim()) newErrors.storeName = 'Tên hộ kinh doanh không được để trống';
        if (!formData.ownerFullName?.trim()) newErrors.ownerFullName = 'Người đại diện không được để trống';
        if (!formData.taxCode?.trim()) newErrors.taxCode = 'Mã số thuế không được để trống';
        if (!formData.address?.trim()) newErrors.address = 'Địa chỉ không được để trống';
        if (formData.taxCode && !/^\d{10}(?:-\d{3})?$/.test(formData.taxCode)) newErrors.taxCode = 'Sai định dạng mã số thuế';

        //Validate thông tin ngân hàng
        const bankId = formData.bankId?.trim();
        const bankAccountNo = formData.bankAccountNo?.trim();
        if (bankId && !bankAccountNo) newErrors.bankAccountNo = 'Đã chọn ngân hàng thì phải có số tài khoản';
        if (!bankId && bankAccountNo) newErrors.bankId = 'Đã có số tài khoản thì phải chọn ngân hàng';
        if (bankId && !/^[A-Za-z0-9]{2,20}$/.test(bankId)) newErrors.bankId = 'Mã ngân hàng chỉ gồm chữ và số';
        if (bankAccountNo && !/^\d{6,20}$/.test(bankAccountNo)) {
            newErrors.bankAccountNo = 'Số tài khoản chỉ gồm chữ số, dài 6-20 ký tự';
        }

        // Ngân hàng in tên thụ hưởng dạng in hoa không dấu (PHAM HUY THAI).
        const bankAccountName = formData.bankAccountName?.trim();
        if (bankAccountName && !/^[A-Z0-9 ]{5,50}$/.test(bankAccountName)) {
            newErrors.bankAccountName =
                'Tên chủ tài khoản phải viết hoa không dấu, không chứa ký tự đặc biệt, dài 5-50 ký tự';
        }

        setErrors(newErrors);
        return newErrors;
    };

    const handleShowConfirmModal = () => {
        const newErrors = validateForm();
        const firstInvalid = Object.keys(newErrors)[0];
        if (firstInvalid) {
            setMessage({ type: 'danger', text: newErrors[firstInvalid] });
            document.querySelector(`[name="${firstInvalid}"]`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
            return;
        }
        setShowConfirmModal(true);
    };

    const handleSave = async () => {
        if (Object.keys(validateForm()).length > 0) return;

        setIsSaving(true);
        setMessage(null);
        try {
            const response = await updateStoreInfor(formData);
            const updatedData = response.result;

            setIsEditing(false);
            setShowConfirmModal(false);
            onUpdateSuccess(updatedData, response.message);
        } catch (error) {
            setMessage({ type: 'danger', text: getApiErrorMessage(error) });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setShowConfirmModal(false);
        setFormData(initialData);
        setMessage(null);
        setErrors({});
    };

    const handleCloseConfirmModal = () => {
        setShowConfirmModal(false);
    }

    return (
        <>
            <div className="staff-management-header">
                <div>
                    <h1 className="staff-management-header__title text-bold mb-1">Thông tin cửa hàng</h1>
                    <p className="text-muted mb-0">Quản lý các thông tin pháp lý chính thức của cửa hàng</p>
                </div>

                {isEditing ? (
                    <div className="d-flex gap-2">
                        <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                            Hủy
                        </Button>
                        <Button variant="primary" onClick={handleShowConfirmModal} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                ) : (
                    <Button variant="primary" onClick={() => setIsEditing(true)} disabled={isSaving}>
                        Cập nhật
                    </Button>
                )}
            </div>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-semibold d-flex align-items-center gap-2">
                    <FileText size={18} className="text-muted" />
                    <span>THÔNG TIN PHÁP LÝ</span>
                </Card.Header>

                <Card.Body>
                    {message && (
                        <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>
                            {message.text}
                        </Alert>
                    )}
                    <Form noValidate>
                        <Form.Group className="mb-3">
                            <Form.Label><b>Tên hộ kinh doanh</b></Form.Label>
                            <Form.Control
                                name="storeName"
                                value={formData.storeName || ''}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                isInvalid={!!errors.storeName}
                            />
                            <Form.Control.Feedback type="invalid">{errors.storeName}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label><b>Người đại diện pháp luật</b></Form.Label>
                            <Form.Control
                                name="ownerFullName"
                                value={formData.ownerFullName || ''}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                isInvalid={!!errors.ownerFullName}
                            />
                            <Form.Control.Feedback type="invalid">{errors.ownerFullName}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label><b>Mã số thuế</b></Form.Label>
                            <Form.Control
                                name="taxCode"
                                value={formData.taxCode || ''}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                isInvalid={!!errors.taxCode}
                            />
                            <Form.Control.Feedback type="invalid">{errors.taxCode}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group>
                            <Form.Label><b>Địa chỉ kinh doanh</b></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="address"
                                value={formData.address || ''}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                isInvalid={!!errors.address}
                            />
                            <Form.Control.Feedback type="invalid">{errors.address}</Form.Control.Feedback>
                        </Form.Group>
                    </Form>
                </Card.Body>
            </Card>

            <Card className="shadow-sm border-0 mt-3">
                <Card.Header className="bg-white fw-semibold d-flex align-items-center gap-2">
                    <Landmark size={18} className="text-muted" />
                    <span>TÀI KHOẢN NHẬN CHUYỂN KHOẢN</span>
                </Card.Header>

                <Card.Body>
                    <p className="text-muted small mb-3">
                        Thông tin này được in lên mã QR ở màn hình bán hàng khi khách chọn
                        thanh toán bằng chuyển khoản. Để trống nếu cửa hàng chỉ thu tiền mặt.
                    </p>

                    <Form noValidate>
                        <Form.Group className="mb-3">
                            <Form.Label><b>Ngân hàng</b></Form.Label>
                            <Form.Select
                                name="bankId"
                                value={formData.bankId || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                isInvalid={!!errors.bankId}
                            >
                                <option value="">— Chưa chọn —</option>
                                {VIETQR_BANKS.map(({ bin, name }) => (
                                    <option key={bin} value={bin}>{name} ({bin})</option>
                                ))}
                                {formData.bankId && !bankNameOf(formData.bankId) && (
                                    <option value={formData.bankId}>Mã {formData.bankId}</option>
                                )}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">{errors.bankId}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label><b>Số tài khoản</b></Form.Label>
                            <Form.Control
                                name="bankAccountNo"
                                value={formData.bankAccountNo || ''}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                isInvalid={!!errors.bankAccountNo}
                            />
                            <Form.Control.Feedback type="invalid">{errors.bankAccountNo}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group>
                            <Form.Label><b>Tên chủ tài khoản</b></Form.Label>
                            <Form.Control
                                name="bankAccountName"
                                value={formData.bankAccountName || ''}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                isInvalid={!!errors.bankAccountName}
                            />
                            <Form.Control.Feedback type="invalid">{errors.bankAccountName}</Form.Control.Feedback>
                        </Form.Group>
                    </Form>
                </Card.Body>
            </Card>

            <Modal show={showConfirmModal} onHide={handleCloseConfirmModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <TriangleAlert size={24} className="text-warning" />
                        Xác nhận thay đổi thông tin cửa hàng
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Bạn sắp thay đổi các thông tin pháp lý quan trọng của cửa hàng.
                        Những thông tin này được sử dụng cho việc kê khai thuế và các hoạt động pháp lý khác.
                    </p>
                    <p className="fw-bold text-danger">
                        Vui lòng đảm bảo thông tin chính xác. Người dùng chịu trách nhiệm hoàn toàn về việc quản lý và tính chính xác của thông tin đã cung cấp.
                    </p>
                    <p>Bạn có chắc chắn muốn lưu các thay đổi này không?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseConfirmModal} disabled={isSaving}>
                        Hủy bỏ
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Đang lưu...' : 'Xác nhận lưu'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default StoreForm;