import React, { useState, useEffect } from 'react';
import { Container, Card, Form, InputGroup, Button, Alert } from 'react-bootstrap';
import '../../../css/LoginScreen.css';
import { useNavigate } from 'react-router-dom';
import auth from '../api/index.js';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Get phone number from sessionStorage on component mount
  useEffect(() => {
    const storedPhone = sessionStorage.getItem('resetPasswordPhone');
    if (!storedPhone) {
      // If no phone number, redirect back to forgot password page
      navigate('/forgot-password');
    } else {
      setPhoneNumber(storedPhone);
    }
  }, [navigate]);

  //Logic for password strength
  const rules = {
    hasMinLength: password.length >= 6,
    hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /\d/.test(password)
  };

  // 3 points = Full, 2 points = Medium, 1 point = Weak
  const strengthScore = Object.values(rules).filter(Boolean).length;
  
  // mapping: 0 rules = 0 bars, 1 rule = 1 bar, 2 rules = 2 bars, 3 rules = 4 bars (Full)
  const activeBars = strengthScore === 3 ? 4 : strengthScore;

  // Get text and color for strength status
  const getStrengthText = () => {
    if (password.length === 0) return { text: "Chưa nhập", color: "#6b7280" }; // xám
    if (strengthScore === 1) return { text: "Yếu", color: "#DC2626" }; // đỏ
    if (strengthScore === 2) return { text: "Trung bình", color: "#F59E0B" }; // cam
    if (strengthScore === 3) return { text: "Mạnh", color: "#16A34A" }; // xanh lá
    return { text: "Chưa nhập", color: "#6b7280" };
  };

  const strengthStatus = getStrengthText();
  const isFormValid = strengthScore === 3 && password === confirmPassword && password !== '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError('');

    auth.resetPassword({ phoneNumber, newPassword: password.trim() })
      .then(() => {
        setIsLoading(false);
        setSuccess(true);
        // Clear the phone number from sessionStorage
        sessionStorage.removeItem('resetPasswordPhone');
        
        // Navigate to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      })
      .catch((error) => {
        setIsLoading(false);
        const errorMessage = error.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại';
        setError(errorMessage);
        console.error('Error resetting password:', error);
      });
  };

  const handleBackToLogin = () => {
    // Clear the phone number from sessionStorage
    sessionStorage.removeItem('resetPasswordPhone');
    navigate('/login');
  };

  return (
    <div className="login-wrapper">

      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <Container className="d-flex align-items-center justify-content-center min-vh-100 py-5">
        <Card className="border-1 shadow-lg rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: '440px' }}>
          <Card.Body className="p-0">
            
            {/* Logo & Header */}
            <div className="text-center mb-4">
              <div 
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" 
                style={{ width: '56px', height: '56px', backgroundColor: '#e0eaff', color: '#2563eb' }}
              >
                <span className="material-symbols-outlined fs-2">
                  lock_reset
                </span>
              </div>
              <h4 className="fw-bold mb-2" style={{ color: '#191b23' }}>Đặt lại mật khẩu</h4>
              <p className="text-muted small px-2 mb-0" style={{ lineHeight: '1.5' }}>
                Vui lòng tạo mật khẩu mới cho tài khoản của bạn
              </p>
            </div>

            {/* Success Alert */}
            {success && (
              <Alert variant="success" className="mb-3 py-2 small">
                <div className="d-flex align-items-center gap-2">
                  <span className="material-symbols-outlined fs-5">check_circle</span>
                  Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...
                </div>
              </Alert>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="danger" className="mb-3 py-2 small">
                {error}
              </Alert>
            )}

            {/* Form */}
            <Form onSubmit={handleSubmit} className="mt-4">
              
              {/* New Password */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-medium text-muted" style={{ fontSize: '13px' }}>
                  Mật khẩu mới
                </Form.Label>
                <InputGroup className="custom-input-group">
                  <InputGroup.Text className="bg-white border-end-0 text-muted ps-3">
                    <span className="material-symbols-outlined fs-5">lock</span>
                  </InputGroup.Text>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu mới"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white border-start-0 border-end-0 px-2 py-2 shadow-none"
                    style={{ fontSize: '14px' }}
                  />
                  <InputGroup.Text 
                    className="bg-white border-start-0 cursor-pointer pe-3" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-muted hover-dark fs-5">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </InputGroup.Text>
                </InputGroup>
              </Form.Group>

              {/* Password Strength Rating Box */}
              <div className="rounded-3 p-3 mb-4" style={{ backgroundColor: '#f4f6fc' }}>
                {/* Password Strength Bars */}
                <div className="d-flex gap-1 mb-2">
                  {[1, 2, 3, 4].map(bar => (
                    <div 
                      key={bar} 
                      className="flex-grow-1 rounded-pill" 
                      style={{ 
                        height: '4px', 
                        backgroundColor: bar <= activeBars ? '#2563eb' : '#d1d5db',
                        transition: 'background-color 0.3s ease'
                      }}
                    ></div>
                  ))}
                </div>
                
                {/* Strength Status */}
                <div className="small fw-medium mb-2" style={{ color: '#4b5563' }}>
                  Độ bảo mật: <span style={{ color: strengthStatus.color, transition: 'color 0.3s ease' }}>{strengthStatus.text}</span>
                </div>
                
                {/* Checklist */}
                <ul className="list-unstyled mb-0 small" style={{ color: '#6b7280' }}>
                  <li className="d-flex align-items-center gap-2 mb-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: rules.hasMinLength ? '#2563eb' : 'inherit' }}>
                      {rules.hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    Ít nhất 6 ký tự
                  </li>
                  <li className="d-flex align-items-center gap-2 mb-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: rules.hasUpperAndLower ? '#2563eb' : 'inherit' }}>
                      {rules.hasUpperAndLower ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    Có chữ hoa & chữ thường
                  </li>
                  <li className="d-flex align-items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: rules.hasNumber ? '#2563eb' : 'inherit' }}>
                      {rules.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    Có ít nhất 1 con số
                  </li>
                </ul>
              </div>

              {/* Confirm New Password */}
              <Form.Group className="mb-4">
                <Form.Label className="fw-medium text-muted" style={{ fontSize: '13px' }}>
                  Xác nhận mật khẩu mới
                </Form.Label>
                <InputGroup className="custom-input-group">
                  <InputGroup.Text className="bg-white border-end-0 text-muted ps-3">
                    <span className="material-symbols-outlined fs-5">verified_user</span>
                  </InputGroup.Text>
                  <Form.Control
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Xác nhận lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white border-start-0 border-end-0 px-2 py-2 shadow-none"
                    style={{ fontSize: '14px' }}
                  />
                  <InputGroup.Text 
                    className="bg-white border-start-0 cursor-pointer pe-3" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <span className="material-symbols-outlined text-muted hover-dark fs-5">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </InputGroup.Text>
                </InputGroup>
                
                {/* Error Message */}
                {confirmPassword && password !== confirmPassword && (
                  <div className="text-danger small mt-1 ms-1">Mật khẩu xác nhận không khớp!</div>
                )}
              </Form.Group>

              {/* Submit Button */}
              <Button
                variant="primary"
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-100 py-2 mb-4 rounded-3 d-flex justify-content-center align-items-center gap-2 fw-medium border-0"
                style={{ backgroundColor: isFormValid ? '#004ac6' : '#2563eb' }}
              >
                {isLoading ? (
                  <><span className="material-symbols-outlined animate-spin fs-5">progress_activity</span> Đang xử lý...</>
                ) : (
                  <>
                    <span className="material-symbols-outlined fs-5">update</span> 
                    Cập nhật mật khẩu
                  </>
                )}
              </Button>

              {/* Navigation Link */}
              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={handleBackToLogin}
                  disabled={isLoading}
                  className="text-decoration-none fw-medium p-0" 
                  style={{ fontSize: '14px' }}
                >
                  Quay lại đăng nhập
                </Button>
              </div>

            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default ResetPasswordPage;