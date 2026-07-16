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
import project.be_sep490_g67.utils.PhoneNumberUtil;

import project.be_sep490_g67.service.InfobipService;

import java.io.IOException;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

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
    private static final long OTP_EXPIRATION_MINUTES = 5;
    private static final long OTP_REQUEST_COOLDOWN_MILLIS = 60 * 1000; // 1 minute cooldown

    public void initiatePasswordReset(String phoneNumber) {
        phoneNumber = PhoneNumberUtil.standardize(phoneNumber);
        String timestampKey = OTP_TIMESTAMP_PREFIX + phoneNumber;

        // Rate limiting check
        Object lastRequestTimeObj = redisTemplate.opsForValue().get(timestampKey);
        if (lastRequestTimeObj != null) {
            long lastRequestTime = Long.parseLong(String.valueOf(lastRequestTimeObj));
            if (System.currentTimeMillis() - lastRequestTime < OTP_REQUEST_COOLDOWN_MILLIS) {
                throw new AppException(ErrorCode.TOO_MANY_OTP_REQUESTS);
            }
        }

        Optional<User> userOptional = userService.findByPhoneNumber(phoneNumber);
        if (userOptional.isEmpty()) {
            throw new AppException(ErrorCode.PHONE_NUMBER_NOT_FOUND);
        }

        String otp = generateOtp();
        String otpKey = OTP_PREFIX + phoneNumber;
        redisTemplate.opsForValue().set(otpKey, otp, OTP_EXPIRATION_MINUTES, TimeUnit.MINUTES);
        redisTemplate.opsForValue().set(timestampKey, String.valueOf(System.currentTimeMillis()));

        try {
            infobipService.sendSms(phoneNumber, userOptional.get().getFullName(), otp);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        log.info("OTP {} sent to phone number {}", otp, phoneNumber);
    }

    public boolean verifyOtp(String phoneNumber, String otp) {
        phoneNumber = PhoneNumberUtil.standardize(phoneNumber);
        String otpKey = OTP_PREFIX + phoneNumber;
        String storedOtp = (String) redisTemplate.opsForValue().get(otpKey);
        if (storedOtp == null || !storedOtp.equals(otp)) {
            throw new AppException(ErrorCode.INVALID_OTP);
        }
        return true;
    }

    public void changePassword(String phoneNumber, String newPassword) {
        phoneNumber = PhoneNumberUtil.standardize(phoneNumber);
        Optional<User> userOptional = userService.findByPhoneNumber(phoneNumber);
        if (userOptional.isEmpty()) {
            throw new AppException(ErrorCode.PHONE_NUMBER_NOT_FOUND);
        }
        User user = userOptional.get();

        validatePassword(newPassword, user.getUsername(), user.getPasswordHash());

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userService.saveUser(user); // Assuming a saveUser method exists or will be added

        redisTemplate.delete(OTP_PREFIX + phoneNumber); // Clear OTP after successful password change
        redisTemplate.delete(OTP_TIMESTAMP_PREFIX + phoneNumber); // Clear rate limit entry
        log.info("Password successfully changed for user with phone number {}", phoneNumber);
    }

    private void validatePassword(String newPassword, String username, String currentPasswordHash) {
        // Rule 1: 8 to 64 characters
        if (newPassword.length() < 8 || newPassword.length() > 64) {
            throw new AppException(ErrorCode.INVALID_PASSWORD_LENGTH);
        }

        // Rule 2: At least one letter and one number
        Pattern letterPattern = Pattern.compile(".*[a-zA-Z].*");
        Pattern numberPattern = Pattern.compile(".*[0-9].*");
        if (!letterPattern.matcher(newPassword).matches() || !numberPattern.matcher(newPassword).matches()) {
            throw new AppException(ErrorCode.PASSWORD_MISSING_LETTER_OR_NUMBER);
        }

        // Rule 3: The password must not be the same as your current password
        if (passwordEncoder.matches(newPassword, currentPasswordHash)) {
            throw new AppException(ErrorCode.PASSWORD_SAME_AS_CURRENT);
        }

        // Rule 4: The password must not be the same as your username
        if (newPassword.equalsIgnoreCase(username)) {
            throw new AppException(ErrorCode.PASSWORD_SAME_AS_USERNAME);
        }

        // Rule 5: Avoid easily guessable passwords (e.g., 12345678, password)
        // This is a basic check; more sophisticated checks might use a blacklist
        if (newPassword.equals("12345678") || newPassword.equalsIgnoreCase("password")) {
            throw new AppException(ErrorCode.EASILY_GUESSABLE_PASSWORD);
        }
    }

    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000); // Generates a 6-digit OTP
        return String.valueOf(otp);
    }
}
