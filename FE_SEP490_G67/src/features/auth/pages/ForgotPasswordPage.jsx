import React, { useState } from 'react';
import { Container, Card, Form, InputGroup, Button, Row, Col, Alert } from 'react-bootstrap';
import '../../../css/LoginScreen.css';
import { useNavigate } from 'react-router-dom';
import auth from '../api/index.js';
import { validatePhoneNumber, normalizePhoneNumber } from '../utils/validation.js';

const ForgotPasswordPage = () => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhone(value);
    // Clear phone error when user types
    if (errors.phone) {
      setErrors({ ...errors, phone: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      setErrors({ phone: phoneValidation.error });
      return;
    }

    setIsLoading(true);
    setErrors({});

    // Normalize phone number before sending to API
    const normalizedPhone = normalizePhoneNumber(phone);

    auth.initiatePasswordReset({ phoneNumber: normalizedPhone })
      .then(() => {
        setIsLoading(false);
        // Store normalized phone number in sessionStorage for use in subsequent pages
        sessionStorage.setItem('resetPasswordPhone', normalizedPhone);
        setTimeout(() => {
          navigate('/verify-otp');
        }, 1000);
      })
      .catch((error) => {
        setIsLoading(false);
        console.error('Error initiating password reset:', error);
        setErrors({ _form: error.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại'});
      });
  };

  const handleBackToLogin = () => {
  
    navigate('/login');
    console.log("Quay lại màn đăng nhập");
  };

  return (
    <div className="login-wrapper">
      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <Container className="d-flex align-items-center justify-content-center min-vh-100">
        <Card className="border-1 shadow-lg rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: '440px' }}>
          <Card.Body className="p-0">
            
            <div className="text-center mb-4">
              <div 
                className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-4 mb-3 custom-shadow" 
                style={{ width: '64px', height: '64px' }}
              >
                <span className="material-symbols-outlined fs-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                  storefront
                </span>
              </div>
              <h3 className="fw-bold mb-4" style={{ color: '#191b23' }}>Đức Thắng</h3>
              
              <h4 className="fw-bold mb-2 fs-5" style={{ color: '#191b23' }}>Quên mật khẩu?</h4>
              <p className="text-muted small px-2 mb-0" style={{ lineHeight: '1.5' }}>
                Nhập số điện thoại đã đăng ký để nhận mã OTP khôi phục mật khẩu
              </p>
            </div>
            {errors._form && (
              <Alert variant="danger" className="mb-3 py-2 small">
                {errors._form}
              </Alert>
            )}
            {/* Form */}
            <Form onSubmit={handleSubmit} className="mt-4">
              
              {/* Phone Input */}
              <Form.Group className="mb-4">
                <Form.Label className="fw-medium text-muted" style={{ fontSize: '13px' }}>
                  Số điện thoại
                </Form.Label>
                <InputGroup className={`custom-input-group ${errors.phone ? 'is-invalid' : ''}`}>
                  <InputGroup.Text className="bg-white border-end-0 text-muted ps-3">
                    <span className="material-symbols-outlined fs-5">smartphone</span>
                  </InputGroup.Text>
                  <Form.Control
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={phone}
                    onChange={handlePhoneChange}
                    isInvalid={!!errors.phone}
                    className="bg-white border-start-0 ps-2 py-2 shadow-none"
                    style={{ fontSize: '14px' }}
                  />
                </InputGroup>
                {errors.phone && (
                  <Form.Text className="text-danger small ms-1">
                    {errors.phone}
                  </Form.Text>
                )}
              </Form.Group>

              {/* Submit Button*/}
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading || !phone}
                className="w-100 py-2 mb-3 rounded-3 d-flex justify-content-center align-items-center gap-2 fw-medium border-0"
                style={{ backgroundColor: '#2563eb' }}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin fs-5">progress_activity</span> 
                    Đang gửi...
                  </>
                ) : (
                  <>
                    Gửi mã OTP 
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                  </>
                )}
              </Button>

              <Button
                variant="light"
                type="button"
                onClick={handleBackToLogin}
                className="w-100 py-2 rounded-3 d-flex justify-content-center align-items-center gap-2 fw-medium border bg-white text-secondary"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                Quay lại đăng nhập
              </Button>

            </Form>

            {/* Footer Divider */}
            <hr className="my-4 border-secondary opacity-25" />

            {/* Support Link */}
            <div className="text-center">
              <span className="text-muted small">Gặp khó khăn khi khôi phục? </span>
              <a href="#" className="text-primary text-decoration-none small fw-medium" style={{ color: '#2563eb' }}>
                Liên hệ hỗ trợ
              </a>
            </div>

          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default ForgotPasswordPage;