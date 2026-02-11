package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.TeamMemberDTO;
import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for TeamMember entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface TeamMemberMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    TeamMember toEntity(TeamMemberDTO.CreateRequest dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "pokemonName", ignore = true)
    @Mapping(target = "slot", ignore = true)
    @Mapping(target = "calcs", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromDto(TeamMemberDTO.UpdateRequest dto, @MappingTarget TeamMember entity);

    @Mapping(source = "team.id", target = "teamId")
    TeamMemberDTO.Response toResponse(TeamMember entity);

    List<TeamMemberDTO.Response> toResponseList(List<TeamMember> entities);
}
