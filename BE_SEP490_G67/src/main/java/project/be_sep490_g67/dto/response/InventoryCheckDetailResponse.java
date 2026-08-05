package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InventoryCheckDetailResponse {
    Integer id;
    String code;
    String checkDate;
    String checker;
    String note;
    String generalNote;
    String status;
    String warehouse;
    String createdAt;
    String createdBy;
    List<InventoryCheckLineResponse> lines;
}
