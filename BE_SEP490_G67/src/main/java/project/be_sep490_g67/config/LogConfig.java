package project.be_sep490_g67.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

@Configuration
@RequiredArgsConstructor
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class LogConfig {

    @Bean
    public AuditorAware<Integer> auditorProvider() {
        return new AuditorAwareImpl();
    }

    @RequiredArgsConstructor
    public static class AuditorAwareImpl implements AuditorAware<Integer> {


        @Override
        public Optional<Integer> getCurrentAuditor() {

            Authentication authentication =
                    SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null
                    || !authentication.isAuthenticated()) {
                return Optional.empty();
            }

            Object principal = authentication.getPrincipal();

            if (principal instanceof Jwt jwt) {
                Number userId = jwt.getClaim("userId");

                return userId == null
                        ? Optional.empty()
                        : Optional.of(userId.intValue());
            }

            return Optional.empty();
        }
    }
}