package project.be_sep490_g67.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import project.be_sep490_g67.repository.UserRepository;

import java.util.Optional;

@Configuration
@RequiredArgsConstructor
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class LogConfig {

    private final UserRepository userRepository;

    @Bean
    public AuditorAware<Integer> auditorProvider() {
        return new AuditorAwareImpl(userRepository);
    }

    @RequiredArgsConstructor
    public static class AuditorAwareImpl implements AuditorAware<Integer> {

        private static final ThreadLocal<Boolean> RESOLVING_AUDITOR =
                ThreadLocal.withInitial(() -> Boolean.FALSE);

        private final UserRepository userRepository;

        @Override
        public Optional<Integer> getCurrentAuditor() {
            if (Boolean.TRUE.equals(RESOLVING_AUDITOR.get())) {
                return Optional.empty();
            }

            Authentication authentication =
                    SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return Optional.empty();
            }

            Object principal = authentication.getPrincipal();

            if (!(principal instanceof Jwt jwt)) {
                return Optional.empty();
            }

            Object userIdClaim = jwt.getClaim("userId");
            if (userIdClaim instanceof Number userId) {
                return Optional.of(userId.intValue());
            }

            String username = jwt.getSubject();
            if (username == null || username.isBlank()) {
                return Optional.empty();
            }

            RESOLVING_AUDITOR.set(true);
            try {
                return userRepository.findIdByUsername(username);
            } finally {
                RESOLVING_AUDITOR.remove();
            }
        }
    }
}
