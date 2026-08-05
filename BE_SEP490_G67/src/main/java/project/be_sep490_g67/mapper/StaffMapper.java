package project.be_sep490_g67.mapper;

import org.springframework.stereotype.Component;
import project.be_sep490_g67.constants.StaffConstants;
import project.be_sep490_g67.dto.response.StaffDetailResponse;
import project.be_sep490_g67.dto.response.StaffListResponse;
import project.be_sep490_g67.entity.Role;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.utils.PhoneNumberUtil;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class StaffMapper {
    //mapper
    public StaffListResponse toListResponse(User user) {
        return StaffListResponse.builder()
                .id(user.getId())
                .name(user.getFullName())
                .phone(PhoneNumberUtil.formatDisplay(user.getPhoneNumber()))
                .position(resolvePositionsLabel(user.getRoles()))
                .build();
    }

    public StaffDetailResponse toDetailResponse(User user) {
        return StaffDetailResponse.builder()
                .id(user.getId())
                .name(user.getFullName())
                .phone(PhoneNumberUtil.formatDisplay(user.getPhoneNumber()))
                .position(resolvePositionsLabel(user.getRoles()))
                .username(user.getUsername())
                .roles(resolveStaffRoleNames(user.getRoles()))
                .status(user.getStatus())
                .build();
    }

    public List<String> resolveStaffRoleNames(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return List.of();
        }

        return roles.stream()
                .map(Role::getName)
                .map(name -> name.toLowerCase(Locale.ROOT))
                .filter(StaffConstants.STAFF_ROLE_NAMES::contains)
                .sorted()
                .toList();
    }

    public String resolvePositionsLabel(Set<Role> roles) {
        List<String> labels = resolveStaffRoleNames(roles).stream()
                .map(StaffConstants::resolvePosition)
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .sorted(Comparator.comparingInt(this::positionOrder))
                .toList();

        if (labels.isEmpty()) {
            return "Nhân viên";
        }

        return String.join(", ", labels);
    }

    private int positionOrder(String position) {
        return switch (position) {
            case "Thu ngân" -> 0;
            case "Kiểm kho" -> 1;
            case "Kế toán" -> 2;
            default -> 99;
        };
    }
}
