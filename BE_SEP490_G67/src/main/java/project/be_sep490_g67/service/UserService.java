package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.ChangePasswordRequest;
import project.be_sep490_g67.dto.request.UpdateProfileRequest;
import project.be_sep490_g67.dto.response.UserProfileResponse;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.mapper.UserMapper;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.utils.PasswordValidator;
import project.be_sep490_g67.utils.PhoneNumberUtil;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserService {
    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;

    public List<User> getUsers() {
        log.info("In method get Users");
        return userRepository.findAll();
    }

    public Optional<User> findByPhoneNumber(String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber);
    }
    
    @Transactional
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String username) {
        User user = userRepository
                .findActiveByUsernameWithRole(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return userMapper.toProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse updateMyProfile(String username, UpdateProfileRequest request) {
        User user = userRepository
                .findActiveByUsernameWithRole(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String normalizedPhone = PhoneNumberUtil.normalize(request.getPhoneNumber());
        if (!PhoneNumberUtil.isValid(normalizedPhone)) {
            throw new AppException(ErrorCode.INVALID_PHONE_NUMBER);
        }

        if (userRepository.existsByPhoneNumberAndIdNot(normalizedPhone, user.getId())) {
            throw new AppException(ErrorCode.PHONE_NUMBER_EXISTED);
        }

        user.setFullName(request.getFullName().trim());
        user.setPhoneNumber(normalizedPhone);
        user.setUpdatedAt(Instant.now());

        User savedUser = userRepository.save(user);
        return userMapper.toProfileResponse(savedUser);
    }

    @Transactional
    public void changeMyPassword(String username, ChangePasswordRequest request) {
        User user = userRepository
                .findActiveByUsernameWithRole(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.WRONG_PASSWORD);
        }

        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new AppException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.PASSWORD_SAME_AS_OLD);
        }

        PasswordValidator.validateNewPassword(request.getNewPassword(), username);

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }
}
