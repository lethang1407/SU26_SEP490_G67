package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileResponse {
    Integer id;
    String fullName;
    String username;
    String phoneNumber;
    String role;
    String status;
    Instant createdAt;
}
