import React, { useState, useRef, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import '../../../css/LoginScreen.css';
import { useNavigate } from 'react-router-dom';
import auth from '../api/index.js';
import { validateOtpArray, formatPhoneNumberForDisplay } from '../utils/validation.js';

const VerifyOtpPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();
  
  // useRef for storing references to the 6 input fields and focus on them programmatically
  const inputRefs = useRef([]);

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

  // Handle change for each OTP input field
  const handleChange = (index, e) => {
    const value = e.target.value;
    // Just allow digits, ignore other characters
    if (value && isNaN(value)) return;

    const newOtp = [...otp];
    // Only take the last digit entered in case user pastes more than one character
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Clear error when user starts typing
    if (error) {
      setError('');
    }

    // If the current input is filled, move focus to the next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace to move focus back to the previous input
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      //  Move focus to the previous input if current is empty
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle paste event to fill multiple OTP fields
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return; // Ignore if pasted data is not all digits

    const pastedArray = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(pastedArray);
    
    // Focus on the next empty input after pasting
    const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
    inputRefs.current[focusIndex].focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate OTP array
    const otpValidation = validateOtpArray(otp);
    if (!otpValidation.isValid) {
      setError(otpValidation.error);
      return;
    }

    const otpCode = otp.join('');
    
    setIsLoading(true);
    setError('');

    auth.verifyOtp({ phoneNumber, otp: otpCode })
      .then(() => {
        setIsLoading(false);
        // Navigate to reset password page
        navigate('/reset-password');
      })
      .catch((error) => {
        setIsLoading(false);
        const errorMessage = error.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn';
        setError(errorMessage);
        console.error('Error verifying OTP:', error);
      });
  };

  const handleResendOtp = () => {
    setResendLoading(true);
    setError('');
    
    auth.initiatePasswordReset({ phoneNumber })
      .then(() => {
        setResendLoading(false);
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        // Focus on first input
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
        // Show success message (you can use a toast notification instead)
        alert('Mã OTP mới đã được gửi đến số điện thoại của bạn');
      })
      .catch((error) => {
        setResendLoading(false);
        const errorMessage = error.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại';
        setError(errorMessage);
        console.error('Error resending OTP:', error);
      });
  };


  return (
    <div className="login-wrapper">
      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <Container className="d-flex align-items-center justify-content-center min-vh-100">
        <Card className="border-1 shadow-lg rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: '440px' }}>
          <Card.Body className="p-0 text-center">
            
            {/* Icon */}
            <div 
              className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-3 custom-shadow" 
              style={{ width: '56px', height: '56px' }}
            >
              <span className="material-symbols-outlined fs-2" style={{ fontVariationSettings: "'FILL' 1" }}>
                vibration 
              </span>
            </div>
            
            {/* Title */}
            <h4 className="fw-bold mb-2" style={{ color: '#191b23' }}>Xác thực OTP</h4>
            
            {/* Description */}
            <p className="text-muted small px-3 mb-4" style={{ lineHeight: '1.5' }}>
              Mã xác thực đã được gửi đến số điện thoại {formatPhoneNumberForDisplay(phoneNumber)}. Vui lòng nhập mã để tiếp tục.
            </p>

            {/* Error Alert */}
            {error && (
              <Alert variant="danger" className="mb-3 py-2 small">
                {error}
              </Alert>
            )}

            {/* OTP Form */}
            <Form onSubmit={handleSubmit}>
              
              {/* 6 Ô nhập OTP */}
              <div className="d-flex justify-content-between mb-4 px-1 gap-2">
                {otp.map((digit, index) => (
                  <Form.Control
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    ref={(el) => (inputRefs.current[index] = el)}
                    onChange={(e) => handleChange(index, e)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="otp-input shadow-none"
                  />
                ))}
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
                className="w-100 py-2 mb-3 rounded-3 fw-medium border-0"
                style={{ backgroundColor: '#2563eb' }}
              >
                {isLoading ? (
                  <><span className="material-symbols-outlined animate-spin align-middle me-2 fs-5">progress_activity</span>Đang xử lý...</>
                ) : (
                  "Xác nhận"
                )}
              </Button>

              {/* Resend Link */}
              <Button 
                variant="link" 
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="text-decoration-none small fw-medium" 
                style={{ color: '#2563eb' }}
              >
                {resendLoading ? 'Đang gửi...' : 'Gửi lại mã'}
              </Button>

            </Form>

          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default VerifyOtpPage;