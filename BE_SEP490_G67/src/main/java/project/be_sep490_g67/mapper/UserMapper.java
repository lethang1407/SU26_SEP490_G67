package project.be_sep490_g67.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import project.be_sep490_g67.dto.response.UserProfileResponse;
import project.be_sep490_g67.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(source = "role.name", target = "role")
    UserProfileResponse toProfileResponse(User user);
}
