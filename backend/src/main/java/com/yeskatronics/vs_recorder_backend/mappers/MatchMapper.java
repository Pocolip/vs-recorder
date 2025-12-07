package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.MatchDTO;
import com.yeskatronics.vs_recorder_backend.entities.Match;
import com.yeskatronics.vs_recorder_backend.services.MatchService;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for Match entity and DTOs.
 */
@Mapper(componentModel = "spring", uses = {ReplayMapper.class})
public interface MatchMapper {

    /**
     * Convert CreateRequest to Match entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "replays", ignore = true)
    Match toEntity(MatchDTO.CreateRequest dto);

    /**
     * Convert UpdateRequest to Match entity (for partial updates)
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "replays", ignore = true)
    Match toEntity(MatchDTO.UpdateRequest dto);

    /**
     * Convert Match entity to Response DTO with stats
     * Uses ReplayMapper for the replays list
     * Stats will be set via @AfterMapping
     */
    @Mapping(source = "team.id", target = "teamId")
    @Mapping(target = "stats", ignore = true)
    MatchDTO.Response toDTO(Match match, @org.mapstruct.Context MatchService.MatchStats stats);

    /**
     * Convert MatchStats to DTO MatchStats
     */
    MatchDTO.MatchStats toStatsDTO(MatchService.MatchStats stats);

    /**
     * Convert Match entity to Summary DTO
     */
    @Mapping(source = "match.id", target = "id")
    @Mapping(source = "match.team.id", target = "teamId")
    @Mapping(source = "match.opponent", target = "opponent")
    @Mapping(source = "match.tags", target = "tags")
    @Mapping(source = "match.createdAt", target = "createdAt")
    @Mapping(source = "stats.replayCount", target = "replayCount")
    @Mapping(source = "stats.complete", target = "complete")
    @Mapping(source = "stats.matchResult", target = "matchResult")
    MatchDTO.Summary toSummaryDTO(Match match, MatchService.MatchStats stats);

    /**
     * Convert TeamMatchStats to DTO
     */
    MatchDTO.TeamMatchStatsResponse toDTO(MatchService.TeamMatchStats stats);

    /**
     * After mapping, set the stats for Response DTO
     */
    @AfterMapping
    default void setStats(@MappingTarget MatchDTO.Response response, @org.mapstruct.Context MatchService.MatchStats stats) {
        if (stats != null) {
            response.setStats(toStatsDTO(stats));
        }
    }
}