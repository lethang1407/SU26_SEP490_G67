package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateCustomerUnstableDebtRequest {

    @NotNull(message = "Trạng thái kiểm tra công nợ không được để trống")
    Boolean isCheckUnstableDebt;
}
