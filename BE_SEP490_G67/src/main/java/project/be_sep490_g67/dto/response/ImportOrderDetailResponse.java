package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportOrderDetailResponse {
    Integer id;
    String orderCode;
    LocalDate receivedDate;
    String createdByName;
    Integer supplierId;
    String supplierName;
    String note;
    BigDecimal totalCost;
    String status;
    BigDecimal paidAmount;
    BigDecimal remainingDebt;
    List<ImportOrderItemResponse> items;
}
