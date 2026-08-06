package project.be_sep490_g67.constants;

public final class ProductConstants {

    private ProductConstants() {}

    public static final String DEFAULT_BASE_UNIT_NAME = "Cái";
    public static final String BUSINESS_STATUS_ACTIVE = "active";
    public static final String BUSINESS_STATUS_INACTIVE = "inactive";
    public static final String STATUS_FILTER_IN_STOCK = "in_stock";
    public static final String STATUS_FILTER_OUT_OF_STOCK = "out_of_stock";

    public static String formatProductCode(Integer id) {
        if (id == null) {
            return "";
        }
        return "SP" + String.format("%03d", id);
    }
}
