package com.yeskatronics.vs_recorder_backend.performance;

import com.yeskatronics.vs_recorder_backend.dto.ReplayDTO;
import com.yeskatronics.vs_recorder_backend.entities.*;
import com.yeskatronics.vs_recorder_backend.repositories.*;
import com.yeskatronics.vs_recorder_backend.services.*;
import jakarta.persistence.EntityManager;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "spring.jpa.properties.hibernate.session_factory.statement_inspector=com.yeskatronics.vs_recorder_backend.performance.ReplayBrowsePerformanceTest$SqlCapture")
@Transactional
class ReplayBrowsePerformanceTest {
    public static class SqlCapture implements StatementInspector {
        static final List<String> statements = new ArrayList<>();
        public String inspect(String sql) { statements.add(sql); return sql; }
    }
    @Autowired EntityManager em;
    @Autowired ReplayRepository replays;
    @Autowired TeamRepository teams;
    @Autowired ReplayBrowseService browse;
    @Autowired MatchService matches;
    @Autowired ReplayIdentifierBackfill backfill;

    private Team team() {
        User user = new User(); user.setUsername("perf" + UUID.randomUUID());
        user.setEmail(user.getUsername() + "@example.com"); user.setPasswordHash("password"); em.persist(user);
        Team team = new Team(); team.setName("Perf team"); team.setPokepaste("https://pokepast.es/test");
        team.setUser(user); team.setShowdownUsernames(new ArrayList<>(List.of("Owner"))); em.persist(team);
        return team;
    }
    private Replay replay(Team team, String species, String result) {
        Replay replay = new Replay(); replay.setTeam(team); replay.setUrl("https://replay.pokemonshowdown.com/" + UUID.randomUUID());
        replay.setBattleLog("{\"log\":\"|player|p1|Owner|\\n|player|p2|Rival|\\n|poke|p1|Pikachu, L50|\\n|poke|p2|" + species + ", L50|\\n|win|Owner\"}");
        replay.setResult(result); em.persist(replay); return replay;
    }

    @Test void boundedPagesFiltersTotalsUrlsAndBulkActionsUseWholeHistoryWithoutLogs() {
        Team team = team();
        for (int i = 0; i < 40; i++) replay(team, i < 35 ? "Incineroar" : "Rillaboom", i % 2 == 0 ? "win" : "loss");
        em.flush();
        ReplayDTO.BrowseRequest filter = new ReplayDTO.BrowseRequest();
        var first = browse.page(team.getId(), filter);
        assertEquals(25, first.content().size()); assertEquals(40, first.totalElements());
        filter.setPage(1);
        SqlCapture.statements.clear();
        var second = browse.page(team.getId(), filter);
        assertEquals(15, second.content().size());
        assertTrue(Collections.disjoint(first.content().stream().map(ReplayDTO.Summary::getId).toList(),
                second.content().stream().map(ReplayDTO.Summary::getId).toList()));
        assertTrue(SqlCapture.statements.stream().noneMatch(sql -> sql.contains("battle_log")), SqlCapture.statements.toString());
        filter.setTags(List.of("incin")); filter.setPage(0);
        var filtered = browse.page(team.getId(), filter);
        assertEquals(35, filtered.totalElements()); assertEquals(40, filtered.totalTeam());
        assertEquals(18, filtered.wins()); assertEquals(17, filtered.losses());
        assertEquals(35, browse.urls(team.getId(), filter).size());
        assertEquals(35, browse.setReviewed(team.getId(), filter, true));
        em.clear();
        filter.setReviewed(true);
        assertEquals(35, browse.page(team.getId(), filter).totalElements());
        filter.setTags(List.of("incin", "rillaboom"));
        assertEquals(0, browse.page(team.getId(), filter).totalElements());
    }

    @Test void historicalMetadataAndIdentificationChangesRefreshSearchWithoutReparsingWarmLogs() {
        Team team = team(); Replay replay = replay(team, "Incineroar", "win");
        replay.setBattleMetadata(null); replay.setMetadataVersion(0); replay.setIdentificationKey(null);
        em.flush(); backfill.run(null);
        assertNotNull(replay.getBattleMetadata());
        var filter = new ReplayDTO.BrowseRequest(); filter.setTags(List.of("incineroar"));
        assertEquals(1, browse.page(team.getId(), filter).totalElements());
        team.setShowdownUsernames(new ArrayList<>(List.of("Rival")));
        em.flush();
        assertEquals(0, browse.page(team.getId(), filter).totalElements());
        filter.setTags(List.of("pikachu"));
        assertEquals("p2", browse.page(team.getId(), filter).content().get(0).getBattleData().getUserPlayer());
    }

    @Test void matchAggregatesPreserveEmptyIncompleteWinAndLossSemanticsWithoutLogs() {
        Team team = team();
        for (int count : List.of(0, 1, 2, 3, 4)) {
            Match match = new Match(); match.setTeam(team); em.persist(match);
            for (int i = 0; i < count; i++) replay(team, "Incineroar", count == 2 ? "WIN" : "loss").setMatch(match);
        }
        em.flush(); em.clear(); SqlCapture.statements.clear();
        var stats = matches.getTeamMatchStats(team.getId());
        assertEquals(5, stats.totalMatches()); assertEquals(2, stats.completeMatches());
        assertEquals(1, stats.matchWins()); assertEquals(1, stats.matchLosses());
        assertEquals(50, stats.matchWinRate());
        assertEquals(1, SqlCapture.statements.size());
        assertFalse(SqlCapture.statements.get(0).contains("battle_log"));
    }

    @Test void folderCountsRespectFolderOwnershipAndCountSharedTeamsOnce() {
        Team first = team(); Team second = team();
        Folder folder = new Folder(); folder.setUser(first.getUser()); folder.setName("Shared"); folder.setPosition(0); em.persist(folder);
        Folder empty = new Folder(); empty.setUser(first.getUser()); empty.setName("Empty"); empty.setPosition(1); em.persist(empty);
        first.getFolders().add(folder); second.getFolders().add(folder); em.flush(); em.clear();
        SqlCapture.statements.clear();
        var counts = teams.countTeamsByFolderForUser(first.getUser().getId());
        assertEquals(1, counts.size()); assertEquals(folder.getId(), counts.get(0).getFolderId()); assertEquals(2, counts.get(0).getTeamCount());
        assertEquals(1, SqlCapture.statements.size());
        assertTrue(teams.countTeamsByFolderForUser(second.getUser().getId()).isEmpty());
    }
}
