package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import project.be_sep490_g67.enums.DebtOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtOrderResponse {
    private Integer id;
    private Integer customerId;
    private String customerName;
    private Boolean isCheckDebtUnstable;
    private Integer orderId;
    private String orderCode;
    private Instant orderDate;
    private Instant dueDate;
    private BigDecimal totalAmount;
    private BigDecimal amountPaid;
    private BigDecimal amountRemaining;
    private DebtOrderStatus status;
    private String createdBy;
}