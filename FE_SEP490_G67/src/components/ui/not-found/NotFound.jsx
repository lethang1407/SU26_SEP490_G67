import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import '../../../css/LoginScreen.css'; 

export default function NotFound() {
  return (
    <div className="login-wrapper"> {/* Tái sử dụng hiệu ứng nền mờ từ trang login */}
      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <Container className="d-flex align-items-center justify-content-center min-vh-100 text-center">
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-4 shadow-lg" style={{ width: '100px', height: '100px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '4rem' }}>
                  sentiment_very_dissatisfied
                </span>
            </div>
            <h1 className="display-1 fw-bold" style={{ color: '#191b23' }}>404</h1>
            <h3 className="fw-bold mb-3">Oops! Không tìm thấy trang</h3>
            <p className="text-muted mb-4 lead">
              Trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên hoặc tạm thời không có sẵn.
            </p>
            <Button as={Link} to="/admin/dashboard" variant="primary" className="py-2 px-4 rounded-pill fw-medium">
              <span className="material-symbols-outlined align-middle me-2">home</span>
              Quay về trang chủ
            </Button>
          </Col>
        </Row>
      </Container>
    </div>
  )
}
