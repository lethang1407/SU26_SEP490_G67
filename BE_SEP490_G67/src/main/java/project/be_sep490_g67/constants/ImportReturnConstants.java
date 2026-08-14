package project.be_sep490_g67.constants;

public final class ImportReturnConstants {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_COMPLETED = "COMPLETED";

    public static final String SOURCE_MANUAL = "MANUAL";
    public static final String SOURCE_INVENTORY_CHECK = "INVENTORY_CHECK";

    public static final String METHOD_RETURN = "RETURN";
    public static final String METHOD_EXCHANGE = "EXCHANGE";

    public static final String LINE_WAITING = "WAITING_SUPPLIER";
    public static final String LINE_DONE = "DONE";

    public static final String MOVEMENT_RESERVE = "IMPORT_RETURN_RESERVE";
    public static final String MOVEMENT_RESTORE = "IMPORT_RETURN_RESTORE";
    public static final String MOVEMENT_EXCHANGE_IN = "IMPORT_RETURN_EXCHANGE_IN";
    public static final String REFERENCE_TYPE = "IMPORT_RETURN";

    /** Prefix lô đổi hàng (khác lô nhập LO-NH...). */
    public static final String EXCHANGE_BATCH_PREFIX = "LO-DH";

    private ImportReturnConstants() {
    }

    public static String normalizeSource(String source) {
        if (source == null || source.isBlank()) {
            return SOURCE_MANUAL;
        }
        String normalized = source.trim().toUpperCase();
        if (SOURCE_INVENTORY_CHECK.equals(normalized)) {
            return SOURCE_INVENTORY_CHECK;
        }
        return SOURCE_MANUAL;
    }

    public static String normalizeMethod(String method) {
        if (method == null || method.isBlank()) {
            return METHOD_RETURN;
        }
        String normalized = method.trim().toUpperCase();
        if (METHOD_EXCHANGE.equals(normalized) || "DOI".equals(normalized) || "ĐỔI".equalsIgnoreCase(method.trim())) {
            return METHOD_EXCHANGE;
        }
        return METHOD_RETURN;
    }

    public static String normalizeLineStatus(String status) {
        if (status == null || status.isBlank()) {
            return LINE_WAITING;
        }
        String normalized = status.trim().toUpperCase();
        if (LINE_DONE.equals(normalized) || "DONE".equals(normalized)) {
            return LINE_DONE;
        }
        return LINE_WAITING;
    }
}
