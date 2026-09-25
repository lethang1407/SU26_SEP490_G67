package project.be_sep490_g67.constants;

import java.util.Map;

public final class StorageZoneConstants {

    private static final Map<String, String> ZONE_TITLES = Map.of(
            "A", "Khu nước giải khát & sữa",
            "B", "Khu khô & gia vị",
            "C", "Khu đông lạnh & kem",
            "NH", "Khu nhập hàng",
            "RT", "Hàng đổi trả"
    );

    private StorageZoneConstants() {
    }

    public static String resolveZoneTitle(String zone) {
        if (zone == null || zone.isBlank()) {
            return "";
        }
        String normalized = zone.trim().toUpperCase();
        return ZONE_TITLES.getOrDefault(normalized, normalized);
    }

    /** Bỏ tiền tố "Kệ " của dữ liệu cũ khi trả về UI. */
    public static String normalizeDisplayTitle(String title, String zoneCode) {
        if (title != null && !title.isBlank()) {
            String cleaned = title.trim().replaceFirst("(?i)^Kệ\\s+", "").trim();
            if (!cleaned.isEmpty()) {
                return cleaned;
            }
        }
        return resolveZoneTitle(zoneCode);
    }
}
