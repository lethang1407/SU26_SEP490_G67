package project.be_sep490_g67.constants;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class StaffConstants {

    private StaffConstants() {}

    public static final String ADMIN_ROLE_NAME = "ADMIN";
    public static final String STAFF_ROLE_NAME = "STAFF";

    /** Vị trí công việc trên UI (không phải role trong DB). */
    public static final Set<String> JOB_TITLES = Set.of(
            "pos",
            "warehouse",
            "accountant",
            "cashier"
    );

    public static final Map<String, String> JOB_TITLE_TO_POSITION = Map.of(
            "pos", "Thu ngân",
            "cashier", "Thu ngân",
            "warehouse", "Kiểm kho",
            "accountant", "Kế toán"
    );

    public static final Map<String, Set<String>> POSITION_TO_JOB_TITLES = Map.of(
            "Thu ngân", Set.of("pos", "cashier"),
            "Kiểm kho", Set.of("warehouse"),
            "Kế toán", Set.of("accountant")
    );

    /**
     * Map nhóm quyền trên FE sang mã permission trong DB.
     * Một nhóm được coi là có nếu role STAFF sở hữu ít nhất một permission tương ứng.
     */
    public static final Map<String, Set<String>> FE_PERMISSION_TO_DB_CODES = Map.of(
            "pos", Set.of("ORDER:CREATE", "ORDER:READ", "ORDER:RETURN", "CUSTOMER:READ"),
            "products", Set.of("PRODUCT:READ", "PRODUCT:CREATE", "PRODUCT:UPDATE"),
            "warehouse", Set.of("INVENTORY:READ", "INVENTORY:IMPORT", "INVENTORY:ADJUST"),
            "reports", Set.of("REPORT:SALES", "REPORT:INVENTORY", "REPORT:ORDER")
    );

    public static String resolvePosition(String jobTitle) {
        if (jobTitle == null || jobTitle.isBlank()) {
            return "Nhân viên";
        }
        return JOB_TITLE_TO_POSITION.getOrDefault(jobTitle.toLowerCase(Locale.ROOT), "Nhân viên");
    }
}
