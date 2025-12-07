package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.ReplayDTO;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import org.mapstruct.*;

/**
 * MapStruct mapper for Replay entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface ReplayMapper {

    /**
     * Convert CreateRequest to Replay entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "match", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Replay toEntity(ReplayDTO.CreateRequest dto);

    /**
     * Convert UpdateRequest to Replay entity (for partial updates)
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "match", ignore = true)
    @Mapping(target = "url", ignore = true)
    @Mapping(target = "battleLog", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Replay toEntity(ReplayDTO.UpdateRequest dto);

    /**
     * Convert Replay entity to Response DTO (includes battleLog)
     */
    @Mapping(source = "team.id", target = "teamId")
    @Mapping(source = "match.id", target = "matchId")
    ReplayDTO.Response toDTO(Replay replay);

    /**
     * Convert Replay entity to Summary DTO (excludes battleLog for list views)
     */
    @Mapping(source = "team.id", target = "teamId")
    @Mapping(source = "match.id", target = "matchId")
    ReplayDTO.Summary toSummaryDTO(Replay replay);
}