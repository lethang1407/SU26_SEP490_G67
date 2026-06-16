import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { FileText } from 'lucide-react';
import SideBar from '../../../components/ui/header-footer/SideBar';
import AdminHeader from '../../dashboard/components/AdminHeader';
import '../../../css/AdminDashboard.css';

function StoreInfo() {
    const [isEditing, setIsEditing] = useState(false);
    const [storeData, setStoreData] = useState({});
    const [initialData, setInitialData] = useState({});

    // Giả lập việc lấy dữ liệu từ API
    useEffect(() => {
        const fetchedData = {
            taxCode: '0312345678',
            licenseNumber: '41A8012345/GP-HCM',
            legalRepresentative: 'Nguyễn Văn A',
            address: '123 Lê Lợi, Phường Bến Thành, Quận 1, TP Hồ Chí Minh',
        };
        setStoreData(fetchedData);
        setInitialData(fetchedData);
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setStoreData({ ...storeData, [name]: value });
    };

    return (
        <div className="admin-layout">
            <SideBar />

            <div className="admin-content">
                <AdminHeader />

                <main className="admin-main">
                    <div className="dashboard-container">
                        <div className="staff-management-header">
                            <div>
                                <h1 className="staff-management-header__title">
                                    Thông tin cửa hàng
                                </h1>
                                <p className="text-muted mb-0">
                                    Quản lý các thông tin pháp lý chính thức của cửa hàng.
                                </p>
                            </div>

                            {isEditing ? (
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setStoreData(initialData); // Hủy và quay lại dữ liệu ban đầu
                                        }}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => setIsEditing(false)} // Sẽ gọi API ở đây
                                    >
                                        Lưu thay đổi
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="primary" onClick={() => setIsEditing(true)}>
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
                                <Form>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Mã số thuế</Form.Label>
                                        <Form.Control
                                            name="taxCode"
                                            value={storeData.taxCode || ''}
                                            onChange={handleInputChange}
                                            readOnly={!isEditing}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Số giấy phép kinh doanh</Form.Label>
                                        <Form.Control
                                            name="licenseNumber"
                                            value={storeData.licenseNumber || ''}
                                            onChange={handleInputChange}
                                            readOnly={!isEditing}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Người đại diện pháp luật</Form.Label>
                                        <Form.Control
                                            name="legalRepresentative"
                                            value={storeData.legalRepresentative || ''}
                                            onChange={handleInputChange}
                                            readOnly={!isEditing}
                                        />
                                    </Form.Group>

                                    <Form.Group>
                                        <Form.Label>Địa chỉ chi tiết</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            name="address"
                                            value={storeData.address || ''}
                                            onChange={handleInputChange}
                                            readOnly={!isEditing}
                                        />
                                    </Form.Group>
                                </Form>
                            </Card.Body>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default StoreInfo;