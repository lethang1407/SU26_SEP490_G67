import React, { useState } from 'react';
import { Container, Card, Form, InputGroup, Button } from 'react-bootstrap';
import '../../../css/LoginScreen.css';
import { Row, Col,Alert } from 'react-bootstrap';
import { AuthContext } from '../../../app/providers/AuthProvider.jsx';
import auth from '../api/index.js';
import { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
const LoginPage = () => {
  const location = useLocation();
  const successMessage = location.state?.message;
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await auth.login({
        username: formData.username.trim(),
        password: formData.password.trim()
      });
      console.log("Login response:", response);
      login(response.result);

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ _form: error.response?.data?.message});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`login-wrapper ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <Container className="d-flex align-items-center justify-content-center min-vh-100">
        <Card className="border-1 shadow-lg rounded-4 p-3 p-md-4 w-100" style={{ maxWidth: '440px' }}>
          <Card.Body>

            {/* Header */}
            <div className="text-center mb-5">
              <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-4 mb-3 custom-shadow" style={{ width: '64px', height: '64px' }}>
                <span className="material-symbols-outlined fs-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                  storefront
                </span>
              </div>
              <h2 className="fw-bold mb-1" style={{ color: '#191b23' }}>Đức Thắng</h2>
              <p className="text-muted small mb-0">Hệ thống quản lý cửa hàng chuyên nghiệp</p>
            </div>

            {/* Form */}
            <Form onSubmit={handleSubmit}>
                {successMessage && (
                    <Row className="mb-3">
                        <Col md={12}>
                            <Alert variant="success" className="mb-0">
                                {successMessage}
                            </Alert>
                        </Col>
                    </Row>
                )}

              {/* Username */}
              <Form.Group className="mb-4">
                <Form.Label className="fw-medium text-muted small">Tên đăng nhập hoặc Số điện thoại</Form.Label>
                <InputGroup className="custom-input-group mt-1">
                  <InputGroup.Text>
                    <span className="material-symbols-outlined text-muted">person</span>
                  </InputGroup.Text>
                  <Form.Control
                    name="username"
                    type="text"
                    required
                    placeholder="Nhập tài khoản của bạn"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </InputGroup>
              </Form.Group>

              {/* Password */}
              <Form.Group className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Form.Label className="fw-medium text-muted small mb-0">Mật khẩu</Form.Label>
                  <a href="#" className="text-primary text-decoration-none small" onClick={(e) => {
                    e.preventDefault();
                    navigate('/forgot-password');
                  }}>
                    Quên mật khẩu?
                  </a>
                </div>
                <InputGroup className="custom-input-group">
                  <InputGroup.Text>
                    <span className="material-symbols-outlined text-muted">lock</span>
                  </InputGroup.Text>
                  <Form.Control
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <InputGroup.Text
                    className="cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-muted hover-dark">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </InputGroup.Text>
                </InputGroup>
              </Form.Group>
                {errors._form && (
                    <Row className="mb-3">
                        <Col md={12}>
                            <Alert variant="danger" className="mb-0">
                                {errors._form}
                            </Alert>
                        </Col>
                    </Row>
                )}

              {/* Submit Button */}
              <Button
                variant={isSuccess ? "success" : "primary"}
                type="submit"
                disabled={isLoading || isSuccess}
                className="w-100 py-3 rounded-3 d-flex justify-content-center align-items-center gap-2 fw-medium"
              >
                {isLoading ? (
                  <><span className="material-symbols-outlined animate-spin">progress_activity</span> Đang xác thực...</>
                ) : isSuccess ? (
                  <><span className="material-symbols-outlined">check_circle</span> Thành công</>
                ) : (
                  <>Đăng nhập <span className="material-symbols-outlined">arrow_forward</span></>
                )}
              </Button>
            </Form>

            {/* Footer */}
            <div className="mt-2 pt-4 text-center">

              <p className="text-muted  title-divider small mb-2">Hướng dẫn & Hỗ trợ</p>
              <Row className="g-3"> {/* g-3 tạo khoảng cách (gap) giữa 2 cột */}
                <Col xs={12} sm={6}>
                  <button className="custom-btn-card w-100">
                    <svg className="custom-btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                    <span className="custom-btn-text">Hướng dẫn</span>
                  </button>
                </Col>

                <Col xs={12} sm={6}>
                  <button className="custom-btn-card w-100">
                    <svg className="custom-btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75h-4.5m4.5 1.5h-4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9.75-6c.966 0 1.75.784 1.75 1.75v1.5a1.75 1.75 0 01-1.75 1.75h-1.5A1.75 1.75 0 018.25 9.25v-1.5c0-.966.784-1.75 1.75-1.75h1.5z" />
                    </svg>
                    <span className="custom-btn-text">Hỗ trợ kỹ thuật</span>
                  </button>
                </Col>

              </Row>
            </div>

          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default LoginPage;