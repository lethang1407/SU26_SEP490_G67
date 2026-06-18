package project.be_sep490_g67.utils;

import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;

import java.util.Locale;
import java.util.Set;

public final class PasswordValidator {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 64;

    private static final Set<String> WEAK_PASSWORDS = Set.of(
            "12345678",
            "123456789",
            "11111111",
            "87654321",
            "password",
            "password123",
            "abcdefgh",
            "qwertyui",
            "admin123",
            "letmein",
            "ducthang",
            "00000000"
    );

    private PasswordValidator() {}

    public static void validateNewPassword(String password, String username) {
        if (password == null || password.isBlank()) {
            throw new AppException(ErrorCode.INVALID_PASSWORD);
        }

        if (password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
            throw new AppException(ErrorCode.INVALID_PASSWORD_LENGTH);
        }

        if (!password.matches(".*[A-Za-z].*") || !password.matches(".*\\d.*")) {
            throw new AppException(ErrorCode.INVALID_PASSWORD_FORMAT);
        }

        if (username != null && !username.isBlank()) {
            String lowerPassword = password.toLowerCase(Locale.ROOT);
            String lowerUsername = username.toLowerCase(Locale.ROOT);
            if (lowerPassword.contains(lowerUsername)) {
                throw new AppException(ErrorCode.PASSWORD_CONTAINS_USERNAME);
            }
        }

        if (WEAK_PASSWORDS.contains(password.toLowerCase(Locale.ROOT))) {
            throw new AppException(ErrorCode.WEAK_PASSWORD);
        }
    }
}
