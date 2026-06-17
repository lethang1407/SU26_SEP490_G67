import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { FileText } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import Header from '../../../components/ui/header-footer/Header';

function StoreInfo() {
    const [isEditing, setIsEditing] = useState(false);
    const [storeData, setStoreData] = useState({});
    const [initialData, setInitialData] = useState({});

    // Giả lập việc lấy dữ liệu từ API
    useEffect(() => {
        const fetchedData = {
            storeName: 'Tạp hóa Đức Thắng',
            taxCode: '0312345678',
            legalRepresentative: 'Nguyễn Văn A',
            address: 'Thôn 3, Thạch Thất, Hòa Lạc, Hà Nội',
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
                <Header />

                <main className="admin-main">
                    <div className="dashboard-container">
                        <div className="staff-management-header">
                            <div>
                                <h1 className="staff-management-header__title text-bold mb-1">
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
                                            setStoreData(initialData);
                                        }}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => setIsEditing(false)}
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
                                        <Form.Label>Tên hộ kinh doanh</Form.Label>
                                        <Form.Control
                                            name="storeName"
                                            value={storeData.storeName || ''}
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

                                    <Form.Group className="mb-3">
                                        <Form.Label>Mã số thuế</Form.Label>
                                        <Form.Control
                                            name="taxCode"
                                            value={storeData.taxCode || ''}
                                            onChange={handleInputChange}
                                            readOnly={!isEditing}
                                        />
                                    </Form.Group>

                                    <Form.Group>
                                        <Form.Label>Địa chỉ kinh doanh</Form.Label>
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