package project.be_sep490_g67.constants;

import java.util.Set;

public final class StorageLocationConstants {

    private StorageLocationConstants() {
    }

    public static final String SIZE_SM = "SM";
    public static final String SIZE_MD = "MD";
    public static final String SIZE_LG = "LG";

    public static final Set<String> ALLOWED_SIZES = Set.of(SIZE_SM, SIZE_MD, SIZE_LG);

    public static String normalizeSize(String size) {
        if (size == null || size.isBlank()) {
            return SIZE_MD;
        }
        return size.trim().toUpperCase();
    }

    public static boolean isValidSize(String size) {
        return ALLOWED_SIZES.contains(normalizeSize(size));
    }

    /** Mã vị trí: A-T1-O3 */
    public static String buildLabel(String zone, String shelf, String bin) {
        return zone.trim().toUpperCase() + "-T" + shelf.trim() + "-O" + bin.trim();
    }
}
