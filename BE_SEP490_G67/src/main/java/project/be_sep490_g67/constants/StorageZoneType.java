package project.be_sep490_g67.constants;

public final class StorageZoneType {
    public static final String SALES = "SALES";
    public static final String WAREHOUSE = "WAREHOUSE";

    private StorageZoneType() {
    }

    public static boolean isValid(String type) {
        return SALES.equals(type) || WAREHOUSE.equals(type);
    }

    public static String normalize(String type) {
        if (type == null || type.isBlank()) {
            return WAREHOUSE;
        }
        return type.trim().toUpperCase();
    }
}
