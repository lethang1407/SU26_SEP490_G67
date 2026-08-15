package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateStaffRequest;
import project.be_sep490_g67.dto.request.UpdateStaffRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.StaffDetailResponse;
import project.be_sep490_g67.dto.response.StaffListResponse;
import project.be_sep490_g67.service.StaffService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.STAFF)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffController {
    StaffService staffService;

    @GetMapping
    ApiResponse<List<StaffListResponse>> getStaffList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String position,
            @RequestParam(required = false, defaultValue = "name-asc") String sort) {
        return ApiResponse.<List<StaffListResponse>>builder()
                .result(staffService.getStaffList(keyword, position, sort))
                .build();
    }

    @GetMapping("/{staffId}")
    ApiResponse<StaffDetailResponse> getStaffById(@PathVariable Integer staffId) {
        return ApiResponse.<StaffDetailResponse>builder()
                .result(staffService.getStaffById(staffId))
                .build();
    }

    @PostMapping
    ApiResponse<StaffDetailResponse> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.<StaffDetailResponse>builder()
                .result(staffService.createStaff(request, username))
                .message("Tạo nhân viên thành công")
                .build();
    }

    @PutMapping("/{staffId}")
    ApiResponse<StaffDetailResponse> updateStaff(
            @PathVariable Integer staffId,
            @Valid @RequestBody UpdateStaffRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.<StaffDetailResponse>builder()
                .result(staffService.updateStaff(staffId, request, username))
                .message("Cập nhật nhân viên thành công")
                .build();
    }
}
