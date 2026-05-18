package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.ReplayDTO;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import com.yeskatronics.vs_recorder_backend.services.PokemonService;
import com.yeskatronics.vs_recorder_backend.utils.PlayerIdentifier;
import com.yeskatronics.vs_recorder_backend.utils.ReplayMatcher;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;
import java.util.stream.Collectors;

/**
 * MapStruct mapper for Replay entity and DTOs.
 */
@Mapper(componentModel = "spring")
public abstract class ReplayMapper {

    @Autowired
    protected PokemonService pokemonService;

    /**
     * Convert CreateRequest to Replay entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "match", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    public abstract Replay toEntity(ReplayDTO.CreateRequest dto);

    /**
     * Convert UpdateRequest to Replay entity (for partial updates)
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "match", ignore = true)
    @Mapping(target = "url", ignore = true)
    @Mapping(target = "battleLog", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    public abstract Replay toEntity(ReplayDTO.UpdateRequest dto);

    /**
     * Convert Replay entity to Response DTO (includes battleLog)
     */
    @Mapping(source = "team.id", target = "teamId")
    @Mapping(source = "match.id", target = "matchId")
    public abstract ReplayDTO.Response toDTO(Replay replay);

    /**
     * Convert Replay entity to Summary DTO (excludes battleLog for list views)
     */
    @Mapping(source = "team.id", target = "teamId")
    @Mapping(source = "match.id", target = "matchId")
    @Mapping(target = "battleData", ignore = true)
    public abstract ReplayDTO.Summary toSummaryDTO(Replay replay);

    /**
     * After mapping, populate battleData from battleLog
     */
    @AfterMapping
    protected void populateBattleData(@MappingTarget ReplayDTO.Summary summary, Replay replay) {
        if (replay.getBattleLog() != null && !replay.getBattleLog().isEmpty()) {
            // Extract raw battle data from battle log
            ReplayMatcher.BattleData rawData = ReplayMatcher.extractBattleData(
                    replay.getBattleLog(),
                    replay.getTeam().getShowdownUsernames()
            );

            // Convert to DTO format
            ReplayDTO.BattleData battleData = new ReplayDTO.BattleData();
            battleData.setWinner(rawData.getWinner());
            battleData.setTeams(rawData.getTeams());
            battleData.setActualPicks(rawData.getActualPicks());

            // Convert tera events
            Map<String, List<ReplayDTO.TeraEvent>> teraEvents = new HashMap<>();
            for (Map.Entry<String, List<ReplayMatcher.TeraEvent>> entry : rawData.getTeraEvents().entrySet()) {
                List<ReplayDTO.TeraEvent> dtoEvents = entry.getValue().stream()
                        .map(e -> new ReplayDTO.TeraEvent(e.getPokemon(), e.getType()))
                        .collect(Collectors.toList());
                teraEvents.put(entry.getKey(), dtoEvents);
            }
            battleData.setTeraEvents(teraEvents);

            // Convert mega events
            Map<String, List<ReplayDTO.MegaEvent>> megaEvents = new HashMap<>();
            if (rawData.getMegaEvents() != null) {
                for (Map.Entry<String, List<ReplayMatcher.MegaEvent>> entry : rawData.getMegaEvents().entrySet()) {
                    List<ReplayDTO.MegaEvent> dtoEvents = entry.getValue().stream()
                            .map(e -> new ReplayDTO.MegaEvent(e.getPokemon(), e.getMegaForme()))
                            .collect(Collectors.toList());
                    megaEvents.put(entry.getKey(), dtoEvents);
                }
            }
            battleData.setMegaEvents(megaEvents);

            // Convert ELO changes
            Map<String, ReplayDTO.EloChange> eloChanges = new HashMap<>();
            for (Map.Entry<String, ReplayMatcher.EloChange> entry : rawData.getEloChanges().entrySet()) {
                ReplayMatcher.EloChange rawElo = entry.getValue();
                eloChanges.put(entry.getKey(), new ReplayDTO.EloChange(
                        rawElo.getBefore(),
                        rawElo.getAfter(),
                        rawElo.getChange()
                ));
            }
            battleData.setEloChanges(eloChanges);

            List<String> registeredRoster = replay.getTeam().getTeamMembers() == null
                    ? Collections.emptyList()
                    : replay.getTeam().getTeamMembers().stream()
                        .map(TeamMember::getPokemonName)
                        .collect(Collectors.toList());

            PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                    replay.getTeam().getShowdownUsernames(),
                    registeredRoster,
                    rawData.getPlayers(),
                    rawData.getTeams(),
                    pokemonService
            );

            battleData.setUserPlayer(id.userPlayer());
            battleData.setOpponentPlayer(id.opponentPlayer());

            summary.setBattleData(battleData);
        }
    }
}
