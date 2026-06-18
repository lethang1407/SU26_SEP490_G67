package project.be_sep490_g67.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import java.nio.charset.StandardCharsets;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1001, "Tài khoản hoặc mật khẩu không đúng", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1002, "You do not have permission", HttpStatus.FORBIDDEN),
    USER_NOT_EXISTED(1003, "User not existed", HttpStatus.NOT_FOUND),
    PHONE_NUMBER_NOT_FOUND(1004, "Phone number not found", HttpStatus.NOT_FOUND),
    TOO_MANY_OTP_REQUESTS(1005, "Too many OTP requests. Please try again later.", HttpStatus.TOO_MANY_REQUESTS),
    INVALID_OTP(1006, "Invalid OTP", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD_LENGTH(1007, "Password must be between 8 and 64 characters", HttpStatus.BAD_REQUEST),
    PASSWORD_MISSING_LETTER_OR_NUMBER(1008, "Password must contain at least one letter and one number", HttpStatus.BAD_REQUEST),
    PASSWORD_SAME_AS_CURRENT(1009, "New password cannot be the same as the current password", HttpStatus.BAD_REQUEST),
    PASSWORD_SAME_AS_USERNAME(1010, "New password cannot be the same as your username", HttpStatus.BAD_REQUEST),
    EASILY_GUESSABLE_PASSWORD(1011, "Password is too easily guessable", HttpStatus.BAD_REQUEST),

    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

}
