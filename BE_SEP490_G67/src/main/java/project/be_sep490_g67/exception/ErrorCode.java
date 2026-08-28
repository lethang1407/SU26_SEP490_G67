package project.be_sep490_g67.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

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
    NOT_FOUND_STORE(1016, "Không tìm thấy thông tin cửa hàng", HttpStatus.NOT_FOUND),
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
    PRODUCT_NOT_FOUND(1046, "Không tìm thấy sản phẩm", HttpStatus.NOT_FOUND),
    BARCODE_EXISTED(1047, "Mã vạch đã được sử dụng", HttpStatus.CONFLICT),
    INVALID_PRODUCT_PRICE(1048, "Giá sản phẩm không hợp lệ", HttpStatus.BAD_REQUEST),
    PARENT_PRODUCT_NOT_SELLABLE(1060,
            "Đây là nhóm hàng có nhiều biến thể, vui lòng chọn từng biến thể để nhập hoặc bán",
            HttpStatus.BAD_REQUEST),
    STORAGE_LOCATION_NOT_FOUND(1031, "Không tìm thấy vị trí kho", HttpStatus.NOT_FOUND),
    STORAGE_LOCATION_LABEL_EXISTED(1032, "Mã vị trí kho đã tồn tại", HttpStatus.CONFLICT),
    STORAGE_LOCATION_SLOT_EXISTED(1050, "Ô này đã tồn tại trên tầng trong khu", HttpStatus.CONFLICT),
    INVALID_STORAGE_LOCATION_SIZE(1051, "Kích thước ô không hợp lệ (SM, MD, LG)", HttpStatus.BAD_REQUEST),
    STORAGE_LOCATION_FULL(1054, "Ô này đã được đánh dấu đầy, không thể xếp thêm hàng", HttpStatus.BAD_REQUEST),
    STORAGE_LOCATION_EMPTY_CANNOT_MARK_FULL(1059, "Ô đang trống, không thể đánh dấu đầy", HttpStatus.BAD_REQUEST),
    STORAGE_LOCATION_NO_BATCHES_TO_MOVE(1080, "Ô nguồn không có hàng để chuyển", HttpStatus.BAD_REQUEST),
    STORAGE_ZONE_NOT_FOUND(1055, "Không tìm thấy khu", HttpStatus.NOT_FOUND),
    INVALID_STORAGE_ZONE_TYPE(1056, "Loại khu không hợp lệ (WAREHOUSE)", HttpStatus.BAD_REQUEST),
    STORAGE_RETURN_HOLD_LOCKED(1081, "Không thể thay đổi hoặc tạo thêm vị trí trong khu chứa hàng đổi trả", HttpStatus.BAD_REQUEST),
    RETURN_HOLD_LOCATION_NOT_FOUND(1082, "Chưa có khu chứa hàng đổi trả trong kho", HttpStatus.INTERNAL_SERVER_ERROR),
    SALES_ZONE_PRODUCT_BATCH_EXISTS(1057, "Sản phẩm đã có một lô trên khu bán. Mỗi SP chỉ được 1 lô trên toàn khu bán", HttpStatus.BAD_REQUEST),
    SALES_ZONE_BATCH_SPLIT(1058, "Không thể tách cùng một lô sang nhiều ô trên khu bán", HttpStatus.BAD_REQUEST),
    STOCK_BATCH_NOT_FOUND(1033, "Không tìm thấy lô hàng", HttpStatus.NOT_FOUND),
    BATCH_LOCATION_NOT_FOUND(1034, "Không tìm thấy phân bổ lô trên kệ", HttpStatus.NOT_FOUND),
    STORAGE_LOCATION_PRODUCT_MISMATCH(1035, "Ô khu kho đang chứa sản phẩm khác. Mỗi ô khu kho chỉ chứa một loại sản phẩm", HttpStatus.BAD_REQUEST),
    INSUFFICIENT_UNPLACED_QUANTITY(1036, "Số lượng xếp vượt quá số lượng lô chưa xếp kệ", HttpStatus.BAD_REQUEST),
    INSUFFICIENT_BATCH_LOCATION_QUANTITY(1037, "Số lượng chuyển vượt quá số lượng đang có trên kệ", HttpStatus.BAD_REQUEST),
    INVALID_BATCH_LOCATION_MOVE(1038, "Không thể chuyển lô về cùng một kệ", HttpStatus.BAD_REQUEST),
    IMPORT_ITEMS_EMPTY(1039, "Phiếu nhập phải có ít nhất một sản phẩm nhập hoặc một dòng đổi/trả nhà cung cấp", HttpStatus.BAD_REQUEST),
    INVALID_IMPORT_QUANTITY(1040, "Số lượng nhập phải lớn hơn 0", HttpStatus.BAD_REQUEST),
    INVALID_IMPORT_COST(1041, "Đơn giá nhập không hợp lệ", HttpStatus.BAD_REQUEST),
    INVENTORY_CHECK_NOT_FOUND(1042, "Không tìm thấy phiếu kiểm kho", HttpStatus.NOT_FOUND),
    INVENTORY_CHECK_ITEMS_EMPTY(1043, "Phiếu kiểm kho phải có ít nhất một dòng", HttpStatus.BAD_REQUEST),
    INVALID_INVENTORY_CHECK_QTY(1044, "Số lượng thực tế kiểm kho không hợp lệ", HttpStatus.BAD_REQUEST),
    INVENTORY_CHECK_DUPLICATE_LINE(1045, "Không được kiểm trùng cùng sản phẩm và lô trong một phiếu", HttpStatus.BAD_REQUEST),
    INVENTORY_CHECK_BATCH_CONFLICT(1060, "Không thể vừa kiểm tất cả lô vừa kiểm từng lô của cùng sản phẩm", HttpStatus.BAD_REQUEST),
    INVALID_CANCEL_BATCH_QTY(1061, "Số lượng hủy lô không hợp lệ", HttpStatus.BAD_REQUEST),
    BATCH_NOT_RETURNABLE(1062, "Lô này không gắn phiếu nhập, không thể trả nhà cung cấp", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_NOT_FOUND(1063, "Không tìm thấy phiếu trả hàng nhập", HttpStatus.NOT_FOUND),
    IMPORT_RETURN_NOT_DRAFT(1064, "Chỉ thao tác được trên phiếu trả nháp", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_ITEMS_EMPTY(1065, "Phiếu trả nháp chưa có dòng nào", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_DETAIL_NOT_FOUND(1066, "Không tìm thấy dòng trả hàng", HttpStatus.NOT_FOUND),
    INVALID_IMPORT_RETURN_QTY(1067, "Số lượng trả NCC không hợp lệ", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_NOT_IN_PROGRESS(1068, "Chỉ cập nhật trạng thái trên phiếu đang đổi trả", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_INVALID_LINE_STATUS(1069, "Trạng thái dòng đổi trả không hợp lệ", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_LINE_ALREADY_DONE(1070, "Dòng đổi trả đã hoàn tất, không thể thay đổi", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_INVALID_STATUS_FILTER(1071, "Bộ lọc trạng thái phiếu đổi trả không hợp lệ", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_LINE_NOT_PENDING(1072, "Dòng đổi/trả không còn đang chờ nhà cung cấp", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_LINE_SUPPLIER_MISMATCH(1073, "Dòng đổi/trả không thuộc nhà cung cấp của phiếu nhập", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_LINE_ALREADY_ATTACHED(1074, "Dòng đổi/trả đã được gắn vào phiếu nhập khác", HttpStatus.BAD_REQUEST),
    IMPORT_RETURN_REQUIRES_SUPPLIER(1075, "Chọn nhà cung cấp trước khi gắn dòng đổi/trả vào phiếu nhập", HttpStatus.BAD_REQUEST),

    INSUFFICIENT_STOCK(1029, "Không đủ tồn kho", HttpStatus.BAD_REQUEST),
    SUPPLIER_HAS_DEBT(1030, "Không thể xóa nhà cung cấp đang còn công nợ. Vui lòng thanh toán hết trước khi xóa.", HttpStatus.BAD_REQUEST),
    INVALID_IMPORT_ORDER_STATUS(1032, "Trạng thái phiếu nhập không hợp lệ", HttpStatus.BAD_REQUEST),
    INVALID_IMPORT_DISCOUNT(1033, "Giảm giá không hợp lệ", HttpStatus.BAD_REQUEST),
    INVALID_IMPORT_PAID_AMOUNT(1034, "Số tiền trả NCC không hợp lệ", HttpStatus.BAD_REQUEST),
    IMPORT_ORDER_NOT_EDITABLE(1035, "Chỉ được sửa phiếu tạm. Phiếu đã nhập hàng không thể chỉnh sửa.", HttpStatus.BAD_REQUEST),
    IMPORT_ORDER_NOT_DELETABLE(1036, "Chỉ được hủy phiếu tạm. Phiếu đã nhập hàng không thể xóa.", HttpStatus.BAD_REQUEST),
    SUPPLIER_REQUIRED_FOR_IMPORT(1037, "Vui lòng chọn nhà cung cấp trước khi hoàn thành phiếu nhập hàng.", HttpStatus.BAD_REQUEST),

    // Product / category errors (11xx)
    PRODUCT_NAME_REQUIRED(1101, "Vui lòng nhập tên sản phẩm", HttpStatus.BAD_REQUEST),
    CATEGORY_NOT_FOUND(1102, "Không tìm thấy danh mục", HttpStatus.NOT_FOUND),
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
    CATEGORY_NAME_REQUIRED(1116, "Vui lòng nhập tên danh mục", HttpStatus.BAD_REQUEST),
    CATEGORY_NAME_EXISTED(1117, "Tên danh mục đã tồn tại", HttpStatus.CONFLICT),
    IMPORT_ORDER_LINES_REQUIRED(1118, "Đơn nhập phải có ít nhất một dòng sản phẩm", HttpStatus.BAD_REQUEST),
    IMPORT_ORDER_LINE_INVALID(1119, "Dòng nhập thiếu sản phẩm, nhà cung cấp hoặc số lượng không hợp lệ", HttpStatus.BAD_REQUEST),
    PRODUCT_EXCEL_INVALID(1120, "File Excel không hợp lệ. Chỉ nhận .xlsx và đúng mẫu (SKU/Barcode, Số lượng).", HttpStatus.BAD_REQUEST),
    PRODUCT_EXCEL_FAILED(1121, "Không xử lý được file Excel", HttpStatus.INTERNAL_SERVER_ERROR),

    // Invoice errors (3xxx)
    ORDER_NOT_FOUND(3001, "Không tìm thấy đơn hàng", HttpStatus.NOT_FOUND),
    ORDER_CANCELLED(3002, "Đơn hàng đã bị hủy, không thể xuất hóa đơn", HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_EMPTY_DETAILS(3003, "Đơn hàng không có sản phẩm, không thể xuất hóa đơn", HttpStatus.UNPROCESSABLE_ENTITY),
    STORE_CONFIG_MISSING(3004, "Lỗi cấu hình hệ thống: không tìm thấy cấu hình cửa hàng", HttpStatus.INTERNAL_SERVER_ERROR),
    ORDER_TOTAL_MISMATCH(3005, "Tổng tiền đơn hàng không khớp, cần kiểm tra lại dữ liệu", HttpStatus.UNPROCESSABLE_ENTITY),
    INVOICE_ACCESS_DENIED(3006, "Bạn không có quyền truy cập hóa đơn này", HttpStatus.FORBIDDEN),
    PRODUCT_UNIT_NOT_FOUND(3007, "Không tìm thấy đơn vị sản phẩm", HttpStatus.NOT_FOUND),

    // Customer errors(4xxx)
    CUSTOMER_NOT_FOUND(4001, "Không tìm thấy khách hàng", HttpStatus.NOT_FOUND),
    ALLOW_DEBT_REQUIRED(4002, "Trạng thái cho phép nợ là bắt buộc", HttpStatus.BAD_REQUEST),
    ORDER_IS_NOT_A_DEBT_ORDER(4003, "Đơn hàng không phải là đơn hàng nợ", HttpStatus.BAD_REQUEST),
    PAYMENT_AMOUNT_EXCEEDS_REMAINING_DEBT(4004, "Số tiền thanh toán vượt quá số nợ còn lại", HttpStatus.BAD_REQUEST),
    // PRODUCT_NOT_FOUND đã có ở nhóm 1xxx (1046) từ nhánh dev — dùng lại,
    // không định nghĩa bản 3008 song song (enum không cho trùng tên).

    // Return / exchange errors (31xx)
    ORIGINAL_ORDER_NOT_FOUND(3101, "Không tìm thấy đơn hàng gốc", HttpStatus.NOT_FOUND),
    ORDER_ALREADY_RETURNED(3102, "Đơn hàng này đã được đổi trả trước đó", HttpStatus.BAD_REQUEST),
    RETURN_LINE_NOT_IN_ORDER(3103, "Sản phẩm trả lại không có trong đơn hàng gốc", HttpStatus.BAD_REQUEST),
    RETURN_LINE_AMBIGUOUS(3104, "Sản phẩm xuất hiện trên nhiều dòng của đơn hàng gốc, cần chỉ rõ dòng cần trả", HttpStatus.BAD_REQUEST),
    RETURN_QUANTITY_EXCEEDS_PURCHASED(3105, "Số lượng trả vượt quá số lượng đã mua", HttpStatus.BAD_REQUEST),
    RETURN_QUANTITY_EXCEEDS_REMAINING(3110, "Số lượng trả vượt quá số lượng còn có thể trả của dòng hàng này", HttpStatus.BAD_REQUEST),
    RETURN_WINDOW_EXPIRED(3111, "Đơn hàng đã quá thời hạn đổi trả", HttpStatus.BAD_REQUEST),
    RETURN_ORDER_HAS_OVERDUE_DEBT(3112, "Hóa đơn nợ đã quá hạn trả nợ, không thể đổi trả", HttpStatus.BAD_REQUEST),
    RETURN_PRODUCT_NOT_FOUND(3106, "Không tìm thấy sản phẩm cần trả", HttpStatus.NOT_FOUND),
    // STOCK_BATCH_NOT_FOUND đã có ở nhóm 1xxx (1033) từ nhánh dev — dùng lại,
    // không định nghĩa bản 3107 song song.
    NO_AVAILABLE_STOCK_BATCH(3108, "Không tìm thấy lô hàng khả dụng cho sản phẩm", HttpStatus.BAD_REQUEST),
    INVALID_UNIT_CONVERSION(3109, "Quy đổi đơn vị của sản phẩm không hợp lệ", HttpStatus.UNPROCESSABLE_ENTITY),
    PRODUCT_PRICE_MISSING(3113, "Sản phẩm chưa được đặt giá bán", HttpStatus.UNPROCESSABLE_ENTITY),

    // Document code errors (32xx)
    DOCUMENT_CODE_GENERATION_FAILED(3201, "Không thể cấp mã chứng từ, vui lòng thử lại", HttpStatus.INTERNAL_SERVER_ERROR),

    // Resolution / pairing errors (33xx)
    INVALID_RESOLUTION_TYPE(3301, "Hình thức xử lý không hợp lệ", HttpStatus.BAD_REQUEST),
    EXCHANGE_REQUIRES_PAIRING(3302, "Dòng hàng đổi phải được ghép cặp với sản phẩm thay thế", HttpStatus.BAD_REQUEST),
    PAIRING_NOT_ALLOWED_FOR_RESOLUTION(3303, "Hoàn tiền hoặc ghi có không được ghép cặp với sản phẩm thay thế", HttpStatus.BAD_REQUEST),
    PAIRED_ITEM_NOT_FOUND(3304, "Không tìm thấy sản phẩm thay thế được ghép cặp", HttpStatus.BAD_REQUEST),
    PAIRED_ITEM_ALREADY_USED(3305, "Một sản phẩm thay thế chỉ được ghép với một dòng hàng trả", HttpStatus.BAD_REQUEST),
    EXCHANGE_EVEN_AMOUNT_MISMATCH(3306, "Đổi ngang giá yêu cầu hai bên bằng giá, vui lòng chọn đổi có chênh lệch", HttpStatus.BAD_REQUEST),
    // 3307 (MANAGER_APPROVAL_REQUIRED) đã bỏ cùng lối phê duyệt người mang hàng — không cấp lại số này.

    // Item condition errors (34xx)
    ITEM_CONDITION_REQUIRED(3401, "Vui lòng chọn tình trạng hàng hóa cho từng dòng trả", HttpStatus.BAD_REQUEST),
    INVALID_ITEM_CONDITION(3402, "Tình trạng hàng hóa không hợp lệ", HttpStatus.BAD_REQUEST),
    PRODUCT_NOT_RETURNABLE(3403, "Sản phẩm này không được phép trả lại", HttpStatus.BAD_REQUEST),

    // Debt sale errors (41xx)
    DEBT_REQUIRES_CUSTOMER(4101, "Đơn bán nợ phải có thông tin khách hàng", HttpStatus.BAD_REQUEST),
    CUSTOMER_NOT_ALLOWED_DEBT(4102, "Khách hàng này không được phép mua nợ", HttpStatus.BAD_REQUEST),
    CUSTOMER_HAS_OVERDUE_DEBT(4103, "Khách hàng đang có đơn nợ quá hạn, không thể bán nợ thêm", HttpStatus.BAD_REQUEST),
    DEBT_PREPAID_EXCEEDS_TOTAL(4104, "Số tiền trả trước phải nhỏ hơn tổng tiền đơn hàng", HttpStatus.BAD_REQUEST),
    DEBT_DUE_DATE_REQUIRED(4105, "Đơn bán nợ phải có hạn trả nợ", HttpStatus.BAD_REQUEST),
    DEBT_DUE_DATE_IN_PAST(4106, "Hạn trả nợ phải sau thời điểm tạo đơn", HttpStatus.BAD_REQUEST),
    DEBT_PAYMENT_EXCEEDS_REMAINING(4107, "Số tiền khách trả thêm vượt quá số nợ còn lại sau khi đã cấn trừ hàng trả", HttpStatus.BAD_REQUEST),
    DEBT_ORDER_ALREADY_SETTLED(4108, "Đơn hàng này đã trả hết nợ", HttpStatus.BAD_REQUEST),
    DEBT_PAYMENT_ORDER_LIST_REQUIRED(4109, "Danh sách đơn nợ cần thanh toán không được để trống", HttpStatus.BAD_REQUEST),
    DEBT_PAYMENT_ORDERS_DIFFERENT_CUSTOMERS(4110, "Chỉ được thanh toán nhiều đơn nợ của cùng một khách hàng", HttpStatus.BAD_REQUEST),

    // Notification errors (42xx)
    NOTIFICATION_NOT_FOUND(4201, "Không tìm thấy thông báo", HttpStatus.NOT_FOUND),

    // Thanh toán chuyển khoản (43xx)
    PAYMENT_METHOD_NOT_TRANSFER(4306, "Chỉ đơn thanh toán chuyển khoản mới có nội dung chuyển khoản", HttpStatus.BAD_REQUEST),
    STORE_BANK_ACCOUNT_NOT_CONFIGURED(4311, "Cửa hàng chưa khai báo tài khoản ngân hàng nhận chuyển khoản", HttpStatus.BAD_REQUEST),
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
