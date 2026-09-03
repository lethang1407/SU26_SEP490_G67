package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.utils.PasswordValidator;
import project.be_sep490_g67.utils.PhoneNumberUtil;

import java.io.IOException;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PasswordRestService {
    UserService userService;
    InfobipService infobipService;
    RedisTemplate<String, Object> redisTemplate;
    PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);

    private static final String OTP_PREFIX = "otp:";
    private static final String OTP_TIMESTAMP_PREFIX = "otp_ts:";
    private static final String OTP_VERIFIED_PREFIX = "otp_verified:";
    private static final long OTP_EXPIRATION_MINUTES = 5;
    private static final long OTP_VERIFIED_EXPIRATION_MINUTES = 5;
    private static final long OTP_REQUEST_COOLDOWN_MILLIS = 60 * 1000; // 1 minute cooldown

    public void initiatePasswordReset(String rawPhoneNumber) {
        String dbPhone = PhoneNumberUtil.normalize(rawPhoneNumber);
        String smsPhone = PhoneNumberUtil.standardize(rawPhoneNumber);
        String timestampKey = OTP_TIMESTAMP_PREFIX + dbPhone;

        // Rate limiting check
        Object lastRequestTimeObj = redisTemplate.opsForValue().get(timestampKey);
        if (lastRequestTimeObj != null) {
            try {
                long lastRequestTime = Long.parseLong(String.valueOf(lastRequestTimeObj));
                if (System.currentTimeMillis() - lastRequestTime < OTP_REQUEST_COOLDOWN_MILLIS) {
                    throw new AppException(ErrorCode.TOO_MANY_OTP_REQUESTS);
                }
            } catch (NumberFormatException ignored) {
            }
        }

        // Tìm user theo định dạng lưu trong database (đầu 0)
        Optional<User> userOptional = userService.findByPhoneNumber(dbPhone);
        if (userOptional.isEmpty() || Boolean.TRUE.equals(userOptional.get().getIsRemoved())) {
            throw new AppException(ErrorCode.PHONE_NUMBER_NOT_FOUND);
        }

        String otp = generateOtp();
        String otpKey = OTP_PREFIX + dbPhone;
        redisTemplate.opsForValue().set(otpKey, otp, OTP_EXPIRATION_MINUTES, TimeUnit.MINUTES);
        redisTemplate.opsForValue().set(timestampKey, String.valueOf(System.currentTimeMillis()));

        // Gửi SMS qua Infobip bằng định dạng quốc tế (đầu 84)
        try {
            infobipService.sendSms(smsPhone, userOptional.get().getFullName(), otp);
        } catch (Exception e) {
            log.error("Failed to send OTP SMS to {}: {}", smsPhone, e.getMessage());
            // Vẫn cho phép ghi log OTP trên console để dev/tester kiểm thử khi SMS gateway bị giới hạn
            log.info("DEV_TEST_FALLBACK -> OTP for phone {} is: {}", dbPhone, otp);
        }
        log.info("OTP {} generated for phone number {}", otp, dbPhone);
    }

    public boolean verifyOtp(String rawPhoneNumber, String otp) {
        String dbPhone = PhoneNumberUtil.normalize(rawPhoneNumber);
        String otpKey = OTP_PREFIX + dbPhone;
        String storedOtp = (String) redisTemplate.opsForValue().get(otpKey);
        if (storedOtp == null || !storedOtp.equals(otp)) {
            throw new AppException(ErrorCode.INVALID_OTP);
        }

        // Đánh dấu đã xác thực OTP thành công trước khi đổi mật khẩu
        redisTemplate.opsForValue().set(OTP_VERIFIED_PREFIX + dbPhone, "true", OTP_VERIFIED_EXPIRATION_MINUTES, TimeUnit.MINUTES);
        return true;
    }

    public void changePassword(String rawPhoneNumber, String newPassword) {
        String dbPhone = PhoneNumberUtil.normalize(rawPhoneNumber);

        // Kiểm tra xem đã qua bước verify OTP chưa
        String isVerified = (String) redisTemplate.opsForValue().get(OTP_VERIFIED_PREFIX + dbPhone);
        if (isVerified == null) {
            throw new AppException(ErrorCode.INVALID_OTP);
        }

        Optional<User> userOptional = userService.findByPhoneNumber(dbPhone);
        if (userOptional.isEmpty() || Boolean.TRUE.equals(userOptional.get().getIsRemoved())) {
            throw new AppException(ErrorCode.PHONE_NUMBER_NOT_FOUND);
        }
        User user = userOptional.get();

        // Validate mật khẩu theo tiêu chuẩn hệ thống
        PasswordValidator.validateNewPassword(newPassword, user.getUsername());

        // Kiểm tra mật khẩu không trùng mật khẩu hiện tại
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new AppException(ErrorCode.PASSWORD_SAME_AS_OLD);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userService.saveUser(user);

        // Xóa sạch token và trạng thái sau khi đổi mật khẩu thành công
        redisTemplate.delete(OTP_PREFIX + dbPhone);
        redisTemplate.delete(OTP_TIMESTAMP_PREFIX + dbPhone);
        redisTemplate.delete(OTP_VERIFIED_PREFIX + dbPhone);
        log.info("Password successfully changed for user with phone number {}", dbPhone);
    }

    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000); // Generates a 6-digit OTP
        return String.valueOf(otp);
    }
}
