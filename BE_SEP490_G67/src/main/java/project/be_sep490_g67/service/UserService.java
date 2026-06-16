package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.UpdateProfileRequest;
import project.be_sep490_g67.dto.response.UserProfileResponse;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.mapper.UserMapper;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.util.PhoneNumberUtil;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserService {
    UserRepository userRepository;
    UserMapper userMapper;

    public List<User> getUsers() {
        log.info("In method get Users");
        return userRepository.findAll();
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
}
