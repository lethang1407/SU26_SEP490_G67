package project.be_sep490_g67.constants;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class StaffConstants {

    private StaffConstants() {}

    /** Role quản trị trong DB (bảng roles.name). */
    public static final String ADMIN_ROLE_NAME = "ADMIN";

    public static final String DEFAULT_STAFF_ROLE = "staff";

    /** Các role được gán trên form nhân viên (lowercase để so khớp FE). */
    public static final Set<String> STAFF_ROLE_NAMES = Set.of(
            "staff",
            "admin"
    );

    public static final Map<String, String> ROLE_TO_POSITION = Map.of(
            "staff", "Nhân viên",
            "admin", "Quản lý"
    );

    public static final Map<String, Set<String>> POSITION_TO_ROLES = Map.of(
            "Nhân viên", Set.of("staff"),
            "Quản lý", Set.of("admin")
    );

    public static String resolvePosition(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return "Nhân viên";
        }
        return ROLE_TO_POSITION.getOrDefault(roleName.toLowerCase(Locale.ROOT), "Nhân viên");
    }
}
