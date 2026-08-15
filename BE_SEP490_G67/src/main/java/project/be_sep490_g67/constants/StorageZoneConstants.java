package project.be_sep490_g67.constants;

import java.util.Map;

public final class StorageZoneConstants {

    private static final Map<String, String> ZONE_TITLES = Map.of(
            "A", "Khu nước giải khát & sữa",
            "B", "Khu khô & gia vị",
            "C", "Khu đông lạnh & kem"
    );

    private StorageZoneConstants() {
    }

    public static String resolveZoneTitle(String zone) {
        if (zone == null || zone.isBlank()) {
            return "";
        }
        String normalized = zone.trim().toUpperCase();
        return ZONE_TITLES.getOrDefault(normalized, "Kệ " + normalized);
    }
}
