package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.AnalyticsDTO;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.ReplayRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.utils.BattleLogParser;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@Slf4j
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
        testTeam.setShowdownUsernames(Arrays.asList("testuser", "platanera", "mofonguero", "larry ayuso"));
        testTeam = teamRepository.save(testTeam);
    }

    // Helper to load test replay files
    private String loadTestReplay(String filename) throws IOException {
        Path path = Paths.get("src/test/resources/replays", filename);
        return Files.readString(path);
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

    private Replay createReplayFromJson(String battleLogJson) throws IOException {
        // Parse to extract metadata
        BattleLogParser.BattleData battleData = BattleLogParser.parseBattleLog(battleLogJson);

        // Identify which player is the test user
        String userPlayer = null;
        for (String username : testTeam.getShowdownUsernames()) {
            if (username.equalsIgnoreCase(battleData.getPlayer1())) {
                userPlayer = battleData.getPlayer1();
                break;
            } else if (username.equalsIgnoreCase(battleData.getPlayer2())) {
                userPlayer = battleData.getPlayer2();
                break;
            }
        }

        log.info("USER - " + userPlayer);
        // Determine opponent and result
        String opponent = userPlayer.equals(battleData.getPlayer1())
                ? battleData.getPlayer2()
                : battleData.getPlayer1();
        String result = userPlayer.equals(battleData.getWinner()) ? "win" : "loss";

        // Build replay
        Replay replay = new Replay();
        replay.setTeam(testTeam);
        replay.setUrl("https://replay.pokemonshowdown.com/test-" + UUID.randomUUID());
        replay.setBattleLog(battleLogJson);
        replay.setOpponent(opponent);
        replay.setResult(result);
        replay.setDate(LocalDateTime.now());

        return replayRepository.save(replay);
    }

    private void populateAllBo3() throws IOException {
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json"));

        createReplayFromJson(loadTestReplay("kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json"));
        createReplayFromJson(loadTestReplay("kuronisa/gen9vgc2026regfbo3-2493191775-5bm1cmanmkw9mcmnt9lv8u4txtuhu9upw.json"));

        createReplayFromJson(loadTestReplay("lunger/gen9vgc2026regfbo3-2493174548-tb9i5jswp3t1b9c3074bi0e032blu6kpw.json"));
        createReplayFromJson(loadTestReplay("lunger/gen9vgc2026regfbo3-2493176568-j1ucg2knvi4024jl0nrvgi7hs76jy6npw.json"));

        createReplayFromJson(loadTestReplay("beach/beachg1.json"));
        createReplayFromJson(loadTestReplay("beach/beachg2.json"));
        createReplayFromJson(loadTestReplay("beach/beachg3.json"));
    }

    @Test
    void testGetUsageStats_withNoReplays_shouldReturnEmptyStats() {
        // Given: Team with no replays (already created in setUp())

        // When: Get usage stats
        AnalyticsDTO.UsageStatsResponse response = analyticsService.getUsageStats(testTeam.getId());

        // Then: Should return empty stats
        assertNotNull(response);
        assertNotNull(response.getPokemonStats());
        assertNotNull(response.getLeadPairStats());

        assertTrue(response.getPokemonStats().isEmpty(), "Pokemon stats should be empty");
        assertTrue(response.getLeadPairStats().isEmpty(), "Lead pair stats should be empty");
        assertEquals(0, response.getAverageWinRate(), "Average win rate should be 0");
        assertEquals(0, response.getTotalGames(), "Total games should be 0");
    }

    @Test
    void testGetUsageStats_shouldCalculatePokemonUsage() throws IOException {
        // Given: Load maus.json replay
        String battleLogJson = loadTestReplay("bo1/maus.json");

        // Parse to check who won and which player matches our test team
        // You'll need to look at the JSON to see:
        // 1. Who are the players? (adjust testTeam.showdownUsernames if needed)
        // 2. Who won?
        // 3. Which Pokemon were brought?

        createTestReplay(battleLogJson, "loss"); // or "loss" depending on replay

        // When: Get usage stats
        AnalyticsDTO.UsageStatsResponse response = analyticsService.getUsageStats(testTeam.getId());

        // Then: Verify basic stats
        assertNotNull(response);
        assertEquals(1, response.getTotalGames());

        List<AnalyticsDTO.PokemonUsageStats> pokemonStats = response.getPokemonStats();
        assertFalse(pokemonStats.isEmpty(), "Should have Pokemon usage stats");

        // Verify specific Pokemon (replace with actual Pokemon from the replay)
        // Example for the first Pokemon brought:
        log.info(pokemonStats.toString());
        AnalyticsDTO.PokemonUsageStats umbreon = pokemonStats.get(0);
        AnalyticsDTO.PokemonUsageStats tornadus = pokemonStats.get(1);
        AnalyticsDTO.PokemonUsageStats zacian = pokemonStats.get(2);
        AnalyticsDTO.PokemonUsageStats rillaboom = pokemonStats.get(3);
        assertNotNull(umbreon.getPokemon());
        assertEquals(1, umbreon.getUsage(), "Pokemon was used in 1 game");
        assertEquals(1, tornadus.getUsage(), "Pokemon was used in 1 game");
        assertEquals(1, zacian.getUsage(), "Pokemon was used in 1 game");
        assertEquals(1, rillaboom.getUsage(), "Pokemon was used in 1 game");
        assertEquals(100, umbreon.getUsageRate(), "100% usage rate (1/1 games)");
        assertEquals(100, tornadus.getUsageRate(), "100% usage rate (1/1 games)");
        assertEquals(100, zacian.getUsageRate(), "100% usage rate (1/1 games)");
        assertEquals(100, rillaboom.getUsageRate(), "100% usage rate (1/1 games)");

        assertEquals(0, umbreon.getOverallWinRate());
        assertEquals(0, tornadus.getOverallWinRate());
        assertEquals(0, zacian.getOverallWinRate());
        assertEquals(0, rillaboom.getOverallWinRate());

        // Verify 4 Pokemon were brought (VGC brings 4 of 6)
        assertEquals(4, pokemonStats.size(), "Should have 4 Pokemon brought to battle");
    }

    @Test
    void testGetUsageStats_shouldCalculateWinRates() throws IOException {
        // Create replays: 2 wins, 1 loss
        // Call getUsageStats
        // Assert averageWinRate is 67% (2/3)
        // Assert Pokemon-specific win rates are correct
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json"));

        AnalyticsDTO.UsageStatsResponse response = analyticsService.getUsageStats(testTeam.getId());

        assertEquals(3, response.getTotalGames());
        log.info(response.toString());

        AnalyticsDTO.PokemonUsageStats grimm =  response
                .getPokemonStats()
                .stream()
                .filter(stats -> stats.getPokemon().equals("Grimmsnarl")).findFirst().get();
        AnalyticsDTO.PokemonUsageStats oger =  response
                .getPokemonStats()
                .stream()
                .filter(stats -> stats.getPokemon().equals("Ogerpon-Hearthflame")).findFirst().get();
        AnalyticsDTO.PokemonUsageStats lando =  response
                .getPokemonStats()
                .stream()
                .filter(stats -> stats.getPokemon().equals("Landorus")).findFirst().get();
        AnalyticsDTO.PokemonUsageStats raging = response
                .getPokemonStats()
                .stream()
                .filter(stats -> stats.getPokemon().equals("Raging Bolt")).findFirst().get();

        assertEquals(100,grimm.getUsageRate());
        assertEquals(67,lando.getUsageRate());
        assertEquals(100,oger.getUsageRate());
        assertEquals(100,raging.getUsageRate());

        assertEquals(3,grimm.getUsage());
        assertEquals(2,lando.getUsage());
        assertEquals(3,oger.getUsage());
        assertEquals(3,raging.getUsage());

        assertEquals(67,grimm.getOverallWinRate());
        assertEquals(50,lando.getOverallWinRate());
        assertEquals(67,oger.getOverallWinRate());
        assertEquals(67,raging.getOverallWinRate());

    }



    @Test
    void testGetUsageStats_shouldCalculateLeadStats() throws IOException {
        // Create replays where Pokemon is lead
        // Call getUsageStats
        // Assert leadUsage is correct
        // Assert leadWinRate is calculated

        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json"));

        AnalyticsDTO.UsageStatsResponse response = analyticsService.getUsageStats(testTeam.getId());

        // only one lead pair was used, oger + grimm
        assertEquals(1, response.getLeadPairStats().size());

        AnalyticsDTO.LeadPairStats stats = response.getLeadPairStats().get(0);

        assertEquals(3, stats.getUsage());
        assertEquals(100, stats.getUsageRate());
        assertEquals(67, stats.getWinRate());

    }

    @Test
    void testGetUsageStats_shouldCalculateTeraStats() throws IOException {
        // Create replays where Pokemon Teras
        // Call getUsageStats
        // Assert teraUsage is correct
        // Assert teraWinRate is calculated
        // Assert Pokemon that never Tera has null teraWinRate

        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json"));

        AnalyticsDTO.UsageStatsResponse response = analyticsService.getUsageStats(testTeam.getId());
        log.info(response.toString());
        AnalyticsDTO.PokemonUsageStats grimm =  response
                .getPokemonStats()
                .stream()
                .filter(stats -> stats.getPokemon().equals("Grimmsnarl")).findFirst().get();
        AnalyticsDTO.PokemonUsageStats oger =  response
                .getPokemonStats()
                .stream()
                .filter(stats -> stats.getPokemon().equals("Ogerpon-Hearthflame")).findFirst().get();
        AnalyticsDTO.PokemonUsageStats lando =  response
                .getPokemonStats()
                .stream()
                .filter(stats -> stats.getPokemon().equals("Landorus")).findFirst().get();
        AnalyticsDTO.PokemonUsageStats raging = response
                .getPokemonStats()
                .stream()
                .filter(stats -> stats.getPokemon().equals("Raging Bolt")).findFirst().get();

        assertEquals(0,grimm.getTeraUsage());
        assertEquals(0,lando.getTeraUsage());
        assertEquals(0,oger.getTeraUsage());
        assertEquals(2,raging.getTeraUsage());

        assertNull(grimm.getTeraWinRate());
        assertNull(lando.getTeraWinRate());
        assertNull(oger.getTeraWinRate());
        assertEquals(50,raging.getTeraWinRate());

    }

    @Test
    void testGetUsageStats_shouldCalculateLeadPairs() throws IOException {
        // Create replays with consistent lead pairs
        // Call getUsageStats
        // Assert leadPairStats contains expected pairs
        // Assert pair usage and win rates are correct
        populateAllBo3();

        AnalyticsDTO.UsageStatsResponse response = analyticsService.getUsageStats(testTeam.getId());

        log.info(response.toString());

        // grimm + oger/lando always lmao
        assertEquals(2, response.getLeadPairStats().size());

        AnalyticsDTO.LeadPairStats grimmoger = response
                .getLeadPairStats()
                .stream()
                .filter(leadPairStats ->
                        leadPairStats.getPair().contains("Grimmsnarl") &&
                                leadPairStats.getPair().contains("Ogerpon"))
                .findFirst().get();

        AnalyticsDTO.LeadPairStats grimmlando = response
                .getLeadPairStats()
                .stream()
                .filter(leadPairStats ->
                        leadPairStats.getPair().contains("Grimmsnarl") &&
                                leadPairStats.getPair().contains("Landorus"))
                .findFirst().get();

        assertEquals(8, grimmoger.getUsage());
        assertEquals(2, grimmlando.getUsage());

        assertEquals(75, grimmoger.getWinRate());
        assertEquals(6, grimmoger.getWins());
        assertEquals(100, grimmlando.getWinRate());
        assertEquals(2, grimmlando.getWins());

    }

    @Test
    void testGetUsageStats_shouldIdentifyPlayerCorrectly() throws IOException {
        // Create replay where user is player2
        // Call getUsageStats
        // Assert correct side's Pokemon are analyzed

        createReplayFromJson(loadTestReplay("beach/beachg1.json"));
        createReplayFromJson(loadTestReplay("beach/beachg2.json"));
        createReplayFromJson(loadTestReplay("beach/beachg3.json"));

        AnalyticsDTO.UsageStatsResponse response = analyticsService.getUsageStats(testTeam.getId());

        List<AnalyticsDTO.PokemonUsageStats> stats = response.getPokemonStats();

        for (AnalyticsDTO.PokemonUsageStats stat : stats){
            assertNotEquals("Great Tusk", stat.getPokemon());
            assertNotEquals("Whimsicott", stat.getPokemon());
        }
    }

    @Test
    void testGetMatchupStats_withNoReplays_shouldReturnEmptyStats() {
        // Call getMatchupStats
        // Assert all lists are empty

        AnalyticsDTO.UsageStatsResponse response = analyticsService.getUsageStats(testTeam.getId());

        log.info(response.toString());

        assertEquals(0, response.getPokemonStats().size());
        assertEquals(0, response.getLeadPairStats().size());
        assertEquals(0, response.getAverageWinRate());
        assertEquals(0, response.getTotalGames());
    }

    @Test
    void testGetMatchupStats_shouldIdentifyBestMatchups() throws IOException {
        // Create replays with high win rate vs certain Pokemon
        // Call getMatchupStats
        // Assert bestMatchups contains those Pokemon
        // Assert win rates are correct

        populateAllBo3();

        AnalyticsDTO.MatchupStatsResponse response = analyticsService.getMatchupStats(testTeam.getId());

        log.info(response.toString());

        AnalyticsDTO.MatchupStats flutter = response
                .getBestMatchups()
                .stream()
                .filter(matchupStats ->
                        matchupStats.getPokemon().contains("Flutter"))
                .findFirst().get();
        assertEquals(3, flutter.getGamesAgainst());
        assertEquals(2, flutter.getWinsAgainst());
        assertEquals(67, flutter.getWinRate());
        assertEquals(3, flutter.getTimesOnTeam());
        assertEquals(2, flutter.getTimesBrought());
        assertEquals(67, flutter.getAttendanceRate());


    }


    @Test
    void testGetMatchupStats_shouldIdentifyWorstMatchups() throws IOException {
        // Create replays with low win rate vs certain Pokemon
        // Call getMatchupStats
        // Assert worstMatchups contains those Pokemon
        populateAllBo3();

        AnalyticsDTO.MatchupStatsResponse response = analyticsService.getMatchupStats(testTeam.getId());

        log.info(response.toString());

        AnalyticsDTO.MatchupStats flutter = response
                .getBestMatchups()
                .stream()
                .filter(matchupStats ->
                        matchupStats.getPokemon().contains("Flutter"))
                .findFirst().get();
        assertEquals(3, flutter.getGamesAgainst());
        assertEquals(2, flutter.getWinsAgainst());
        assertEquals(67, flutter.getWinRate());
        assertEquals(3, flutter.getTimesOnTeam());
        assertEquals(2, flutter.getTimesBrought());
        assertEquals(67, flutter.getAttendanceRate());

    }

    @Test
    void testGetMatchupStats_shouldFilterByMinimumEncounters() throws IOException {
        // Create 2 encounters vs Pokemon A (should be excluded)
        // Create 5 encounters vs Pokemon B (should be included)
        // Minimum is 3 encounters
        // Assert only Pokemon B appears in best/worst matchups

        populateAllBo3();

        AnalyticsDTO.MatchupStatsResponse response = analyticsService.getMatchupStats(testTeam.getId());

        assertEquals(0, response
                .getBestMatchups()
                .stream()
                .filter(matchupStats ->
                        matchupStats.getPokemon().contains("Venusaur")).count());

        assertEquals(0, response
                .getWorstMatchups()
                .stream()
                .filter(matchupStats ->
                        matchupStats.getPokemon().contains("Venusaur")).count());

    }

    @Test
    void testGetMatchupStats_shouldCalculateAttendanceRates() throws IOException {
        // Create replays where opponent has Pokemon on team
        // But only brings it some of the time
        // Assert attendanceRate is calculated correctly

        populateAllBo3();

        AnalyticsDTO.MatchupStatsResponse response = analyticsService.getMatchupStats(testTeam.getId());
        //tusk was brough 2 out of 3 possible times
        assertEquals(67, response
                .getBestMatchups()
                .stream()
                .filter(matchupStats ->
                    matchupStats.getPokemon().contains("Great Tusk"))
                .findFirst()
                .get()
                .getAttendanceRate());
    }

    @Test
    void testGetMatchupStats_shouldSortByWinRateThenEncounters() throws IOException {
        // Create multiple Pokemon with same win rate
        // Assert sorted by number of encounters as tiebreaker
        populateAllBo3();

        AnalyticsDTO.MatchupStatsResponse response = analyticsService.getMatchupStats(testTeam.getId());

        //Flutter should be the first one
        assertEquals("Flutter Mane", response.getBestMatchups().get(0).getPokemon());

        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json"));

        response = analyticsService.getMatchupStats(testTeam.getId());

        assertEquals("Smeargle", response.getBestMatchups().get(0).getPokemon());
    }

    @Test
    void testGetCustomMatchupAnalysis_withNoMatchingReplays_shouldReturnZeros() throws IOException {
        // Create replays vs different Pokemon
        // Request analysis vs Pokemon never faced
        // Assert all stats are 0

        populateAllBo3();

        AnalyticsDTO.CustomMatchupRequest request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(List.of()).build();
        AnalyticsDTO.CustomMatchupResponse response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);

        log.info(response.toString());
        assertEquals(0, response.getTeamWinRate());
        assertEquals(10, response.getTotalEncounters());
        assertEquals(0, response.getPokemonAnalysis().size());

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(Arrays.asList("Pikachu")).build();
        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);
        assertEquals(0, response.getTeamWinRate());
        assertEquals(0, response.getTotalEncounters());
        assertEquals(0, response.getPokemonAnalysis().size());

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(Arrays.asList("Pikachu", "Raichu")).build();
        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);
        assertEquals(0, response.getTeamWinRate());
        assertEquals(0, response.getTotalEncounters());
        assertEquals(0, response.getPokemonAnalysis().size());

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(Arrays.asList("Pikachu", "Raichu", "Nidoking")).build();
        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);
        assertEquals(0, response.getTeamWinRate());
        assertEquals(0, response.getTotalEncounters());
        assertEquals(0, response.getPokemonAnalysis().size());

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(Arrays.asList("Pikachu", "Raichu", "Nidoking", "Nidoqueen")).build();
        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);
        assertEquals(0, response.getTeamWinRate());
        assertEquals(0, response.getTotalEncounters());
        assertEquals(0, response.getPokemonAnalysis().size());

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(Arrays.asList("Pikachu", "Raichu", "Nidoking", "Nidoqueen", "Snorlax")).build();
        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);
        assertEquals(0, response.getTeamWinRate());
        assertEquals(0, response.getTotalEncounters());
        assertEquals(0, response.getPokemonAnalysis().size());

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(Arrays.asList("Pikachu", "Raichu", "Nidoking", "Nidoqueen", "Snorlax", "Mewtwo")).build();
        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);
        assertEquals(0, response.getTeamWinRate());
        assertEquals(0, response.getTotalEncounters());
        assertEquals(0, response.getPokemonAnalysis().size());

    }

    @Test
    void testGetCustomMatchupAnalysis_shouldAnalyzePokemonIndividually() throws IOException {
        // Create replays vs some of the requested Pokemon
        // Call getCustomMatchupAnalysis
        // Assert pokemonAnalysis has correct stats per Pokemon

        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json"));
        createReplayFromJson(loadTestReplay("raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json"));

        AnalyticsDTO.CustomMatchupRequest request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(List.of("Torkoal")).build();
        AnalyticsDTO.CustomMatchupResponse response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);
        log.info(response.toString());

        assertEquals(67, response.getTeamWinRate());
        assertEquals(3, response.getTotalEncounters());

        createReplayFromJson(loadTestReplay("kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json"));
        createReplayFromJson(loadTestReplay("kuronisa/gen9vgc2026regfbo3-2493191775-5bm1cmanmkw9mcmnt9lv8u4txtuhu9upw.json"));

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(List.of("Torkoal", "Ninetales-Alola")).build();

        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);

        log.info(response.toString());
        assertEquals(80, response.getTeamWinRate());
        assertEquals(0, response.getTotalEncounters());

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(List.of("Torkoal", "Ninetales-Alola", "Landorus", "Smeargle")).build();

        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);

        log.info(response.toString());
        assertEquals(80, response.getTeamWinRate());
        assertEquals(0, response.getTotalEncounters());

        createReplayFromJson(loadTestReplay("mark/gen9vgc2026regfbo3-2495304397-upfy04cncd98v89g6p62bxn2kofb4u7pw.json"));
        createReplayFromJson(loadTestReplay("mark/gen9vgc2026regfbo3-2495306153-fyavxspkwdnwblptf000m1tj3a3j50gpw.json"));

        request = AnalyticsDTO.CustomMatchupRequest
                .builder()
                .opponentPokemon(List.of("Torkoal", "Ninetales-Alola", "Landorus", "Smeargle")).build();

        response = analyticsService.getCustomMatchupAnalysis(testTeam.getId(), request);

        log.info(response.toString());
        assertEquals(57, response.getTeamWinRate());
        assertEquals(71, response.getAverageWinRate());
        assertEquals(0, response.getTotalEncounters());


    }

    @Test
    void testGetMoveUsageStats_withNoReplays_shouldReturnEmpty() {
        // Call getMoveUsageStats
        // Assert pokemonMoves is empty

        AnalyticsDTO.MoveUsageResponse response = analyticsService.getMoveUsageStats(testTeam.getId());

        assertEquals(0, response.getPokemonMoves().size());

    }

    AnalyticsDTO.PokemonMoveStats getMoveUsageStatsMon(AnalyticsDTO.MoveUsageResponse response, String name){
        return response
                .getPokemonMoves()
                .stream()
                .filter(pokemonMoveStats -> pokemonMoveStats.getPokemon().equals(name))
                .findFirst().get();
    }

    int getUseCount(AnalyticsDTO.PokemonMoveStats mon, String move){
        return mon
                .getMoves()
                .stream()
                .filter(stats -> stats.getMove().equals(move))
                .findFirst()
                .get()
                .getTimesUsed();
    }

    int getUseRate(AnalyticsDTO.PokemonMoveStats mon, String move){
        return mon
                .getMoves()
                .stream()
                .filter(stats -> stats.getMove().equals(move))
                .findFirst()
                .get()
                .getUsageRate();
    }

    @Test
    void testGetMoveUsageStats_shouldTrackMovesPerPokemon() throws IOException {
        // Create replays with known move usage
        // Call getMoveUsageStats
        // Assert moves are tracked per Pokemon
        // Assert timesUsed is correct

        populateAllBo3();

        AnalyticsDTO.MoveUsageResponse response = analyticsService.getMoveUsageStats(testTeam.getId());

        log.info(response.toString());

        assertEquals(6, response.getPokemonMoves().size());

        AnalyticsDTO.PokemonMoveStats pao = getMoveUsageStatsMon(response, "Chien-Pao");
        AnalyticsDTO.PokemonMoveStats grimm = getMoveUsageStatsMon(response, "Grimmsnarl");
        AnalyticsDTO.PokemonMoveStats lando = getMoveUsageStatsMon(response, "Landorus");
        AnalyticsDTO.PokemonMoveStats oger = getMoveUsageStatsMon(response, "Ogerpon-Hearthflame");
        AnalyticsDTO.PokemonMoveStats raging = getMoveUsageStatsMon(response, "Raging Bolt");
        AnalyticsDTO.PokemonMoveStats urshi = getMoveUsageStatsMon(response, "Urshifu-Rapid-Strike");

        assertEquals(2, getUseCount(pao, "Sacred Sword"));
        assertEquals(67, getUseRate(pao, "Sacred Sword"));
        assertEquals(1, getUseCount(pao, "Protect"));
        assertEquals(33, getUseRate(pao, "Protect"));

        assertEquals(20, getUseCount(grimm, "Spirit Break"));
        assertEquals(48, getUseRate(grimm, "Spirit Break"));
        assertEquals(12, getUseCount(grimm, "Thunder Wave"));
        assertEquals(29, getUseRate(grimm, "Thunder Wave"));
        assertEquals(8, getUseCount(grimm, "Light Screen"));
        assertEquals(19, getUseRate(grimm, "Light Screen"));
        assertEquals(2, getUseCount(grimm, "Reflect"));
        assertEquals(5, getUseRate(grimm, "Reflect"));

        assertEquals(8, getUseCount(lando, "Protect"));
        assertEquals(40, getUseRate(lando, "Protect"));
        assertEquals(5, getUseCount(lando, "Sandsear Storm"));
        assertEquals(25, getUseRate(lando, "Sandsear Storm"));
        assertEquals(4, getUseCount(lando, "Earth Power"));
        assertEquals(20, getUseRate(lando, "Earth Power"));
        assertEquals(3, getUseCount(lando, "Sludge Bomb"));
        assertEquals(15, getUseRate(lando, "Sludge Bomb"));

        assertEquals(13, getUseCount(oger, "Ivy Cudgel"));
        assertEquals(10, getUseCount(oger, "Follow Me"));
        assertEquals(9, getUseCount(oger, "Spiky Shield"));
        assertEquals(1, getUseCount(oger, "Wood Hammer"));

        assertEquals(39, getUseRate(oger, "Ivy Cudgel"));
        assertEquals(30, getUseRate(oger, "Follow Me"));
        assertEquals(27, getUseRate(oger, "Spiky Shield"));
        assertEquals(3, getUseRate(oger, "Wood Hammer"));

        assertEquals(6, getUseCount(raging, "Dragon Pulse"));
        assertEquals(4, getUseCount(raging, "Thunderclap"));
        assertEquals(4, getUseCount(raging, "Electroweb"));
        assertEquals(1, getUseCount(raging, "Volt Switch"));

        assertEquals(40, getUseRate(raging, "Dragon Pulse"));
        assertEquals(27, getUseRate(raging, "Thunderclap"));
        assertEquals(27, getUseRate(raging, "Electroweb"));
        assertEquals(7, getUseRate(raging, "Volt Switch"));

        assertEquals(3, getUseCount(urshi, "Surging Strikes"));
        assertEquals(3, getUseCount(urshi, "Detect"));
        assertEquals(3, getUseCount(urshi, "Close Combat"));

        assertEquals(33, getUseRate(urshi, "Surging Strikes"));
        assertEquals(33, getUseRate(urshi, "Detect"));
        assertEquals(33, getUseRate(urshi, "Close Combat"));


    }
}