package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.config.DynamicAuthorizationManager;
import project.be_sep490_g67.dto.request.UserPermissionUpdateRequest;
import project.be_sep490_g67.entity.ApiEndpointPermission;
import project.be_sep490_g67.entity.Permission;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.ApiEndpointPermissionRepository;
import project.be_sep490_g67.repository.PermissionRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PermissionManagementService {

    PermissionRepository permissionRepository;
    UserRepository userRepository;
    ApiEndpointPermissionRepository apiEndpointPermissionRepository;
    DynamicAuthorizationManager dynamicAuthorizationManager;

    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    public Set<String> getUserPermissions(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Set<String> result = new HashSet<>();
        if (user.getRoles() != null) {
            user.getRoles().forEach(r -> {
                if (r.getPermissions() != null) {
                    r.getPermissions().forEach(p -> {
                        if (p.getCode() != null) result.add(p.getCode());
                    });
                }
            });
        }
        if (user.getCustomPermissions() != null) {
            user.getCustomPermissions().forEach(p -> {
                if (p.getCode() != null) result.add(p.getCode());
            });
        }
        return result;
    }

    @Transactional
    public Set<String> updateUserCustomPermissions(Integer userId, UserPermissionUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Set<String> targetCodes = request.getPermissionCodes() != null ? request.getPermissionCodes() : new HashSet<>();
        List<Permission> matchingPermissions = permissionRepository.findByCodeInIgnoreCaseAndIsRemovedFalse(targetCodes);

        user.setCustomPermissions(new HashSet<>(matchingPermissions));
        userRepository.save(user);

        return getUserPermissions(userId);
    }

    public List<ApiEndpointPermission> getAllApiEndpointRules() {
        return apiEndpointPermissionRepository.findAll();
    }

    @Transactional
    public ApiEndpointPermission saveApiEndpointRule(ApiEndpointPermission rule) {
        ApiEndpointPermission saved = apiEndpointPermissionRepository.save(rule);
        dynamicAuthorizationManager.reloadRules();
        return saved;
    }

    @Transactional
    public void deleteApiEndpointRule(Integer id) {
        apiEndpointPermissionRepository.deleteById(id);
        dynamicAuthorizationManager.reloadRules();
    }
}
