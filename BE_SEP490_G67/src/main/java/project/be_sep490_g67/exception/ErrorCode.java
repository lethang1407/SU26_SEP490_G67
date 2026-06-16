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
    USER_DEACTIVATED(1004, "Tài khoản không còn hoạt động", HttpStatus.NOT_FOUND),
    INVALID_FULL_NAME(1005, "Họ và tên không hợp lệ", HttpStatus.BAD_REQUEST),
    INVALID_PHONE_NUMBER(1006, "Số điện thoại không hợp lệ", HttpStatus.BAD_REQUEST),
    PHONE_NUMBER_EXISTED(1007, "Số điện thoại đã được sử dụng", HttpStatus.CONFLICT),
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
