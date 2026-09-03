package project.be_sep490_g67.enums;

/**
 * Tình trạng kho thuần tuý của một sản phẩm — chỉ mô tả còn bao nhiêu hàng, không
 * hàm ý phải nhập. Quyết định nhập nằm ở {@link RestockPriority}.
 */
public enum StockState {

    OUT_OF_STOCK("Hết hàng"),

    /** Còn hàng nhưng đã chạm hoặc xuống dưới ngưỡng tối thiểu. */
    BELOW_MIN("Dưới ngưỡng");

    private final String label;

    StockState(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
