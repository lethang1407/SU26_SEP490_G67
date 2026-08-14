package project.be_sep490_g67.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ReconciliationSummaryDTO {
    private LocalDate date;
    private BigDecimal openingCash;
    private BigDecimal cashSales;
    private BigDecimal cashDebtCollected;
    private BigDecimal cashRefunded;
    private BigDecimal theoreticalCash;
    
    private BigDecimal bankTransferConfirmed;
    private BigDecimal bankTransferPending;
}
