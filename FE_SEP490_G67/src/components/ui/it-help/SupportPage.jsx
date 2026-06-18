import { Container, Row, Col, Card } from 'react-bootstrap';
import { Mail, Phone, MessageCircle } from 'lucide-react';

export default function SupportPage() {
    return (
        <Container fluid className="p-4">
            <Row className="staff-management-header mb-4">
                <Col className="text-center">
                    <h1 className="staff-management-header__title text-bold mb-1">
                        Trung tâm hỗ trợ
                    </h1>
                    <p className="text-muted mb-0">
                        Liên hệ với chúng tôi nếu bạn gặp lỗi hoặc cần trợ giúp
                    </p>
                </Col>
            </Row>

            <Row className="g-4">
                <Col lg={12}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white fw-semibold">
                            Thông tin liên hệ
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={4} className="mb-3 mb-md-0">
                                    <div className="d-flex align-items-center">
                                        <div className="flex-shrink-0">
                                            <div className="d-inline-flex align-items-center justify-content-center bg-primary-light text-primary rounded-circle" style={{ width: '50px', height: '50px' }}>
                                                <Mail size={24} />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <h5 className="fw-bold mb-1">Email</h5>
                                            <p className="text-muted mb-0">support@example.com</p>
                                        </div>
                                    </div>
                                </Col>
                                <Col md={4} className="mb-3 mb-md-0">
                                    <div className="d-flex align-items-center">
                                        <div className="flex-shrink-0">
                                            <div className="d-inline-flex align-items-center justify-content-center bg-success-light text-success rounded-circle" style={{ width: '50px', height: '50px' }}>
                                                <Phone size={24} />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <h5 className="fw-bold mb-1">Hotline</h5>
                                            <p className="text-muted mb-0">1900 1234</p>
                                        </div>
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-shrink-0">
                                            <div className="d-inline-flex align-items-center justify-content-center bg-info-light text-info rounded-circle" style={{ width: '50px', height: '50px' }}>
                                                <MessageCircle size={24} />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <h5 className="fw-bold mb-1">Zalo</h5>
                                            <p className="text-muted mb-0">0987 654 321</p>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}