package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.dto.request.UserPermissionUpdateRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.entity.ApiEndpointPermission;
import project.be_sep490_g67.entity.Permission;
import project.be_sep490_g67.service.PermissionManagementService;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PermissionManagementController {

    PermissionManagementService permissionManagementService;

    @GetMapping
    public ApiResponse<List<Permission>> getAllPermissions() {
        return ApiResponse.<List<Permission>>builder()
                .result(permissionManagementService.getAllPermissions())
                .build();
    }

    @GetMapping("/users/{userId}")
    public ApiResponse<Set<String>> getUserPermissions(@PathVariable Integer userId) {
        return ApiResponse.<Set<String>>builder()
                .result(permissionManagementService.getUserPermissions(userId))
                .build();
    }

    @PutMapping("/users/{userId}")
    public ApiResponse<Set<String>> updateUserCustomPermissions(
            @PathVariable Integer userId,
            @RequestBody UserPermissionUpdateRequest request) {
        return ApiResponse.<Set<String>>builder()
                .result(permissionManagementService.updateUserCustomPermissions(userId, request))
                .build();
    }

    @GetMapping("/api-endpoints")
    public ApiResponse<List<ApiEndpointPermission>> getAllApiEndpointRules() {
        return ApiResponse.<List<ApiEndpointPermission>>builder()
                .result(permissionManagementService.getAllApiEndpointRules())
                .build();
    }

    @PostMapping("/api-endpoints")
    public ApiResponse<ApiEndpointPermission> createApiEndpointRule(@RequestBody ApiEndpointPermission rule) {
        return ApiResponse.<ApiEndpointPermission>builder()
                .result(permissionManagementService.saveApiEndpointRule(rule))
                .build();
    }

    @PutMapping("/api-endpoints/{id}")
    public ApiResponse<ApiEndpointPermission> updateApiEndpointRule(
            @PathVariable Integer id,
            @RequestBody ApiEndpointPermission rule) {
        rule.setId(id);
        return ApiResponse.<ApiEndpointPermission>builder()
                .result(permissionManagementService.saveApiEndpointRule(rule))
                .build();
    }

    @DeleteMapping("/api-endpoints/{id}")
    public ApiResponse<Void> deleteApiEndpointRule(@PathVariable Integer id) {
        permissionManagementService.deleteApiEndpointRule(id);
        return ApiResponse.<Void>builder().build();
    }
}
