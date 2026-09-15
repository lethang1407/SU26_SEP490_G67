package project.be_sep490_g67.constants;

public final class ImportTrialConstants {

    private ImportTrialConstants() {}

    public static final String LINE_REGULAR = "REGULAR";
    public static final String LINE_PROMOTION = "PROMOTION";
    public static final String LINE_TRIAL = "TRIAL";

    public static final String TRIAL_OPEN = "OPEN";
    public static final String TRIAL_SETTLED = "SETTLED";

    /** Trả phần còn bán được; thu tiền phần đã bán + hỏng/mất. */
    public static final String DECISION_RETURN_REST = "PAY_SOLD_RETURN_REST";
    /** Giữ hết hàng còn lại; thu tiền cả lô nhận. */
    public static final String DECISION_KEEP_ALL = "PAY_ALL_KEEP";

    public static final String MOVEMENT_RETURN = "TRIAL_RETURN";
    public static final String MOVEMENT_UNSELLABLE = "TRIAL_UNSELLABLE";
    public static final String REFERENCE_TYPE = "IMPORT_TRIAL_SETTLEMENT";
}
