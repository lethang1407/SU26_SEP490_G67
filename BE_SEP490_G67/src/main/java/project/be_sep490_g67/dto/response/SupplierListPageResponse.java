package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SupplierListPageResponse {
    List<SupplierListItemResponse> content;
    int page;
    int size;
    long totalElements;
    int totalPages;
    BigDecimal totalDebt;
}
