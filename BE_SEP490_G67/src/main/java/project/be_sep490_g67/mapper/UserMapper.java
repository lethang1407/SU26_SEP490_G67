package project.be_sep490_g67.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import project.be_sep490_g67.dto.response.UserProfileResponse;
import project.be_sep490_g67.entity.Role;
import project.be_sep490_g67.entity.User;

import java.util.Set;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(source = "role", target = "roles", qualifiedByName = "roleToRoleNames")
    UserProfileResponse toProfileResponse(User user);

    @Named("roleToRoleNames")
    default Set<String> roleToRoleNames(Role role) {
        if (role == null) {
            return null;
        }
        return Set.of(role.getName());
    }
}
