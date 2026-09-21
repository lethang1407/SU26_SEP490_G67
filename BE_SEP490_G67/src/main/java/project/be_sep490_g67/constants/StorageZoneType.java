package project.be_sep490_g67.constants;

public final class StorageZoneType {
    /** @deprecated Đã gộp vào WAREHOUSE; giữ hằng để tương thích đọc dữ liệu cũ. */
    @Deprecated
    public static final String SALES = "SALES";
    public static final String WAREHOUSE = "WAREHOUSE";
    /** Khu chứa hàng đổi trả từ bán hàng (1 vị trí dùng chung, không lưới tầng/ô). */
    public static final String RETURN_HOLD = "RETURN_HOLD";

    public static final String RETURN_HOLD_ZONE_CODE = "RT";
    public static final String RETURN_HOLD_LOCATION_LABEL = "RT-HOLD";

    /** Khu / vị trí nhận hàng mới nhập (chờ xếp). Zone type = WAREHOUSE nên vẫn bán được. */
    public static final String RECEIVING_ZONE_CODE = "NH";
    /** Label kỹ thuật — không dùng làm text UI. */
    public static final String RECEIVING_LOCATION_LABEL = "IMPORTED";
    public static final String RECEIVING_DISPLAY_NAME = "Khu nhập hàng";

    private StorageZoneType() {
    }

    /** Label kỹ thuật IMPORTED / NHAP-MOI → tên hiển thị cho UI. */
    public static String resolveDisplayLabel(String label) {
        if (label == null || label.isBlank()) {
            return label;
        }
        if (RECEIVING_LOCATION_LABEL.equalsIgnoreCase(label.trim())
                || "NHAP-MOI".equalsIgnoreCase(label.trim())) {
            return RECEIVING_DISPLAY_NAME;
        }
        return label;
    }

    public static boolean isValid(String type) {
        return WAREHOUSE.equals(type) || RETURN_HOLD.equals(type) || SALES.equals(type);
    }

    /** Chỉ WAREHOUSE được gán/đổi cho khu thường (không gồm RETURN_HOLD). */
    public static boolean isAssignableZoneType(String type) {
        return WAREHOUSE.equals(type);
    }

    /**
     * Chuẩn hóa loại khu: null/blank → WAREHOUSE; SALES → WAREHOUSE; còn lại upper-case.
     */
    public static String normalize(String type) {
        if (type == null || type.isBlank()) {
            return WAREHOUSE;
        }
        String normalized = type.trim().toUpperCase();
        if (SALES.equals(normalized)) {
            return WAREHOUSE;
        }
        return normalized;
    }
}
