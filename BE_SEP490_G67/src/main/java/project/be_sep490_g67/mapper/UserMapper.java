package project.be_sep490_g67.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import project.be_sep490_g67.dto.response.UserProfileResponse;
import project.be_sep490_g67.entity.Role;
import project.be_sep490_g67.entity.User;

import project.be_sep490_g67.entity.Permission;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(source = "roles", target = "roles", qualifiedByName = "rolesToRoleNames")
    @Mapping(source = "user", target = "permissions", qualifiedByName = "userToPermissionCodes")
    UserProfileResponse toProfileResponse(User user);

    @Named("rolesToRoleNames")
    default Set<String> rolesToRoleNames(Set<Role> roles) {
        if (roles == null) {
            return null;
        }
        return roles.stream()
                .map(Role::getName)
                .collect(Collectors.toSet());
    }

    @Named("userToPermissionCodes")
    default Set<String> userToPermissionCodes(User user) {
        if (user == null) {
            return java.util.Collections.emptySet();
        }
        Set<String> permissions = new java.util.HashSet<>();
        if (user.getRoles() != null) {
            user.getRoles().stream()
                    .filter(r -> r.getPermissions() != null)
                    .flatMap(r -> r.getPermissions().stream())
                    .map(Permission::getCode)
                    .filter(code -> code != null)
                    .forEach(permissions::add);
        }
        if (user.getCustomPermissions() != null) {
            user.getCustomPermissions().stream()
                    .map(Permission::getCode)
                    .filter(code -> code != null)
                    .forEach(permissions::add);
        }
        return permissions;
    }
}
