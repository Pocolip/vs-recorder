package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.*;
import com.yeskatronics.vs_recorder_backend.mappers.ReplayMapper;
import com.yeskatronics.vs_recorder_backend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReplayMetadataService {
    private final ReplayRepository replays;
    private final TeamRepository teams;
    private final TeamMemberRepository members;
    private final ReplayMapper mapper;
    private final PokemonService pokemon;

    private Team identity(Team source) {
        // A detached identity snapshot avoids stale lazy collections after roster edits.
        Team identity = new Team();
        identity.setId(source.getId());
        identity.setShowdownUsernames(new ArrayList<>(source.getShowdownUsernames()));
        identity.setTeamMembers(members.findByTeamIdOrderBySlotAsc(source.getId()));
        return identity;
    }

    private String key(Team team) {
        String value = new TreeSet<>(team.getShowdownUsernames()).toString() + ":" +
                team.getTeamMembers().stream().map(TeamMember::getPokemonName).sorted().toList() + ":" + pokemon.getRegistryVersion();
        return org.springframework.util.DigestUtils.md5DigestAsHex(value.getBytes(StandardCharsets.UTF_8));
    }

    public void index(Replay replay) {
        Team identity = identity(replay.getTeam());
        index(replay, identity, key(identity));
    }

    private void index(Replay replay, Team identity, String key) {
        if (!Integer.valueOf(1).equals(replay.getMetadataVersion())) replay.setBattleMetadata(null);
        replay.extractMatchIdentifier();
        Team original = replay.getTeam();
        replay.setTeam(identity);
        var data = mapper.toSummaryDTO(replay).getBattleData();
        replay.setTeam(original);
        replay.getOpponentSpecies().clear();
        if (data != null && data.getTeams() != null) {
            data.getTeams().getOrDefault(data.getOpponentPlayer(), List.of()).stream()
                    .map(pokemon::resolveCanonical).filter(Objects::nonNull).distinct()
                    .forEach(replay.getOpponentSpecies()::add);
        }
        replay.setIdentificationKey(key);
    }

    /** Cold historical records and changed team identification are refreshed once, in bounded batches. */
    @Transactional
    public Team ensureTeam(Long teamId) {
        Team identity = identity(teams.findById(teamId).orElseThrow());
        String key = key(identity);
        while (true) {
            var ids = replays.findStaleMetadataIds(teamId, key, PageRequest.of(0, 100));
            if (ids.isEmpty()) return identity;
            var batch = replays.findAllById(ids);
            batch.forEach(replay -> index(replay, identity, key));
            replays.flush();
        }
    }
}
