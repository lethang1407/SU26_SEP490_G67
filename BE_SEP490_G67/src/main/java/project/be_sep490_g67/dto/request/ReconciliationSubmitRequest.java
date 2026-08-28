package project.be_sep490_g67.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ReconciliationSubmitRequest {
    private LocalDate date;
    private BigDecimal actualCash;
    private BigDecimal bankActual;
    private String note;
}
