package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationTransactionResponse {
    private String time;
    private String code;
    private String category;
    private String transactionType; // 'SALES', 'DEBT_COLLECTION', 'VOUCHER_IN', 'VOUCHER_OUT', 'CASH_DROP'
    private String paymentMethod;   // 'CASH', 'BANK_TRANSFER', 'DEBT'
    private BigDecimal amount;
    private Boolean isNegative;
    private String performer;
}
