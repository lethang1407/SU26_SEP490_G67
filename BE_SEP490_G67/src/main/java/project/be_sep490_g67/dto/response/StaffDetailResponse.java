package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffDetailResponse {
    Integer id;
    String name;
    String phone;
    String position;
    String username;
    String systemRole;
    List<String> permissions;
    String status;
}
