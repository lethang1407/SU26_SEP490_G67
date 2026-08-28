package project.be_sep490_g67.constants;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public final class ImportOrderConstants {

    private ImportOrderConstants() {}

    public static final String ORDER_STATUS_DRAFT = "DRAFT";
    public static final String ORDER_STATUS_IMPORTED = "IMPORTED";

    public static final String PAYMENT_STATUS_DEBT = "DEBT";
    public static final String PAYMENT_STATUS_DONE = "DONE";

    /**
     * Mã phiếu nhập: NH + ddMMyy + "-" + STT trong ngày (2 chữ số).
     * Ví dụ: NH210826-01, NH210826-02
     */
    public static final String ORDER_CODE_PREFIX = "NH";
    public static final int ORDER_CODE_SEQ_LENGTH = 2;

    /** Prefix mã thanh toán nợ NCC: TTN000000, TTN000001, ... */
    public static final String PAYMENT_CODE_PREFIX = "TTN";
    public static final int PAYMENT_CODE_SEQ_LENGTH = 6;

    /**
     * Mã lô: L + ddMMyy + "-" + STT trong ngày (2 chữ số).
     * Ví dụ: L210826-01, L210826-02
     */
    public static final String BATCH_CODE_LETTER = "L";
    public static final int BATCH_CODE_SEQ_LENGTH = 2;
    public static final DateTimeFormatter BATCH_CODE_DATE =
            DateTimeFormatter.ofPattern("ddMMyy");

    /** Phần ngày của mã lô, vd L210826 */
    public static String batchDayPrefix(LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();
        return BATCH_CODE_LETTER + d.format(BATCH_CODE_DATE);
    }

    /**
     * Ghép mã lô đầy đủ: L210826-01
     *
     * @param date     ngày nhập
     * @param sequence số thứ tự trong ngày (bắt đầu từ 1)
     */
    public static String formatBatchCode(LocalDate date, int sequence) {
        return batchDayPrefix(date)
                + "-"
                + String.format("%0" + BATCH_CODE_SEQ_LENGTH + "d", sequence);
    }

    /** Phần ngày của mã phiếu nhập, vd NH210826 */
    public static String orderDayPrefix(LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();
        return ORDER_CODE_PREFIX + d.format(BATCH_CODE_DATE);
    }

    /**
     * Ghép mã phiếu nhập đầy đủ: NH210826-01
     *
     * @param date     ngày tạo phiếu
     * @param sequence số thứ tự trong ngày (bắt đầu từ 1)
     */
    public static String formatOrderCode(LocalDate date, int sequence) {
        return orderDayPrefix(date)
                + "-"
                + String.format("%0" + ORDER_CODE_SEQ_LENGTH + "d", sequence);
    }
}
