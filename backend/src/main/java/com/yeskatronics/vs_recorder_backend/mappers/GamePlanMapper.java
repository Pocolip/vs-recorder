package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.GamePlanDTO;
import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import org.mapstruct.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * MapStruct mapper for GamePlan and GamePlanTeam entities and DTOs.
 */
@Mapper(componentModel = "spring")
public interface GamePlanMapper {

    /**
     * Convert CreateGamePlanRequest to GamePlan entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "teams", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    GamePlan toEntity(GamePlanDTO.CreateGamePlanRequest dto);

    /**
     * Convert UpdateGamePlanRequest to GamePlan entity (for partial updates)
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "teams", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromDto(GamePlanDTO.UpdateGamePlanRequest dto, @MappingTarget GamePlan entity);

    /**
     * Convert GamePlan entity to GamePlanResponse DTO
     */
    @Mapping(source = "user.id", target = "userId")
    GamePlanDTO.GamePlanResponse toResponse(GamePlan entity);

    /**
     * Convert GamePlan entity to GamePlanSummary DTO
     */
    @Mapping(source = "gamePlan.user.id", target = "userId")
    @Mapping(source = "teamCount", target = "teamCount")
    GamePlanDTO.GamePlanSummary toSummary(GamePlan gamePlan, int teamCount);

    /**
     * Convert list of GamePlan entities to list of GamePlanSummary DTOs
     */
    default List<GamePlanDTO.GamePlanSummary> toSummaryList(List<GamePlan> gamePlans) {
        return gamePlans.stream()
                .map(gp -> toSummary(gp, gp.getTeams().size()))
                .collect(Collectors.toList());
    }

    /**
     * Convert AddTeamRequest to GamePlanTeam entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "gamePlan", ignore = true)
    @Mapping(target = "compositions", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    GamePlanTeam toEntity(GamePlanDTO.AddTeamRequest dto);

    /**
     * Convert UpdateTeamRequest to GamePlanTeam entity (for partial updates)
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "gamePlan", ignore = true)
    @Mapping(target = "compositions", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromDto(GamePlanDTO.UpdateTeamRequest dto, @MappingTarget GamePlanTeam entity);

    /**
     * Convert GamePlanTeam entity to GamePlanTeamResponse DTO
     */
    @Mapping(source = "gamePlan.id", target = "gamePlanId")
    @Mapping(source = "compositions", target = "compositions")
    GamePlanDTO.GamePlanTeamResponse toResponse(GamePlanTeam entity);

    /**
     * Convert list of GamePlanTeam entities to list of GamePlanTeamResponse DTOs
     */
    List<GamePlanDTO.GamePlanTeamResponse> toResponseList(List<GamePlanTeam> entities);

    /**
     * Map TeamComposition entity to DTO
     */
    default List<GamePlanDTO.TeamCompositionDTO> mapCompositions(List<GamePlanTeam.TeamComposition> compositions) {
        if (compositions == null) return null;
        return compositions.stream()
                .map(GamePlanDTO.TeamCompositionDTO::fromEntity)
                .collect(Collectors.toList());
    }
}