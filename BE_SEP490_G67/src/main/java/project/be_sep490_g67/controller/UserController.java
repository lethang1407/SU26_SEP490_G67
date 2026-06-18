package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.ChangePasswordRequest;
import project.be_sep490_g67.dto.request.UpdateProfileRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.UserProfileResponse;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.service.UserService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.USER)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {
    UserService userService;

    @GetMapping
    ApiResponse<List<User>> getUsers() {
        return ApiResponse.<List<User>>builder()
                .result(userService.getUsers())
                .build();
    }

    @GetMapping("/me")
    ApiResponse<UserProfileResponse> getMyProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.getMyProfile(username))
                .build();
    }

    @PutMapping("/me")
    ApiResponse<UserProfileResponse> updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.updateMyProfile(username, request))
                .build();
    }

    @PostMapping("/me/change-password")
    ApiResponse<Void> changeMyPassword(@Valid @RequestBody ChangePasswordRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        userService.changeMyPassword(username, request);
        return ApiResponse.<Void>builder().build();
    }
}
