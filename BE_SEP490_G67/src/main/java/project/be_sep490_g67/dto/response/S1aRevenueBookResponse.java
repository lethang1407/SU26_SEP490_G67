package project.be_sep490_g67.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import project.be_sep490_g67.entity.AccountingRevenueLine;
import project.be_sep490_g67.enums.RevenueClassification;
import project.be_sep490_g67.enums.SourceType;

/** Dữ liệu điện tử tương ứng các cột ngày, giao dịch và số tiền của S1a-HKD. */
public record S1aRevenueBookResponse(
        Integer taxYear,
        Integer accountingMonth,
        String taxpayerIdentity,
        String taxpayerName,
        String taxpayerAddress,
        LocalDate fromDate,
        LocalDate toDate,
        boolean sourceCompletenessVerified,
        String readiness,
        BigDecimal totalAmount,
        List<Row> rows) {

    public record Row(LocalDate postingDate, String transaction, BigDecimal amount,
                      SourceType sourceType, Integer sourceId,
                      RevenueClassification classification) {
        public static Row from(AccountingRevenueLine line) {
            String transaction = line.getDescription();
            if (transaction == null || transaction.isBlank()) {
                transaction = line.getSourceCode() != null && !line.getSourceCode().isBlank()
                        ? line.getSourceCode()
                        : line.getSourceType() + "-" + line.getSourceId();
            }
            return new Row(line.getPostingDate(), transaction, line.getSignedAmount(),
                    line.getSourceType(), line.getSourceId(), line.getClassification());
        }
    }
}
