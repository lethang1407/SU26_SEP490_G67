package project.be_sep490_g67.dto.request;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateExchangeExpiryRequest {

    /** null / bỏ trống = xóa HSD của lô đổi. */
    LocalDate exchangeExpiryDate;
}
