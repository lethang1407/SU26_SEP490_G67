package project.be_sep490_g67.constants;

public final class ImportOrderConstants {

    private ImportOrderConstants() {}

    public static final String ORDER_STATUS_DRAFT = "DRAFT";
    public static final String ORDER_STATUS_IMPORTED = "IMPORTED";

    public static final String PAYMENT_STATUS_DEBT = "DEBT";
    public static final String PAYMENT_STATUS_DONE = "DONE";

    /** Prefix mã phiếu nhập: NH000000, NH000001, ... */
    public static final String ORDER_CODE_PREFIX = "NH";
    public static final int ORDER_CODE_SEQ_LENGTH = 6;
}
