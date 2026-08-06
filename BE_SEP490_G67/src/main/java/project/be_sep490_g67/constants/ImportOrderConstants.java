package project.be_sep490_g67.constants;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public final class ImportOrderConstants {

    private ImportOrderConstants() {}

    public static final String ORDER_STATUS_DRAFT = "DRAFT";
    public static final String ORDER_STATUS_IMPORTED = "IMPORTED";

    public static final String PAYMENT_STATUS_DEBT = "DEBT";
    public static final String PAYMENT_STATUS_DONE = "DONE";

    /** Prefix mã phiếu nhập: NH000000, NH000001, ... */
    public static final String ORDER_CODE_PREFIX = "NH";
    public static final int ORDER_CODE_SEQ_LENGTH = 6;

    /**
     * Prefix mã lô theo ngày: LddMMyy-01 (vd L050826-01).
     * Phần trước dấu '-' = L + ngày + tháng + 2 số năm.
     */
    public static final String BATCH_CODE_LETTER = "L";
    public static final DateTimeFormatter BATCH_CODE_DATE =
            DateTimeFormatter.ofPattern("ddMMyy");

    /** Phần ngày của mã lô, vd L050826 */
    public static String batchDayPrefix(LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();
        return BATCH_CODE_LETTER + d.format(BATCH_CODE_DATE);
    }

    /** Ghép mã lô đầy đủ: L050826-01 */
    public static String formatBatchCode(LocalDate date, int sequence) {
        return batchDayPrefix(date) + "-" + String.format("%02d", sequence);
    }
}
