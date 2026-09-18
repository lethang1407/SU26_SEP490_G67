package project.be_sep490_g67.constants;

import java.util.*;

public final class WarehouseReportConstants {

    private WarehouseReportConstants() {
    }

    /** Bộ lọc loại phát sinh trên UI: nhập, xuất, bán, đổi, trả, hủy. */
    public static final String GROUP_IMPORT = "IMPORT";
    public static final String GROUP_EXPORT = "EXPORT";
    public static final String GROUP_SALE = "SALE";
    public static final String GROUP_EXCHANGE = "EXCHANGE";
    public static final String GROUP_RETURN = "RETURN";
    public static final String GROUP_CANCEL = "CANCEL";

    public static final Set<String> ALL_REPORT_TYPES = Set.of(
            "IMPORT",
            "IMPORT_RETURN_EXCHANGE_IN",
            "SALE",
            "RETURN",
            "RETURN_HOLD_IN",
            "IMPORT_RETURN_RESERVE",
            "IMPORT_RETURN_EXCHANGE_OUT",
            // IMPORT_RETURN_RESTORE không đưa vào báo cáo: chỉ là bút toán hoàn khi sửa nháp
            "CANCEL_BATCH"
    );

    private static final Map<String, List<String>> GROUP_TO_TYPES = Map.of(
            GROUP_IMPORT, List.of("IMPORT"),
            GROUP_EXPORT, List.of(
                    "SALE",
                    "IMPORT_RETURN_RESERVE",
                    "IMPORT_RETURN_EXCHANGE_OUT",
                    "CANCEL_BATCH"
            ),
            GROUP_SALE, List.of("SALE"),
            GROUP_EXCHANGE, List.of(
                    "IMPORT_RETURN_EXCHANGE_IN",
                    "IMPORT_RETURN_EXCHANGE_OUT",
                    "IMPORT_RETURN_RESERVE"
            ),
            GROUP_RETURN, List.of(
                    "RETURN",
                    "RETURN_HOLD_IN",
                    "IMPORT_RETURN_RESERVE"
            ),
            GROUP_CANCEL, List.of("CANCEL_BATCH")
    );

    /**
     * Với nhóm Đổi/Trả: movement {@code IMPORT_RETURN_RESERVE} phụ thuộc method dòng đổi/trả.
     * {@code null} = không ràng buộc method.
     */
    public static String methodConstraintForGroups(List<String> groupsOrTypes) {
        if (groupsOrTypes == null || groupsOrTypes.isEmpty()) {
            return null;
        }
        boolean wantExchange = false;
        boolean wantReturn = false;
        for (String raw : groupsOrTypes) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String key = raw.trim().toUpperCase(Locale.ROOT);
            if (GROUP_EXCHANGE.equals(key)) {
                wantExchange = true;
            } else if (GROUP_RETURN.equals(key)) {
                wantReturn = true;
            }
        }
        if (wantExchange && !wantReturn) {
            return ImportReturnConstants.METHOD_EXCHANGE;
        }
        if (wantReturn && !wantExchange) {
            return ImportReturnConstants.METHOD_RETURN;
        }
        return null;
    }

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
            // Tương thích filter cũ
            if ("EXCHANGE_RETURN".equals(key)) {
                resolved.addAll(GROUP_TO_TYPES.get(GROUP_RETURN));
                continue;
            }
            if ("SUPPLIER_RETURN".equals(key)) {
                resolved.addAll(List.of("IMPORT_RETURN_RESERVE", "IMPORT_RETURN_EXCHANGE_OUT"));
                continue;
            }
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
        return descriptionFor(movementType, null);
    }

    /**
     * @param method hình thức dòng đổi/trả ({@code EXCHANGE}/{@code RETURN}); dùng khi movement
     *               cũ vẫn là RESERVE nhưng dòng đã đổi thành Đổi (hoặc ngược lại).
     */
    public static String descriptionFor(String movementType, String method) {
        if (movementType == null) {
            return "Khác";
        }
        boolean exchangeMethod = method != null && "EXCHANGE".equalsIgnoreCase(method.trim());
        return switch (movementType) {
            case "IMPORT" -> "Nhập";
            case "IMPORT_RETURN_EXCHANGE_IN" -> "Đổi (nhập từ NCC)";
            case "SALE" -> "Bán";
            case "RETURN" -> "Trả (khách)";
            case "RETURN_HOLD_IN" -> "Trả (giữ đổi/trả)";
            case "IMPORT_RETURN_EXCHANGE_OUT" -> "Đổi (NCC)";
            case "IMPORT_RETURN_RESERVE" -> exchangeMethod ? "Đổi (NCC)" : "Trả (NCC)";
            case "IMPORT_RETURN_RESTORE" -> "Hoàn trả NCC";
            case "CANCEL_BATCH" -> "Hủy";
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

    /** Movement RESERVE cần khớp method khi lọc Đổi / Trả. */
    public static boolean matchesMethodConstraint(
            String movementType,
            String method,
            String methodConstraint
    ) {
        if (methodConstraint == null || methodConstraint.isBlank()) {
            return true;
        }
        if (!"IMPORT_RETURN_RESERVE".equals(movementType)) {
            return true;
        }
        String normalized = ImportReturnConstants.normalizeMethod(method);
        return methodConstraint.equalsIgnoreCase(normalized);
    }
}
