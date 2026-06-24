package project.be_sep490_g67.mapper;

import org.springframework.stereotype.Component;
import project.be_sep490_g67.constants.StaffConstants;
import project.be_sep490_g67.dto.response.StaffDetailResponse;
import project.be_sep490_g67.dto.response.StaffListResponse;
import project.be_sep490_g67.entity.Permission;
import project.be_sep490_g67.entity.Role;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.utils.PhoneNumberUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class StaffMapper {

    public StaffListResponse toListResponse(User user) {
        return StaffListResponse.builder()
                .id(user.getId())
                .name(user.getFullName())
                .phone(PhoneNumberUtil.formatDisplay(user.getPhoneNumber()))
                .position("Nhân viên")
                .build();
    }

    public StaffDetailResponse toDetailResponse(User user) {
        return StaffDetailResponse.builder()
                .id(user.getId())
                .name(user.getFullName())
                .phone(PhoneNumberUtil.formatDisplay(user.getPhoneNumber()))
                .position("Nhân viên")
                .username(user.getUsername())
                .systemRole(StaffConstants.STAFF_ROLE_NAME.toLowerCase(Locale.ROOT))
                .permissions(mapRolePermissionsToFeGroups(user.getRoles()))
                .status(user.getStatus())
                .build();
    }

    public List<String> mapRolePermissionsToFeGroups(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return List.of();
        }

        Set<String> dbCodes = roles.stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(Permission::getCode)
                .filter(code -> code != null && !code.isBlank())
                .map(code -> code.toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<String> fePermissions = new ArrayList<>();

        StaffConstants.FE_PERMISSION_TO_DB_CODES.forEach((feGroup, requiredCodes) -> {
            boolean hasGroup = requiredCodes.stream().anyMatch(dbCodes::contains);
            if (hasGroup) {
                fePermissions.add(feGroup);
            }
        });

        return fePermissions;
    }
}
