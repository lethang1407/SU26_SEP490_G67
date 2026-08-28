package project.be_sep490_g67.enums;

/** Hành động widget mời gọi cho một dòng sản phẩm. */
public enum RestockAction {

    /** Sang màn tạo phiếu nhập, có sẵn sản phẩm này. */
    IMPORT("Nhập hàng"),

    /** Sang màn chi tiết sản phẩm để chủ cửa hàng tự xem rồi quyết. */
    VIEW_DETAIL("Xem chi tiết");

    private final String label;

    RestockAction(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
