package project.be_sep490_g67.config;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import project.be_sep490_g67.entity.ApiEndpointPermission;
import project.be_sep490_g67.repository.ApiEndpointPermissionRepository;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Supplier;

@Component
public class DynamicAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    @Autowired
    private ApiEndpointPermissionRepository apiEndpointPermissionRepository;

    private final List<ApiEndpointPermission> cachedRules = new CopyOnWriteArrayList<>();
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @PostConstruct
    public void initCache() {
        reloadRules();
    }

    public synchronized void reloadRules() {
        try {
            List<ApiEndpointPermission> activeRules = apiEndpointPermissionRepository.findByIsActiveTrue();
            cachedRules.clear();
            cachedRules.addAll(activeRules);
        } catch (Exception e) {
            // Log exception during initial DB load before tables created
        }
    }

    public AuthorizationDecision check(Supplier<Authentication> authenticationSupplier, RequestAuthorizationContext context) {
        HttpServletRequest request = context.getRequest();
        String requestURI = request.getRequestURI();
        String httpMethod = request.getMethod();

        String requiredPermission = findRequiredPermission(requestURI, httpMethod);

        Authentication authentication = authenticationSupplier.get();

        // If no specific permission is mapped for this endpoint, require basic authentication
        if (requiredPermission == null) {
            boolean isAuthenticated = authentication != null 
                    && authentication.isAuthenticated() 
                    && !"anonymousUser".equals(authentication.getPrincipal());
            return new AuthorizationDecision(isAuthenticated);
        }

        if (authentication == null 
                || !authentication.isAuthenticated() 
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return new AuthorizationDecision(false);
        }

        // Check if user has ADMIN/MANAGER role or has the exact required permission
        boolean hasAccess = authentication.getAuthorities().stream().anyMatch(authority -> {
            String authName = authority.getAuthority();
            return "ROLE_ADMIN".equals(authName) 
                    || "ROLE_MANAGER".equals(authName) 
                    || requiredPermission.equals(authName);
        });

        return new AuthorizationDecision(hasAccess);
    }

    private String findRequiredPermission(String uri, String method) {
        for (ApiEndpointPermission rule : cachedRules) {
            if (rule.getHttpMethod() != null && rule.getUrlPattern() != null) {
                if (rule.getHttpMethod().equalsIgnoreCase(method) 
                        && pathMatcher.match(rule.getUrlPattern(), uri)) {
                    return rule.getPermissionCode();
                }
            }
        }
        return null;
    }

    @Override
    public @Nullable AuthorizationResult authorize(Supplier<? extends @Nullable Authentication> authentication, RequestAuthorizationContext object) {
        return null;
    }
}
