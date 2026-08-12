/**
 * Validation utilities for authentication forms
 */

/**
 * Validates Vietnamese phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || !phoneNumber.trim()) return { isValid: true, error: '' };

  // Remove spaces, dots, dashes
  const cleanedPhone = phoneNumber.replace(/[\s.\-]/g, '');

  // Check if contains only digits
  if (!/^\d+$/.test(cleanedPhone)) {
    return {
      isValid: false,
      error: 'Số điện thoại chỉ được chứa chữ số'
    };
  }

  // Check if starts with 0 and has correct length (10 digits)
  if (cleanedPhone.startsWith('0')) {
    if (cleanedPhone.length !== 10) {
      return {
        isValid: false,
        error: 'Số điện thoại phải có 10 chữ số'
      };
    }

    // Check valid Vietnamese mobile prefixes (03, 05, 07, 08, 09)
    if (!/^0(3|5|7|8|9)\d{8}$/.test(cleanedPhone)) {
      return {
        isValid: false,
        error: 'Đầu số điện thoại không hợp lệ'
      };
    }

    return { isValid: true, error: '' };
  }

  // Check if starts with +84 or 84
  if (cleanedPhone.startsWith('84')) {
    const withoutCountryCode = cleanedPhone.slice(2);
    
    if (withoutCountryCode.length !== 9) {
      return {
        isValid: false,
        error: 'Số điện thoại không đúng định dạng'
      };
    }

    // Check valid Vietnamese mobile prefixes
    if (!/^(3|5|7|8|9)\d{8}$/.test(withoutCountryCode)) {
      return {
        isValid: false,
        error: 'Đầu số điện thoại không hợp lệ'
      };
    }

    return { isValid: true, error: '' };
  }

  return {
    isValid: false,
    error: 'Số điện thoại không đúng định dạng'
  };
};

/**
 * Validates OTP code
 * @param {string} otp - OTP code to validate
 * @param {number} length - Expected OTP length (default: 6)
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateOtp = (otp, length = 6) => {
  if (!otp || otp.trim() === '') {
    return {
      isValid: false,
      error: 'Vui lòng nhập mã OTP'
    };
  }

  // Remove spaces
  const cleanedOtp = otp.replace(/\s/g, '');

  // Check if contains only digits
  if (!/^\d+$/.test(cleanedOtp)) {
    return {
      isValid: false,
      error: 'Mã OTP chỉ được chứa chữ số'
    };
  }

  // Check length
  if (cleanedOtp.length !== length) {
    return {
      isValid: false,
      error: `Mã OTP phải có ${length} chữ số`
    };
  }

  return { isValid: true, error: '' };
};

/**
 * Validates OTP array (for individual input fields)
 * @param {Array} otpArray - Array of OTP digits
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateOtpArray = (otpArray) => {
  if (!Array.isArray(otpArray)) {
    return {
      isValid: false,
      error: 'Dữ liệu OTP không hợp lệ'
    };
  }

  // Check if all fields are filled
  const hasEmptyField = otpArray.some(digit => digit === '');
  if (hasEmptyField) {
    return {
      isValid: false,
      error: 'Vui lòng nhập đủ 6 số OTP'
    };
  }

  // Check if all fields contain only digits
  const hasInvalidDigit = otpArray.some(digit => !/^\d$/.test(digit));
  if (hasInvalidDigit) {
    return {
      isValid: false,
      error: 'Mã OTP chỉ được chứa chữ số'
    };
  }

  return { isValid: true, error: '' };
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, error: string, strength: string }
 */
export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      error: 'Vui lòng nhập mật khẩu',
      strength: 'none'
    };
  }

  const rules = {
    hasMinLength: password.length >= 6,
    hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /\d/.test(password)
  };

  const passedRules = Object.values(rules).filter(Boolean).length;

  // All rules must pass for password to be valid
  if (passedRules < 3) {
    let error = 'Mật khẩu phải có: ';
    const missing = [];
    
    if (!rules.hasMinLength) missing.push('ít nhất 6 ký tự');
    if (!rules.hasUpperAndLower) missing.push('chữ hoa và chữ thường');
    if (!rules.hasNumber) missing.push('ít nhất 1 số');
    
    error += missing.join(', ');

    return {
      isValid: false,
      error,
      strength: passedRules === 1 ? 'weak' : 'medium'
    };
  }

  return {
    isValid: true,
    error: '',
    strength: 'strong'
  };
};

/**
 * Validates password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword || confirmPassword.trim() === '') {
    return {
      isValid: false,
      error: 'Vui lòng xác nhận mật khẩu'
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Mật khẩu xác nhận không khớp'
    };
  }

  return { isValid: true, error: '' };
};

/**
 * Normalizes Vietnamese phone number to international format (84xxxxxxxxx)
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string} - Normalized phone number or original if invalid
 */
export const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';

  // Remove spaces, dots, dashes, plus sign
  let cleaned = phoneNumber.replace(/[\s.\-+]/g, '');

  // Convert 0xxxxxxxxx to 84xxxxxxxxx
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '84' + cleaned.slice(1);
  }

  // Already in 84xxxxxxxxx format
  if (cleaned.startsWith('84') && cleaned.length === 11) {
    return cleaned;
  }

  // Return original if format is unexpected
  return phoneNumber;
};

/**
 * Formats phone number for display with masking
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number (e.g., "098 xxx 1234")
 */
export const formatPhoneNumberForDisplay = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Normalize first
  let normalized = phoneNumber.replace(/[\s.\-+]/g, '');
  
  // Convert 84xxxxxxxxx back to 0xxxxxxxxx for display
  if (normalized.startsWith('84') && normalized.length === 11) {
    normalized = '0' + normalized.slice(2);
  }
  
  // Mask middle digits
  if (normalized.length === 10 && normalized.startsWith('0')) {
    return normalized.slice(0, 3) + ' xxx ' + normalized.slice(-4);
  }
  
  return phoneNumber;
};