package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.StaffConstants;
import project.be_sep490_g67.dto.request.CreateStaffRequest;
import project.be_sep490_g67.dto.request.UpdateStaffRequest;
import project.be_sep490_g67.dto.response.StaffDetailResponse;
import project.be_sep490_g67.dto.response.StaffListResponse;
import project.be_sep490_g67.entity.Role;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.mapper.StaffMapper;
import project.be_sep490_g67.repository.RoleRepository;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.utils.PasswordValidator;
import project.be_sep490_g67.utils.PhoneNumberUtil;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class StaffService {
    UserRepository userRepository;
    RoleRepository roleRepository;
    StaffMapper staffMapper;
    PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<StaffListResponse> getStaffList(String keyword, String position, String sort) {
        List<User> staffMembers = userRepository.findAllActiveStaff();

        return staffMembers.stream()
                .filter(user -> matchesKeyword(user, keyword))
                .filter(user -> matchesPosition(position))
                .sorted(resolveComparator(sort))
                .map(staffMapper::toListResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StaffDetailResponse getStaffById(Integer staffId) {
        User user = userRepository
                .findActiveStaffByIdWithRoles(staffId)
                .orElseThrow(() -> new AppException(ErrorCode.STAFF_NOT_FOUND));

        if (isAdminOnly(user)) {
            throw new AppException(ErrorCode.STAFF_NOT_FOUND);
        }

        return staffMapper.toDetailResponse(user);
    }

    @Transactional
    public StaffDetailResponse createStaff(CreateStaffRequest request, String actorUsername) {
        String normalizedPhone = normalizeAndValidatePhone(request.getPhone());
        String username = request.getUsername().trim();

        if (userRepository.existsByUsernameAndIsRemovedFalse(username)) {
            throw new AppException(ErrorCode.USERNAME_EXISTED);
        }

        if (userRepository.findByPhoneNumber(normalizedPhone).isPresent()) {
            throw new AppException(ErrorCode.PHONE_NUMBER_EXISTED);
        }

        PasswordValidator.validateNewPassword(request.getPassword(), username);
        validateFePermissionGroups(request.getPermissions());

        Integer actorId = userRepository
                .findIdByUsername(actorUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setPhoneNumber(normalizedPhone);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setStatus("ACTIVE");
        user.setIsRemoved(false);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        user.setCreatedBy(actorId);
        user.setUpdatedBy(actorId);
        user.setRoles(Set.of(getStaffRole()));

        User savedUser = userRepository.save(user);
        log.info("Created staff with id={}", savedUser.getId());

        return getStaffById(savedUser.getId());
    }

    @Transactional
    public StaffDetailResponse updateStaff(Integer staffId, UpdateStaffRequest request, String actorUsername) {
        User user = userRepository
                .findActiveStaffByIdWithRoles(staffId)
                .orElseThrow(() -> new AppException(ErrorCode.STAFF_NOT_FOUND));

        if (isAdminOnly(user)) {
            throw new AppException(ErrorCode.STAFF_NOT_FOUND);
        }

        String normalizedPhone = normalizeAndValidatePhone(request.getPhone());
        String username = request.getUsername().trim();

        if (userRepository.existsByUsernameAndIdNotAndIsRemovedFalse(username, staffId)) {
            throw new AppException(ErrorCode.USERNAME_EXISTED);
        }

        if (userRepository.existsByPhoneNumberAndIdNot(normalizedPhone, staffId)) {
            throw new AppException(ErrorCode.PHONE_NUMBER_EXISTED);
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            PasswordValidator.validateNewPassword(request.getPassword(), username);
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        validateFePermissionGroups(request.getPermissions());

        Integer actorId = userRepository
                .findIdByUsername(actorUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        user.setFullName(request.getFullName().trim());
        user.setPhoneNumber(normalizedPhone);
        user.setUsername(username);
        user.setRoles(Set.of(getStaffRole()));
        user.setUpdatedAt(Instant.now());
        user.setUpdatedBy(actorId);

        userRepository.save(user);
        log.info("Updated staff with id={}", staffId);

        return getStaffById(staffId);
    }

    private Role getStaffRole() {
        return roleRepository
                .findByNameIgnoreCaseAndIsRemovedFalse(StaffConstants.STAFF_ROLE_NAME)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
    }

    private void validateFePermissionGroups(List<String> requestedPermissions) {
        for (String permission : requestedPermissions) {
            String normalized = permission.trim().toLowerCase(Locale.ROOT);
            if (!StaffConstants.FE_PERMISSION_TO_DB_CODES.containsKey(normalized)) {
                throw new AppException(ErrorCode.INVALID_PERMISSION);
            }
        }
    }

    private String normalizeAndValidatePhone(String phone) {
        String normalizedPhone = PhoneNumberUtil.normalize(phone);

        if (!PhoneNumberUtil.isValid(normalizedPhone)) {
            throw new AppException(ErrorCode.INVALID_PHONE_NUMBER);
        }

        return normalizedPhone;
    }

    private boolean matchesKeyword(User user, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }

        String normalizedKeyword = keyword.trim().toLowerCase(Locale.ROOT);
        return user.getFullName() != null
                && user.getFullName().toLowerCase(Locale.ROOT).contains(normalizedKeyword);
    }

    private boolean matchesPosition(String position) {
        if (position == null || position.isBlank() || "Tất cả vị trí".equalsIgnoreCase(position.trim())) {
            return true;
        }

        return "Nhân viên".equalsIgnoreCase(position.trim());
    }

    private Comparator<User> resolveComparator(String sort) {
        if ("name-desc".equalsIgnoreCase(sort)) {
            return Comparator.comparing(
                    User::getFullName,
                    Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER.reversed()));
        }

        return Comparator.comparing(
                User::getFullName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }

    private boolean isAdminOnly(User user) {
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            return false;
        }

        return user.getRoles().stream()
                .allMatch(role -> StaffConstants.ADMIN_ROLE_NAME.equalsIgnoreCase(role.getName()));
    }
}
