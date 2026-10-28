package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Match;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.MatchRepository;
import com.yeskatronics.vs_recorder_backend.repositories.ReplayRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for TeamService's aggregate team counts used by the team list endpoints
 */
@SpringBootTest
@Transactional
class TeamServiceTest {

    @Autowired
    private TeamService teamService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private ReplayRepository replayRepository;

    @Autowired
    private MatchRepository matchRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("countsuser");
        testUser.setEmail("counts@example.com");
        testUser.setPasswordHash("hashed_password");
        testUser = userRepository.save(testUser);
    }

    private Team createTeam(String name) {
        Team team = new Team();
        team.setName(name);
        team.setPokepaste("https://pokepast.es/test");
        team.setRegulation("Reg M-C");
        team.setUser(testUser);
        return teamRepository.save(team);
    }

    private void createReplay(Team team, String result) {
        Replay replay = new Replay();
        replay.setTeam(team);
        replay.setUrl("https://replay.pokemonshowdown.com/" + team.getId() + "-" + System.nanoTime());
        replay.setBattleLog("{}");
        replay.setResult(result);
        replay.setDate(LocalDateTime.now());
        replayRepository.save(replay);
    }

    @Test
    void getTeamCountsAggregatesPerTeam() {
        Team active = createTeam("Active");
        Team empty = createTeam("Empty");
        createReplay(active, "win");
        createReplay(active, "WIN");
        createReplay(active, "loss");
        createReplay(active, null);

        Match match = new Match();
        match.setTeam(active);
        matchRepository.save(match);

        Map<Long, TeamService.TeamCounts> counts = teamService.getTeamCounts(List.of(active.getId(), empty.getId()));

        TeamService.TeamCounts activeCounts = counts.get(active.getId());
        assertEquals(4, activeCounts.replayCount());
        assertEquals(1, activeCounts.matchCount());
        assertEquals(2, activeCounts.wins());
        assertEquals(1, activeCounts.losses());
        assertEquals(50.0, activeCounts.winRate());

        TeamService.TeamCounts emptyCounts = counts.get(empty.getId());
        assertEquals(new TeamService.TeamCounts(0, 0, 0, 0), emptyCounts);
        assertEquals(0.0, emptyCounts.winRate());
    }

    @Test
    void getTeamStatsMatchesCounts() {
        Team team = createTeam("Stats");
        createReplay(team, "win");
        createReplay(team, "loss");
        createReplay(team, "loss");

        TeamService.TeamStats stats = teamService.getTeamStats(team.getId());

        assertEquals(3, stats.totalGames());
        assertEquals(1, stats.wins());
        assertEquals(2, stats.losses());
        assertEquals(100.0 / 3, stats.winRate(), 0.001);
    }

    @Test
    void getTeamStatsRejectsUnknownTeam() {
        assertThrows(IllegalArgumentException.class, () -> teamService.getTeamStats(-1L));
    }
}
