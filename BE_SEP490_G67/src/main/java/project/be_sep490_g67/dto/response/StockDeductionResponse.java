package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StockDeductionResponse {
    private Integer batchId;
    private Integer locationId;
    private Integer quantityDeducted;
}
