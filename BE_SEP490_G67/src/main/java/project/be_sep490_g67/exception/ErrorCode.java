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
    PRODUCT_NOT_FOUND(1046, "Không tìm thấy sản phẩm", HttpStatus.NOT_FOUND),
    BARCODE_EXISTED(1047, "Mã vạch đã được sử dụng", HttpStatus.CONFLICT),
    INVALID_PRODUCT_PRICE(1048, "Giá sản phẩm không hợp lệ", HttpStatus.BAD_REQUEST),
    STORAGE_LOCATION_NOT_FOUND(1031, "Không tìm thấy vị trí kho", HttpStatus.NOT_FOUND),
    STORAGE_LOCATION_LABEL_EXISTED(1032, "Mã vị trí kho đã tồn tại", HttpStatus.CONFLICT),
    STOCK_BATCH_NOT_FOUND(1033, "Không tìm thấy lô hàng", HttpStatus.NOT_FOUND),
    BATCH_LOCATION_NOT_FOUND(1034, "Không tìm thấy phân bổ lô trên kệ", HttpStatus.NOT_FOUND),
    STORAGE_LOCATION_PRODUCT_MISMATCH(1035, "Kệ đang chứa sản phẩm khác. Mỗi kệ chỉ chứa một loại sản phẩm", HttpStatus.BAD_REQUEST),
    INSUFFICIENT_UNPLACED_QUANTITY(1036, "Số lượng xếp vượt quá số lượng lô chưa xếp kệ", HttpStatus.BAD_REQUEST),
    INSUFFICIENT_BATCH_LOCATION_QUANTITY(1037, "Số lượng chuyển vượt quá số lượng đang có trên kệ", HttpStatus.BAD_REQUEST),
    INVALID_BATCH_LOCATION_MOVE(1038, "Không thể chuyển lô về cùng một kệ", HttpStatus.BAD_REQUEST),
    IMPORT_ITEMS_EMPTY(1039, "Phiếu nhập phải có ít nhất một dòng sản phẩm", HttpStatus.BAD_REQUEST),
    INVALID_IMPORT_QUANTITY(1040, "Số lượng nhập phải lớn hơn 0", HttpStatus.BAD_REQUEST),
    INVALID_IMPORT_COST(1041, "Đơn giá nhập không hợp lệ", HttpStatus.BAD_REQUEST),
    INVENTORY_CHECK_NOT_FOUND(1042, "Không tìm thấy phiếu kiểm kho", HttpStatus.NOT_FOUND),
    INVENTORY_CHECK_ITEMS_EMPTY(1043, "Phiếu kiểm kho phải có ít nhất một dòng", HttpStatus.BAD_REQUEST),
    INVALID_INVENTORY_CHECK_QTY(1044, "Số lượng thực tế kiểm kho không hợp lệ", HttpStatus.BAD_REQUEST),
    INVENTORY_CHECK_DUPLICATE_LINE(1045, "Không được kiểm trùng một lô tại cùng vị trí trong một phiếu", HttpStatus.BAD_REQUEST),


    // Invoice errors (3xxx)
    ORDER_NOT_FOUND(3001, "Không tìm thấy đơn hàng", HttpStatus.NOT_FOUND),
    ORDER_CANCELLED(3002, "Đơn hàng đã bị hủy, không thể xuất hóa đơn", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_EMPTY_DETAILS(3003, "Đơn hàng không có sản phẩm, không thể xuất hóa đơn", HttpStatus.UNPROCESSABLE_ENTITY),
    STORE_CONFIG_MISSING(3004, "Lỗi cấu hình hệ thống: không tìm thấy cấu hình cửa hàng", HttpStatus.INTERNAL_SERVER_ERROR),
    ORDER_TOTAL_MISMATCH(3005, "Tổng tiền đơn hàng không khớp, cần kiểm tra lại dữ liệu", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ACCESS_DENIED(3006, "Bạn không có quyền truy cập hóa đơn này", HttpStatus.FORBIDDEN),
    PRODUCT_UNIT_NOT_FOUND(3007, "Không tìm thấy đơn vị sản phẩm", HttpStatus.NOT_FOUND),
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
