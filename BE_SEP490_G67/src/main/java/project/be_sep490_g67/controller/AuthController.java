package project.be_sep490_g67.controller;

import com.nimbusds.jose.JOSEException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.*;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.AuthenticationResponse;
import project.be_sep490_g67.dto.response.IntrospectResponse;
import project.be_sep490_g67.service.AuthenticationService;
import project.be_sep490_g67.service.PasswordRestService;

import java.text.ParseException;

@RestController
@RequestMapping(ApiPath.AUTH)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AuthController {
    AuthenticationService authenticationService;
    PasswordRestService passwordRestService;

    @PostMapping("/token")
    ApiResponse<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request) {
        var result = authenticationService.authenticate(request);
        log.info("User {} authenticated successfully", request.getUsername());
        return ApiResponse.<AuthenticationResponse>builder().result(result).build();
    }

    @PostMapping("/introspect")
    ApiResponse<IntrospectResponse> authenticate(@RequestBody IntrospectRequest request)
            throws ParseException, JOSEException {
        var result = authenticationService.introspect(request);
        return ApiResponse.<IntrospectResponse>builder().result(result).build();
    }
    @PostMapping("/logout")
    ApiResponse<Void> logout(@RequestBody LogoutRequest request) throws ParseException, JOSEException {
        authenticationService.logout(request);
        return ApiResponse.<Void>builder().build();
    }
    @PostMapping("/forgot-password/initiate")
    ApiResponse<Void> initiateForgotPassword(@RequestBody ForgotPasswordInitiateRequest request) {
        passwordRestService.initiatePasswordReset(request.getPhoneNumber());
        return ApiResponse.<Void>builder().message("OTP sent successfully").build();
    }

    @PostMapping("/forgot-password/verify-otp")
    ApiResponse<Boolean> verifyForgotPasswordOtp(@RequestBody ForgotPasswordVerifyOtpRequest request) {
        boolean isValid = passwordRestService.verifyOtp(request.getPhoneNumber(), request.getOtp());
        return ApiResponse.<Boolean>builder().result(isValid).message("OTP verified successfully").build();
    }

    @PostMapping("/forgot-password/change-password")
    ApiResponse<Void> changePassword(@RequestBody ForgotPasswordChangeRequest request) {
        passwordRestService.changePassword(request.getPhoneNumber(), request.getNewPassword());
        return ApiResponse.<Void>builder().message("Password changed successfully").build();
    }
}
