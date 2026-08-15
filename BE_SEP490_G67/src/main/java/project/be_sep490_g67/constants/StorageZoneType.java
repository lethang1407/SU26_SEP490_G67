package project.be_sep490_g67.constants;

public final class StorageZoneType {
    public static final String SALES = "SALES";
    public static final String WAREHOUSE = "WAREHOUSE";
    /** Khu chứa hàng đổi trả từ bán hàng (1 vị trí dùng chung, không lưới tầng/ô). */
    public static final String RETURN_HOLD = "RETURN_HOLD";

    public static final String RETURN_HOLD_ZONE_CODE = "RT";
    public static final String RETURN_HOLD_LOCATION_LABEL = "RT-HOLD";

    private StorageZoneType() {
    }

    public static boolean isValid(String type) {
        return SALES.equals(type) || WAREHOUSE.equals(type) || RETURN_HOLD.equals(type);
    }

    public static boolean isAssignableZoneType(String type) {
        return SALES.equals(type) || WAREHOUSE.equals(type);
    }

    public static String normalize(String type) {
        if (type == null || type.isBlank()) {
            return WAREHOUSE;
        }
        return type.trim().toUpperCase();
    }
}
