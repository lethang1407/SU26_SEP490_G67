package project.be_sep490_g67.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class ImportHistoryRowDTO {
    private Integer id;
    private String orderCode;
    private Instant importedAt;
    private Integer productId;
    private String productName;
    private String sku;
    private String supplierName;
    private Integer qty;
    private String unitName;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
    private String staffName;
    /** matched | pending | mismatch */
    private String status;
}
