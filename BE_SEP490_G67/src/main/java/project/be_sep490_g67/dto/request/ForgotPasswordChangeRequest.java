package project.be_sep490_g67.dto.request;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ForgotPasswordChangeRequest {
    String phoneNumber;
    String newPassword;
}
