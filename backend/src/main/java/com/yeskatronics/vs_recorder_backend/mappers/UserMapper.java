package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.UserDTO;
import com.yeskatronics.vs_recorder_backend.entities.User;
import org.mapstruct.*;

/**
 * MapStruct mapper for User entity and DTOs.
 * MapStruct will generate the implementation at compile time.
 */
@Mapper(componentModel = "spring")
public interface UserMapper {

    /**
     * Convert CreateRequest to User entity
     * Password will be hashed in the service layer, so we map it to passwordHash
     */
    @Mapping(source = "password", target = "passwordHash")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "lastLogin", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "teams", ignore = true)
    User toEntity(UserDTO.CreateRequest dto);

    /**
     * Convert UpdateRequest to User entity (for partial updates)
     */
    @Mapping(source = "password", target = "passwordHash")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "lastLogin", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "teams", ignore = true)
    User toEntity(UserDTO.UpdateRequest dto);

    /**
     * Convert User entity to Response DTO
     * teamCount is calculated via expression
     */
    @Mapping(target = "teamCount", expression = "java(user.getTeams() != null ? user.getTeams().size() : 0)")
    UserDTO.Response toDTO(User user);

    /**
     * Convert User entity to Summary DTO
     */
    UserDTO.Summary toSummaryDTO(User user);
}