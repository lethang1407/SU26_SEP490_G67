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

    /** Prefix mã thanh toán nợ NCC: TTN000000, TTN000001, ... */
    public static final String PAYMENT_CODE_PREFIX = "TTN";
    public static final int PAYMENT_CODE_SEQ_LENGTH = 6;

    /**
     * Mã lô: L + ddMMyy + "-" + 4 số cuối mã NCC + "-" + 4 số cuối mã SP.
     * Ví dụ: L050826-0001-1244
     */
    public static final String BATCH_CODE_LETTER = "L";
    public static final DateTimeFormatter BATCH_CODE_DATE =
            DateTimeFormatter.ofPattern("ddMMyy");

    /** Phần ngày của mã lô, vd L050826 */
    public static String batchDayPrefix(LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now();
        return BATCH_CODE_LETTER + d.format(BATCH_CODE_DATE);
    }

    /**
     * Ghép mã lô đầy đủ: L050826-0001-1244
     *
     * @param date         ngày nhập
     * @param supplierCode mã NCC (vd NCC0001)
     * @param productCode  mã SP (vd SP1244 / SP000001)
     */
    public static String formatBatchCode(LocalDate date, String supplierCode, String productCode) {
        return batchDayPrefix(date)
                + "-"
                + lastFourDigits(supplierCode)
                + "-"
                + lastFourDigits(productCode);
    }

    /** Lấy 4 chữ số cuối; thiếu thì pad 0 bên trái. Không có số → 0000. */
    public static String lastFourDigits(String code) {
        if (code == null || code.isBlank()) {
            return "0000";
        }
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < code.length(); i++) {
            char c = code.charAt(i);
            if (c >= '0' && c <= '9') {
                digits.append(c);
            }
        }
        if (digits.isEmpty()) {
            return "0000";
        }
        String value = digits.toString();
        if (value.length() >= 4) {
            return value.substring(value.length() - 4);
        }
        return String.format("%4s", value).replace(' ', '0');
    }
}
