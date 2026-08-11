package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportReturnListItemResponse {

    Integer id;
    String returnCode;
    String status;
    String source;
    Integer itemCount;
    Integer totalQuantity;
    BigDecimal totalRefund;
    String note;
    String createdAt;
    String createdByName;
}
