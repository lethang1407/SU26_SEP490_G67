package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WarehouseIoReportDTO {
    LocalDate from;
    LocalDate to;
    String periodLabel;
    Integer openingQty;
    BigDecimal openingAmount;
    Integer importQty;
    BigDecimal importAmount;
    Integer exportQty;
    BigDecimal exportAmount;
    Integer closingQty;
    BigDecimal closingAmount;
    Integer totalProducts;
    Integer page;
    Integer size;
    Integer totalPages;
    List<WarehouseIoProductDTO> products;
}
