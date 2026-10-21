package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class ReplayMapperTest {
    @Test
    void addsItemEvidenceToExistingReplaySummariesWithoutChangingTheStoredLog() throws Exception {
        var mapper = Mappers.getMapper(ReplayMapper.class);
        var team = new Team();
        team.setId(1L);
        team.setShowdownUsernames(List.of());
        var replay = new Replay();
        replay.setId(2L);
        replay.setTeam(team);
        String json = Files.readString(Path.of("src/test/resources/replays/issue160-followup/game1.json"));
        replay.setBattleLog(json);
        var summary = mapper.toSummaryDTO(replay);
        assertEquals(1L, summary.getTeamId());
        assertEquals("p2", summary.getBattleData().getOpponentPlayer());
        var details = summary.getBattleData().getTeamDetails().get("p2");
        assertEquals(6, details.size());
        assertEquals("Gengarite", details.stream().filter(m -> m.getSpecies().equals("Gengar")).findFirst().orElseThrow().getItem());
        assertEquals(json, replay.getBattleLog());
    }
}
