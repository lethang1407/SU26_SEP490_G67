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

    PRODUCT_NOT_FOUND(1100, "Không tìm thấy sản phẩm", HttpStatus.NOT_FOUND),
    PRODUCT_NAME_REQUIRED(1101, "Vui lòng nhập tên sản phẩm", HttpStatus.BAD_REQUEST),
    CATEGORY_NOT_FOUND(1102, "Không tìm thấy danh mục", HttpStatus.NOT_FOUND),
    CATEGORY_NAME_REQUIRED(1116, "Vui lòng nhập tên danh mục", HttpStatus.BAD_REQUEST),
    CATEGORY_NAME_EXISTED(1117, "Tên danh mục đã tồn tại", HttpStatus.CONFLICT),
    PRODUCT_SKU_EXISTED(1103, "Mã SKU đã tồn tại", HttpStatus.CONFLICT),
    PRODUCT_BARCODE_EXISTED(1104, "Mã vạch đã tồn tại", HttpStatus.CONFLICT),
    PRODUCT_PRICE_INVALID(1105, "Giá không hợp lệ", HttpStatus.BAD_REQUEST),
    PRODUCT_SELL_BELOW_COST(1106, "Giá bán phải lớn hơn hoặc bằng giá nhập", HttpStatus.BAD_REQUEST),
    PRODUCT_VAT_INVALID(1107, "VAT phải từ 0 đến 100", HttpStatus.BAD_REQUEST),
    PRODUCT_STATUS_INVALID(1108, "Trạng thái sản phẩm không hợp lệ", HttpStatus.BAD_REQUEST),
    PRODUCT_UNIT_BASE_INVALID(1109, "Phải có đúng một đơn vị cơ bản với hệ số 1", HttpStatus.BAD_REQUEST),
    PRODUCT_UNIT_INVALID(1110, "Đơn vị tính không hợp lệ", HttpStatus.BAD_REQUEST),
    PRODUCT_ATTRIBUTE_INVALID(1111, "Thuộc tính sản phẩm không hợp lệ", HttpStatus.BAD_REQUEST),
    PRODUCT_IMAGE_INVALID(1112, "Ảnh phải là JPG/PNG và tối đa 5MB", HttpStatus.BAD_REQUEST),
    PRODUCT_IMAGE_UPLOAD_FAILED(1113, "Tải ảnh lên Cloudinary thất bại", HttpStatus.BAD_GATEWAY),
    PRODUCT_IMAGE_NOT_FOUND(1114, "Không tìm thấy ảnh sản phẩm", HttpStatus.NOT_FOUND),
    INVALID_DATE_RANGE(1115, "Khoảng thời gian không hợp lệ", HttpStatus.BAD_REQUEST),
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
