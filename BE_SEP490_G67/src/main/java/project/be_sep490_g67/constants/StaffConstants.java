package project.be_sep490_g67.constants;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class StaffConstants {

    private StaffConstants() {}

    public static final String ADMIN_ROLE_NAME = "ADMIN";

    public static final String DEFAULT_STAFF_ROLE = "staff";

    public static final Set<String> STAFF_ROLE_NAMES = Set.of(
            "staff",
            "manager"
    );

    public static final Map<String, String> ROLE_TO_POSITION = Map.of(
            "staff", "Nhân viên",
            "manager", "Quản lý"
    );

    public static final Map<String, Set<String>> POSITION_TO_ROLES = Map.of(
            "Nhân viên", Set.of("staff"),
            "Quản lý", Set.of("manager")
    );

    public static String resolvePosition(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return "Nhân viên";
        }
        return ROLE_TO_POSITION.getOrDefault(roleName.toLowerCase(Locale.ROOT), "Nhân viên");
    }
}
