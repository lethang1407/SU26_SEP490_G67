package project.be_sep490_g67.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import java.nio.charset.StandardCharsets;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1001, "Tài khoản hoặc mật khẩu không đúng", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1002, "Bạn không có quyền truy cập", HttpStatus.FORBIDDEN),
    USER_NOT_EXISTED(1003, "Người dùng không tồn tại", HttpStatus.NOT_FOUND),
    PHONE_NUMBER_NOT_FOUND(2004, "Số điện thoại không tìm thấy", HttpStatus.NOT_FOUND),
    TOO_MANY_OTP_REQUESTS(2005, "Quá nhiều yêu cầu OTP. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS),
    INVALID_OTP(2006, "OTP không hợp lệ", HttpStatus.BAD_REQUEST),
    PASSWORD_MISSING_LETTER_OR_NUMBER(2008, "Mật khẩu phải chứa ít nhất một chữ cái và một số", HttpStatus.BAD_REQUEST),
    PASSWORD_SAME_AS_CURRENT(2009, "Mật khẩu mới không được trùng với mật khẩu hiện tại", HttpStatus.BAD_REQUEST),
    PASSWORD_SAME_AS_USERNAME(2010, "Mật khẩu mới không được trùng với tên đăng nhập", HttpStatus.BAD_REQUEST),
    EASILY_GUESSABLE_PASSWORD(2011, "Mật khẩu quá dễ đoán", HttpStatus.BAD_REQUEST),
    USER_DEACTIVATED(1004, "Tài khoản không còn hoạt động", HttpStatus.NOT_FOUND),
    INVALID_FULL_NAME(1005, "Họ và tên không hợp lệ", HttpStatus.BAD_REQUEST),
    INVALID_PHONE_NUMBER(1006, "Số điện thoại không hợp lệ", HttpStatus.BAD_REQUEST),
    PHONE_NUMBER_EXISTED(1007, "Số điện thoại đã được sử dụng", HttpStatus.CONFLICT),
    WRONG_PASSWORD(1008, "Mật khẩu hiện tại không đúng", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1009, "Mật khẩu không hợp lệ", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD_LENGTH(1010, "Mật khẩu phải có từ 8 đến 64 ký tự", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD_FORMAT(1011, "Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số", HttpStatus.BAD_REQUEST),
    PASSWORD_SAME_AS_OLD(1012, "Mật khẩu mới không được trùng mật khẩu hiện tại", HttpStatus.BAD_REQUEST),
    PASSWORD_CONFIRM_MISMATCH(1013, "Mật khẩu xác nhận không khớp", HttpStatus.BAD_REQUEST),
    PASSWORD_CONTAINS_USERNAME(1014, "Mật khẩu không được trùng với tên đăng nhập", HttpStatus.BAD_REQUEST),
    WEAK_PASSWORD(1015, "Mật khẩu quá phổ biến, vui lòng chọn mật khẩu khác", HttpStatus.BAD_REQUEST),
    NOT_FOUND_STORE(1016, "Không tìm thấy thông tin cửa hàng",  HttpStatus.NOT_FOUND),
    EXISTED_SUPPLIER(1017, "Nhà cung cấp đã tồn tại", HttpStatus.CONFLICT),
    NOT_FOUND_CATEGORY(1018, "Không tìm thấy danh mục", HttpStatus.NOT_FOUND),
    CATEGORY_ALREADY_EXISTS(1019, "Danh mục đã tồn tại", HttpStatus.CONFLICT),
    USERNAME_EXISTED(1020, "Tên đăng nhập đã được sử dụng", HttpStatus.CONFLICT),
    ROLE_NOT_FOUND(1021, "Vai trò hệ thống không tồn tại", HttpStatus.BAD_REQUEST),
    INVALID_PERMISSION(1022, "Quyền truy cập không hợp lệ", HttpStatus.BAD_REQUEST),
    STAFF_NOT_FOUND(1023, "Không tìm thấy thông tin nhân viên", HttpStatus.NOT_FOUND),
    NOT_FOUND_SUPPLIER(1024, "Không tìm thấy nhà cung cấp", HttpStatus.NOT_FOUND),
    NOT_FOUND_IMPORT_ORDER(1025, "Không tìm thấy đơn nhập hàng", HttpStatus.NOT_FOUND),
    INVALID_PAYMENT_AMOUNT(1026, "Số tiền thanh toán không hợp lệ", HttpStatus.BAD_REQUEST),
    PAYMENT_EXCEEDS_DEBT(1027, "Số tiền vượt quá số nợ còn lại của đơn hàng", HttpStatus.BAD_REQUEST),
    CUSTOMER_NOT_FOUND(1028, "Không tìm thấy khách hàng", HttpStatus.NOT_FOUND),
    INSUFFICIENT_STOCK(1029, "Không đủ tồn kho", HttpStatus.BAD_REQUEST),

    // Invoice errors (3xxx)
    ORDER_NOT_FOUND(3001, "Không tìm thấy đơn hàng", HttpStatus.NOT_FOUND),
    ORDER_CANCELLED(3002, "Đơn hàng đã bị hủy, không thể xuất hóa đơn", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_EMPTY_DETAILS(3003, "Đơn hàng không có sản phẩm, không thể xuất hóa đơn", HttpStatus.UNPROCESSABLE_ENTITY),
    STORE_CONFIG_MISSING(3004, "Lỗi cấu hình hệ thống: không tìm thấy cấu hình cửa hàng", HttpStatus.INTERNAL_SERVER_ERROR),
    ORDER_TOTAL_MISMATCH(3005, "Tổng tiền đơn hàng không khớp, cần kiểm tra lại dữ liệu", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ACCESS_DENIED(3006, "Bạn không có quyền truy cập hóa đơn này", HttpStatus.FORBIDDEN),
    PRODUCT_UNIT_NOT_FOUND(3007, "Không tìm thấy đơn vị sản phẩm", HttpStatus.NOT_FOUND),
    PRODUCT_NOT_FOUND(3008, "Không tìm thấy sản phẩm", HttpStatus.NOT_FOUND),

    // Return / exchange errors (31xx)
    ORIGINAL_ORDER_NOT_FOUND(3101, "Không tìm thấy đơn hàng gốc", HttpStatus.NOT_FOUND),
    ORDER_ALREADY_RETURNED(3102, "Đơn hàng này đã được đổi trả trước đó", HttpStatus.BAD_REQUEST),
    RETURN_LINE_NOT_IN_ORDER(3103, "Sản phẩm trả lại không có trong đơn hàng gốc", HttpStatus.BAD_REQUEST),
    RETURN_LINE_AMBIGUOUS(3104, "Sản phẩm xuất hiện trên nhiều dòng của đơn hàng gốc, cần chỉ rõ dòng cần trả", HttpStatus.BAD_REQUEST),
    RETURN_QUANTITY_EXCEEDS_PURCHASED(3105, "Số lượng trả vượt quá số lượng đã mua", HttpStatus.BAD_REQUEST),
    RETURN_QUANTITY_EXCEEDS_REMAINING(3110, "Số lượng trả vượt quá số lượng còn có thể trả của dòng hàng này", HttpStatus.BAD_REQUEST),
    RETURN_WINDOW_EXPIRED(3111, "Đơn hàng đã quá thời hạn đổi trả", HttpStatus.BAD_REQUEST),
    RETURN_PRODUCT_NOT_FOUND(3106, "Không tìm thấy sản phẩm cần trả", HttpStatus.NOT_FOUND),
    STOCK_BATCH_NOT_FOUND(3107, "Không tìm thấy lô hàng", HttpStatus.NOT_FOUND),
    NO_AVAILABLE_STOCK_BATCH(3108, "Không tìm thấy lô hàng khả dụng cho sản phẩm", HttpStatus.BAD_REQUEST),
    INVALID_UNIT_CONVERSION(3109, "Quy đổi đơn vị của sản phẩm không hợp lệ", HttpStatus.UNPROCESSABLE_ENTITY),

    // Document code errors (32xx)
    DOCUMENT_CODE_GENERATION_FAILED(3201, "Không thể cấp mã chứng từ, vui lòng thử lại", HttpStatus.INTERNAL_SERVER_ERROR),

    // Resolution / pairing errors (33xx)
    INVALID_RESOLUTION_TYPE(3301, "Hình thức xử lý không hợp lệ", HttpStatus.BAD_REQUEST),
    EXCHANGE_REQUIRES_PAIRING(3302, "Dòng hàng đổi phải được ghép cặp với sản phẩm thay thế", HttpStatus.BAD_REQUEST),
    PAIRING_NOT_ALLOWED_FOR_RESOLUTION(3303, "Hoàn tiền hoặc ghi có không được ghép cặp với sản phẩm thay thế", HttpStatus.BAD_REQUEST),
    PAIRED_ITEM_NOT_FOUND(3304, "Không tìm thấy sản phẩm thay thế được ghép cặp", HttpStatus.BAD_REQUEST),
    PAIRED_ITEM_ALREADY_USED(3305, "Một sản phẩm thay thế chỉ được ghép với một dòng hàng trả", HttpStatus.BAD_REQUEST),
    EXCHANGE_EVEN_AMOUNT_MISMATCH(3306, "Đổi ngang giá yêu cầu hai bên bằng giá, vui lòng chọn đổi có chênh lệch", HttpStatus.BAD_REQUEST),
    MANAGER_APPROVAL_REQUIRED(3307, "Hoàn tiền mặt cho người không đứng tên hóa đơn cần quản lý phê duyệt", HttpStatus.FORBIDDEN),

    // Item condition errors (34xx)
    ITEM_CONDITION_REQUIRED(3401, "Vui lòng chọn tình trạng hàng hóa cho từng dòng trả", HttpStatus.BAD_REQUEST),
    INVALID_ITEM_CONDITION(3402, "Tình trạng hàng hóa không hợp lệ", HttpStatus.BAD_REQUEST),
    PRODUCT_NOT_RETURNABLE(3403, "Sản phẩm này không được phép trả lại", HttpStatus.BAD_REQUEST),
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
