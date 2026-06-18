package project.be_sep490_g67.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import project.be_sep490_g67.dto.response.ApiResponse;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException exception) {
        ErrorCode errorCode = exception.getErrorCode();

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();

        return ResponseEntity.status(errorCode.getStatusCode()).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException exception) {
        FieldError fieldError = exception.getBindingResult().getFieldError();

        String message = fieldError != null && fieldError.getDefaultMessage() != null
                ? fieldError.getDefaultMessage()
                : ErrorCode.INVALID_FULL_NAME.getMessage();

        int code = fieldError != null && "phoneNumber".equals(fieldError.getField())
                ? ErrorCode.INVALID_PHONE_NUMBER.getCode()
                : ErrorCode.INVALID_FULL_NAME.getCode();

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .code(code)
                .message(message)
                .build();

        return ResponseEntity.badRequest().body(response);
    }
    
}
