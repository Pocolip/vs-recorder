package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.TeamDTO;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.services.TeamService;
import org.mapstruct.*;

/**
 * MapStruct mapper for Team entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface TeamMapper {

    /**
     * Convert CreateRequest to Team entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "replays", ignore = true)
    @Mapping(target = "matches", ignore = true)
    Team toEntity(TeamDTO.CreateRequest dto);

    /**
     * Convert UpdateRequest to Team entity (for partial updates)
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "replays", ignore = true)
    @Mapping(target = "matches", ignore = true)
    Team toEntity(TeamDTO.UpdateRequest dto);

    /**
     * Convert Team entity to Response DTO with stats
     * Stats will be set via @AfterMapping
     */
    @Mapping(target = "stats", ignore = true)
    TeamDTO.Response toDTO(Team team, @org.mapstruct.Context TeamService.TeamStats stats);

    /**
     * Convert TeamStats to DTO TeamStats
     */
    TeamDTO.TeamStats toStatsDTO(TeamService.TeamStats stats);

    /**
     * Convert Team entity to Summary DTO
     */
    @Mapping(source = "team.id", target = "id")
    @Mapping(source = "team.name", target = "name")
    @Mapping(source = "team.regulation", target = "regulation")
    @Mapping(source = "team.createdAt", target = "createdAt")
    @Mapping(source = "replayCount", target = "replayCount")
    @Mapping(source = "matchCount", target = "matchCount")
    @Mapping(source = "winRate", target = "winRate")
    TeamDTO.Summary toSummaryDTO(Team team, int replayCount, int matchCount, Double winRate);

    /**
     * After mapping, set the stats
     */
    @AfterMapping
    default void setStats(@MappingTarget TeamDTO.Response response, @org.mapstruct.Context TeamService.TeamStats stats) {
        if (stats != null) {
            response.setStats(toStatsDTO(stats));
        }
    }
}