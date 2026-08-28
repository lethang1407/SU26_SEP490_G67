package project.be_sep490_g67.constants;

import java.util.*;

public final class WarehouseReportConstants {

    private WarehouseReportConstants() {
    }

    public static final String GROUP_IMPORT = "IMPORT";
    public static final String GROUP_SALE = "SALE";
    public static final String GROUP_EXCHANGE_RETURN = "EXCHANGE_RETURN";
    public static final String GROUP_SUPPLIER_RETURN = "SUPPLIER_RETURN";
    public static final String GROUP_CANCEL = "CANCEL";

    public static final Set<String> ALL_REPORT_TYPES = Set.of(
            "IMPORT",
            "IMPORT_RETURN_EXCHANGE_IN",
            "SALE",
            "RETURN",
            "RETURN_HOLD_IN",
            "IMPORT_RETURN_RESERVE",
            "IMPORT_RETURN_RESTORE",
            "CANCEL_BATCH"
    );

    private static final Map<String, List<String>> GROUP_TO_TYPES = Map.of(
            GROUP_IMPORT, List.of("IMPORT", "IMPORT_RETURN_EXCHANGE_IN"),
            GROUP_SALE, List.of("SALE"),
            GROUP_EXCHANGE_RETURN, List.of("RETURN", "RETURN_HOLD_IN"),
            GROUP_SUPPLIER_RETURN, List.of("IMPORT_RETURN_RESERVE", "IMPORT_RETURN_RESTORE"),
            GROUP_CANCEL, List.of("CANCEL_BATCH")
    );

    public static List<String> resolveMovementTypes(List<String> groupsOrTypes) {
        if (groupsOrTypes == null || groupsOrTypes.isEmpty()) {
            return new ArrayList<>(ALL_REPORT_TYPES);
        }
        LinkedHashSet<String> resolved = new LinkedHashSet<>();
        for (String raw : groupsOrTypes) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String key = raw.trim().toUpperCase(Locale.ROOT);
            if (GROUP_TO_TYPES.containsKey(key)) {
                resolved.addAll(GROUP_TO_TYPES.get(key));
            } else if (ALL_REPORT_TYPES.contains(key)) {
                resolved.add(key);
            }
        }
        if (resolved.isEmpty()) {
            return new ArrayList<>(ALL_REPORT_TYPES);
        }
        return new ArrayList<>(resolved);
    }

    public static String descriptionFor(String movementType) {
        if (movementType == null) {
            return "Khác";
        }
        return switch (movementType) {
            case "IMPORT" -> "Nhập hàng";
            case "IMPORT_RETURN_EXCHANGE_IN" -> "Đổi nhập từ NCC";
            case "SALE" -> "Bán hàng";
            case "RETURN" -> "Trả hàng khách";
            case "RETURN_HOLD_IN" -> "Nhập giữ đổi/trả";
            case "IMPORT_RETURN_RESERVE" -> "Trả NCC";
            case "IMPORT_RETURN_RESTORE" -> "Hoàn trả NCC";
            case "CANCEL_BATCH" -> "Hủy hàng";
            default -> movementType;
        };
    }

    public static boolean isInbound(String movementType, int quantityDelta) {
        if (quantityDelta > 0) {
            return true;
        }
        if (quantityDelta < 0) {
            return false;
        }
        return switch (movementType == null ? "" : movementType) {
            case "IMPORT", "IMPORT_RETURN_EXCHANGE_IN", "RETURN", "RETURN_HOLD_IN", "IMPORT_RETURN_RESTORE" -> true;
            default -> false;
        };
    }
}
