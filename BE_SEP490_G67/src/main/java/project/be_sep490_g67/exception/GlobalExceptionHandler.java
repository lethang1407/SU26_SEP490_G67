package project.be_sep490_g67.exception;

import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.response.ApiResponse;

import java.io.IOException;

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

    /**
     * Must stay ahead of the Exception catch-all below: without it, every
     * ResponseStatusException (e.g. the 404s raised by SalesOrderService when a
     * product/customer is missing) is swallowed and reported as a 500.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatusException(ResponseStatusException exception) {
        String message = exception.getReason() != null
                ? exception.getReason()
                : exception.getMessage();

        return ResponseEntity.status(exception.getStatusCode())
                .body(ApiResponse.error(exception.getStatusCode().value(), message));
    }

    /**
     * Client đã ngắt một request bất đồng bộ — thực tế là kênh SSE thông báo khi người dùng
     * đóng tab hay mất mạng. Tomcat báo lỗi, Spring dispatch vào đây.
     *
     * <p>Không có ai để trả lời: socket đã đóng. Trả {@code null} để Spring coi là đã xử lý
     * và không ghi gì. Trước đây nó rơi xuống catch-all, bị log ERROR kèm stack trace rồi
     * cố ghi JSON vào luồng {@code text/event-stream} và hỏng thêm lần nữa.
     */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public ResponseEntity<Void> handleClientDisconnected(AsyncRequestNotUsableException exception) {
        log.debug("Client đã ngắt request bất đồng bộ: {}", exception.getMessage());
        return null;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnhandledException(Exception exception,
                                                                      HttpServletResponse response) {
        // Luồng streaming (SSE) đã gửi header text/event-stream, hoặc response đã commit:
        // không thể đổi sang JSON nữa. Ghi log rồi dừng, không cố viết body.
        if (isStreamingOrCommitted(response)) {
            if (isClientAbort(exception)) {
                log.debug("Client đã ngắt luồng streaming: {}", exception.getMessage());
            } else {
                log.error("Lỗi trên response streaming/đã commit, không thể trả body", exception);
            }
            return null;
        }

        log.error("Unhandled exception", exception);

        Throwable root = exception;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String detail = root.getMessage();
        String message = (detail != null && !detail.isBlank())
                ? ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage() + ": " + detail
                : ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage();

        ApiResponse<Void> body = ApiResponse.<Void>builder()
                .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                .message(message)
                .build();

        return ResponseEntity.status(ErrorCode.UNCATEGORIZED_EXCEPTION.getStatusCode()).body(body);
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ApiResponse<Void>> handleInsufficientStock (InsufficientStockException ex) {
        return ResponseEntity.status(ErrorCode.INSUFFICIENT_STOCK.getStatusCode())
                .body(ApiResponse.error(ErrorCode.INSUFFICIENT_STOCK.getCode(), ex.getMessage()));
    }

    private boolean isStreamingOrCommitted(HttpServletResponse response) {
        if (response == null) {
            return false;
        }
        String contentType = response.getContentType();
        return response.isCommitted()
                || (contentType != null && contentType.startsWith(MediaType.TEXT_EVENT_STREAM_VALUE));
    }

    /** Ngắt kết nối từ phía client luôn mang một IOException ở đâu đó trong chuỗi cause. */
    private boolean isClientAbort(Throwable exception) {
        for (Throwable current = exception; current != null; current = current.getCause()) {
            if (current instanceof IOException) {
                return true;
            }
            if (current.getCause() == current) {
                break;
            }
        }
        return false;
    }
}
