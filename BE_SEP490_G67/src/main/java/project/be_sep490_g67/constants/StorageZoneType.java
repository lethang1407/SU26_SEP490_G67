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

    private StorageZoneType() {
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
