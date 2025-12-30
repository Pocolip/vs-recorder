package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.ReplayRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.UUID;

@SpringBootTest
@Transactional
class AnalyticsServiceTest {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private ReplayRepository replayRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private Team testTeam;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setPasswordHash("hashed");
        testUser.setEmail("test@test.com");
        testUser = userRepository.save(testUser);

        // Create test team
        testTeam = new Team();
        testTeam.setUser(testUser);
        testTeam.setName("Test Team");
        testTeam.setPokepaste("https://pokepast.es/test");
        testTeam.setRegulation("Reg I");
        testTeam.setShowdownUsernames(Arrays.asList("testuser"));
        testTeam = teamRepository.save(testTeam);
    }

    private Replay createTestReplay(String battleLogJson, String result) {
        Replay replay = new Replay();
        replay.setTeam(testTeam);
        replay.setUrl("https://replay.pokemonshowdown.com/test-" + UUID.randomUUID());
        replay.setBattleLog(battleLogJson);
        replay.setResult(result);
        replay.setOpponent("Opponent");
        replay.setDate(LocalDateTime.now());
        return replayRepository.save(replay);
    }

    @Test
    void testGetUsageStats_withNoReplays_shouldReturnEmptyStats() {
        // Call getUsageStats
        // Assert pokemonStats is empty
        // Assert leadPairStats is empty
        // Assert totalGames is 0
    }

    @Test
    void testGetUsageStats_shouldCalculatePokemonUsage() {
        // Create 2-3 replays with known battle logs
        // Call getUsageStats
        // Assert Pokemon usage counts are correct
        // Assert usage rates are calculated correctly
    }

    @Test
    void testGetUsageStats_shouldCalculateWinRates() {
        // Create replays: 2 wins, 1 loss
        // Call getUsageStats
        // Assert averageWinRate is 67% (2/3)
        // Assert Pokemon-specific win rates are correct
    }

    @Test
    void testGetUsageStats_shouldCalculateLeadStats() {
        // Create replays where Pokemon is lead
        // Call getUsageStats
        // Assert leadUsage is correct
        // Assert leadWinRate is calculated
    }

    @Test
    void testGetUsageStats_shouldCalculateTeraStats() {
        // Create replays where Pokemon Teras
        // Call getUsageStats
        // Assert teraUsage is correct
        // Assert teraWinRate is calculated
        // Assert Pokemon that never Tera has null teraWinRate
    }

    @Test
    void testGetUsageStats_shouldCalculateLeadPairs() {
        // Create replays with consistent lead pairs
        // Call getUsageStats
        // Assert leadPairStats contains expected pairs
        // Assert pair usage and win rates are correct
    }

    @Test
    void testGetUsageStats_shouldIdentifyPlayerCorrectly() {
        // Create replay where user is player2
        // Call getUsageStats
        // Assert correct side's Pokemon are analyzed
    }

    @Test
    void testGetMatchupStats_withNoReplays_shouldReturnEmptyStats() {
        // Call getMatchupStats
        // Assert all lists are empty
    }

    @Test
    void testGetMatchupStats_shouldIdentifyBestMatchups() {
        // Create replays with high win rate vs certain Pokemon
        // Call getMatchupStats
        // Assert bestMatchups contains those Pokemon
        // Assert win rates are correct
    }

    @Test
    void testGetMatchupStats_shouldIdentifyWorstMatchups() {
        // Create replays with low win rate vs certain Pokemon
        // Call getMatchupStats
        // Assert worstMatchups contains those Pokemon
    }

    @Test
    void testGetMatchupStats_shouldFilterByMinimumEncounters() {
        // Create 2 encounters vs Pokemon A (should be excluded)
        // Create 5 encounters vs Pokemon B (should be included)
        // Minimum is 3 encounters
        // Assert only Pokemon B appears in best/worst matchups
    }

    @Test
    void testGetMatchupStats_shouldCalculateAttendanceRates() {
        // Create replays where opponent has Pokemon on team
        // But only brings it some of the time
        // Assert attendanceRate is calculated correctly
    }

    @Test
    void testGetMatchupStats_shouldSortByWinRateThenEncounters() {
        // Create multiple Pokemon with same win rate
        // Assert sorted by number of encounters as tiebreaker
    }

    @Test
    void testGetCustomMatchupAnalysis_withNoMatchingReplays_shouldReturnZeros() {
        // Create replays vs different Pokemon
        // Request analysis vs Pokemon never faced
        // Assert all stats are 0
    }

    @Test
    void testGetCustomMatchupAnalysis_shouldAnalyzePokemonIndividually() {
        // Create replays vs some of the requested Pokemon
        // Call getCustomMatchupAnalysis
        // Assert pokemonAnalysis has correct stats per Pokemon
    }

    @Test
    void testGetCustomMatchupAnalysis_shouldCalculateExactMatches() {
        // Create replays where opponent has EXACTLY the custom team
        // Assert totalEncounters counts these
        // Assert teamWinRate is calculated correctly
    }

    @Test
    void testGetCustomMatchupAnalysis_withInvalidRequest_shouldThrowException() {
        // Request with 3 Pokemon (min is 4)
        // Assert throws IllegalArgumentException

        // Request with 7 Pokemon (max is 6)
        // Assert throws IllegalArgumentException
    }

    @Test
    void testGetMoveUsageStats_withNoReplays_shouldReturnEmpty() {
        // Call getMoveUsageStats
        // Assert pokemonMoves is empty
    }

    @Test
    void testGetMoveUsageStats_shouldTrackMovesPerPokemon() {
        // Create replays with known move usage
        // Call getMoveUsageStats
        // Assert moves are tracked per Pokemon
        // Assert timesUsed is correct
    }

    @Test
    void testGetMoveUsageStats_shouldCalculateUsageRate() {
        // Pokemon brought 10 times, move used 7 times
        // Assert usageRate is 70%
    }

    @Test
    void testGetMoveUsageStats_shouldCalculateMoveWinRate() {
        // Move used in 5 games: 3 wins, 2 losses
        // Assert winRate is 60%
    }

    @Test
    void testGetMoveUsageStats_shouldSortMovesByUsage() {
        // Create data where Pokemon has multiple moves
        // Assert moves are sorted by timesUsed descending
    }

    @Test
    void testIdentifyPlayer_withMatchingUsername_shouldReturnCorrectPlayer() {
        // BattleData with player1 = "testuser"
        // Team has showdownUsername = "testuser"
        // Assert identifies player1
    }

    @Test
    void testIdentifyPlayer_withNoMatch_shouldDefaultToPlayer1() {
        // BattleData with neither player matching
        // Assert returns player1 (with warning logged)
    }

    @Test
    void testIdentifyPlayer_withMultipleUsernames_shouldMatchAny() {
        // Team has showdownUsernames = ["alt1", "alt2", "main"]
        // BattleData has player2 = "alt2"
        // Assert identifies player2
    }

    @Test
    void testGetUsageStats_withUnparsableReplay_shouldSkipIt() {
        // Create replay with invalid battle log
        // Create replay with valid battle log
        // Call getUsageStats
        // Assert only valid replay is counted
        // Assert warning is logged
    }

    @Test
    void testGetMatchupStats_withMissingOpponentData_shouldHandleGracefully() {
        // Create replay where battle log has no opponent team
        // Should not crash
    }

    @Test
    void testCalculations_withZeroDivision_shouldHandleGracefully() {
        // Test edge cases that might cause division by zero
        // Assert returns 0 or null appropriately
    }
}