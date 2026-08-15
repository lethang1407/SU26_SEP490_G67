package project.be_sep490_g67.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportSuggestRequest {
    List<Integer> productIds;
    /** Optional panel override: productId -> coverDays for this order */
    Map<Integer, Integer> coverOverrides;
}
