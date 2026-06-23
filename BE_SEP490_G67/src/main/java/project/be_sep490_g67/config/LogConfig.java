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

        private final UserRepository userRepository;

        @Override
        public Optional<Integer> getCurrentAuditor() {

            Authentication authentication =
                    SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return Optional.empty();
            }

            Object principal = authentication.getPrincipal();

            if (principal instanceof Jwt jwt) {

                String username = jwt.getSubject();

                return userRepository
                        .findByUsername(username)
                        .map(user -> user.getId());
            }

            return Optional.empty();
        }
    }
}