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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for ReplayService Bo3 functionality
 * Uses local JSON files to avoid internet dependency
 */
@SpringBootTest
@Transactional
class ReplayServiceTest {

    @Autowired
    private ReplayService replayService;

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
    private Team testTeam;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("hashed_password");
        testUser = userRepository.save(testUser);

        // Create test team
        testTeam = new Team();
        testTeam.setName("Test Team");
        testTeam.setPokepaste("https://pokepast.es/test");
        testTeam.setRegulation("Reg F");
        testTeam.setUser(testUser);
        testTeam = teamRepository.save(testTeam);
    }

    /**
     * Helper method to load battle log JSON from file
     */
    private String loadReplayJson(String filepath) throws IOException {
        return Files.readString(Paths.get("src/test/resources/replays/" + filepath));
    }

    /**
     * Helper method to create a replay from a local JSON file
     */
    private Replay createReplayFromJson(String filepath) throws IOException {
        String battleLogJson = loadReplayJson(filepath);

        Replay replay = new Replay();
        replay.setUrl("file://" + filepath); // Use file path as URL to ensure uniqueness
        replay.setBattleLog(battleLogJson);
        replay.setDate(LocalDateTime.now());

        return replayService.createReplay(replay, testTeam.getId());
    }

    @Test
    void testCreateReplay_Bo1() throws IOException {
        String bo1Path = "/bo1/bothtera.json";

        Replay replay = createReplayFromJson(bo1Path);

        assertNotNull(replay);
        assertNotNull(replay.getId());
        assertNull(replay.getGameNumber(), "Bo1 replay should have null gameNumber");
        assertNull(replay.getMatch(), "Bo1 replay should not be associated with a match");
        assertTrue(replay.isBo1());
        assertFalse(replay.isBo3());
        assertFalse(replay.isPartOfMatch());
    }

    @Test
    void testCreateMultipleBo1Replays() throws IOException {
        String bo1Path1 = "bo1/bothtera.json";
        String bo1Path2 = "bo1/maus.json";

        Replay replay1 = createReplayFromJson(bo1Path1);
        Replay replay2 = createReplayFromJson(bo1Path2);

        assertNull(replay1.getGameNumber());
        assertNull(replay2.getGameNumber());
        assertNull(replay1.getMatch());
        assertNull(replay2.getMatch());
    }

    @Test
    void testCreateBo3Replays_BulkImport_InOrder() throws IOException {
        String game1Path = "raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json";
        String game2Path = "raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json";
        String game3Path = "raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json";

        // Import all 3 games in order
        Replay game1 = createReplayFromJson(game1Path);
        Replay game2 = createReplayFromJson(game2Path);
        Replay game3 = createReplayFromJson(game3Path);

        // Assert game numbers
        assertEquals(1, game1.getGameNumber(), "Should be game 1");
        assertEquals(2, game2.getGameNumber(), "Should be game 2");
        assertEquals(3, game3.getGameNumber(), "Should be game 3");

        // Assert all are Bo3
        assertTrue(game1.isBo3());
        assertTrue(game2.isBo3());
        assertTrue(game3.isBo3());

        // Assert all are part of a match
        assertNotNull(game1.getMatch(), "Game 1 should be part of a match");
        assertNotNull(game2.getMatch(), "Game 2 should be part of a match");
        assertNotNull(game3.getMatch(), "Game 3 should be part of a match");

        // Assert all belong to the SAME match
        Long matchId = game1.getMatch().getId();
        assertEquals(matchId, game2.getMatch().getId(), "Game 2 should have same match ID");
        assertEquals(matchId, game3.getMatch().getId(), "Game 3 should have same match ID");

        // Verify match has all 3 replays
        Match match = matchRepository.findById(matchId).orElseThrow();
        List<Replay> matchReplays = replayRepository.findByMatchId(matchId);
        assertEquals(3, matchReplays.size(), "Match should have 3 replays");

        // Verify match belongs to correct team
        assertEquals(testTeam.getId(), match.getTeam().getId());
    }


    @Test
    void testCreateBo3Replays_OneByOne_Game2First() throws IOException {
        String game1Path = "raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json";
        String game2Path = "raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json";
        String game3Path = "raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json";

        // Import Game 2 first
        Replay game2 = createReplayFromJson(game2Path);
        assertEquals(2, game2.getGameNumber());
        assertNotNull(game2.getMatch(), "Game 2 should create a match");
        Long matchId = game2.getMatch().getId();

        // Import Game 1 second
        Replay game1 = createReplayFromJson(game1Path);
        assertEquals(1, game1.getGameNumber());
        assertNotNull(game1.getMatch(), "Game 1 should be associated with match");
        assertEquals(matchId, game1.getMatch().getId(), "Game 1 should join Game 2's match");

        // Import Game 3 third
        Replay game3 = createReplayFromJson(game3Path);
        assertEquals(3, game3.getGameNumber());
        assertNotNull(game3.getMatch(), "Game 3 should be associated with match");
        assertEquals(matchId, game3.getMatch().getId(), "Game 3 should join the same match");

        // Verify all replays in same match
        List<Replay> matchReplays = replayRepository.findByMatchId(matchId);
        assertEquals(3, matchReplays.size());
    }

    @Test
    void testCreateBo3Replays_OneByOne_Game3First() throws IOException {
        String game1Path = "raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json";
        String game2Path = "raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json";
        String game3Path = "raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json";

        // Import Game 3 first
        Replay game3 = createReplayFromJson(game3Path);
        assertEquals(3, game3.getGameNumber());
        Long matchId = game3.getMatch().getId();

        // Import Game 1 second
        Replay game1 = createReplayFromJson(game1Path);
        assertEquals(1, game1.getGameNumber());
        assertEquals(matchId, game1.getMatch().getId());

        // Import Game 2 third
        Replay game2 = createReplayFromJson(game2Path);
        assertEquals(2, game2.getGameNumber());
        assertEquals(matchId, game2.getMatch().getId());

        // All should be in same match
        List<Replay> matchReplays = replayRepository.findByMatchId(matchId);
        assertEquals(3, matchReplays.size());
    }

    @Test
    void testCreateBo3Replays_OneByOne_ReverseOrder() throws IOException {
        String game1Path = "raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json";
        String game2Path = "raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json";
        String game3Path = "raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json";

        // Import in reverse order: 3, 2, 1
        Replay game3 = createReplayFromJson(game3Path);
        Replay game2 = createReplayFromJson(game2Path);
        Replay game1 = createReplayFromJson(game1Path);

        // All should have same match
        Long matchId = game3.getMatch().getId();
        assertEquals(matchId, game2.getMatch().getId());
        assertEquals(matchId, game1.getMatch().getId());

        // Verify game numbers are correct
        assertEquals(1, game1.getGameNumber());
        assertEquals(2, game2.getGameNumber());
        assertEquals(3, game3.getGameNumber());
    }

    @Test
    void testCreateMixedReplays_Bo1AndBo3() throws IOException {
        String bo1Path = "bo1/bothtera.json";
        String bo3Game1Path = "kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json";
        String bo3Game2Path = "kuronisa/gen9vgc2026regfbo3-2493191775-5bm1cmanmkw9mcmnt9lv8u4txtuhu9upw.json";

        // Import Bo1
        Replay bo1 = createReplayFromJson(bo1Path);

        // Import Bo3 Game 1
        Replay game1 = createReplayFromJson(bo3Game1Path);

        // Import Bo3 Game 2
        Replay game2 = createReplayFromJson(bo3Game2Path);

        // Bo1 should not be part of match
        assertNull(bo1.getGameNumber());
        assertNull(bo1.getMatch());

        // Bo3 games should be matched together
        assertNotNull(game1.getMatch());
        assertNotNull(game2.getMatch());
        assertEquals(game1.getMatch().getId(), game2.getMatch().getId());

        // Bo1 and Bo3 should have different (or null) match IDs
        assertNotEquals(bo1.getMatch(), game1.getMatch());
    }


    @Test
    void testCreateMultipleBo3Sets() throws IOException {
        // Match 1
        String match1Game1 = "kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json";
        String match1Game2 = "kuronisa/gen9vgc2026regfbo3-2493191775-5bm1cmanmkw9mcmnt9lv8u4txtuhu9upw.json";

        // Match 2
        String match2Game1 = "lunger/gen9vgc2026regfbo3-2493174548-tb9i5jswp3t1b9c3074bi0e032blu6kpw.json";
        String match2Game2 = "lunger/gen9vgc2026regfbo3-2493176568-j1ucg2knvi4024jl0nrvgi7hs76jy6npw.json";

        // Import Match 1
        Replay m1g1 = createReplayFromJson(match1Game1);
        Replay m1g2 = createReplayFromJson(match1Game2);

        // Import Match 2
        Replay m2g1 = createReplayFromJson(match2Game1);
        Replay m2g2 = createReplayFromJson(match2Game2);

        // Match 1 games should be together
        assertNotNull(m1g1.getMatch());
        assertNotNull(m1g2.getMatch());
        assertEquals(m1g1.getMatch().getId(), m1g2.getMatch().getId());

        // Match 2 games should be together
        assertNotNull(m2g1.getMatch());
        assertNotNull(m2g2.getMatch());
        assertEquals(m2g1.getMatch().getId(), m2g2.getMatch().getId());

        // Match 1 and Match 2 should be DIFFERENT matches
        assertNotEquals(m1g1.getMatch().getId(), m2g1.getMatch().getId());

        // Verify we have exactly 2 matches
        long matchCount = matchRepository.count();
        assertEquals(2, matchCount, "Should have created exactly 2 matches");
    }


    @Test
    void testCreateReplay_DuplicateUrl() throws IOException {
        String path = "kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json";

        // Create first replay
        createReplayFromJson(path);

        // Attempt to create duplicate (same file path = same URL)
        assertThrows(IllegalArgumentException.class, () -> {
            createReplayFromJson(path);
        }, "Should throw exception for duplicate URL");
    }

    @Test
    void testCreateReplay_InvalidTeamId() throws IOException {
        String battleLogJson = loadReplayJson("kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json");

        Replay replay = new Replay();
        replay.setUrl("file://test");
        replay.setBattleLog(battleLogJson);
        replay.setDate(LocalDateTime.now());

        assertThrows(IllegalArgumentException.class, () -> {
            replayService.createReplay(replay, 99999L);
        }, "Should throw exception for invalid team ID");
    }

    @Test
    void testBo3Replays_PartialSet() throws IOException {
        String game1Path = "raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json";
        String game2Path = "raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json";
        // Note: Game 3 NOT imported
        //String game3Path = "raohed/gen9vgc2026regfbo3-2493794500-fcg4pydu0hsbws6jxslm8ilb1w72edqpw.json";


        Replay game1 = createReplayFromJson(game1Path);
        Replay game2 = createReplayFromJson(game2Path);

        // Both should still be matched together
        assertNotNull(game1.getMatch());
        assertNotNull(game2.getMatch());
        assertEquals(game1.getMatch().getId(), game2.getMatch().getId());

        // Match should only have 2 replays
        List<Replay> matchReplays = replayRepository.findByMatchId(game1.getMatch().getId());
        assertEquals(2, matchReplays.size(), "Partial Bo3 set should still create match with 2 replays");
    }

    // ==================== Replay Reprocessing Tests ====================

    @Test
    void testReprocessReplays_WrongUsername_FixesToCorrect() throws IOException {
        // bothtera.json has players "larry ayuso" and "surgevgc", winner is "surgevgc"
        // Set team username to "larry ayuso" so opponent=surgevgc, result=loss
        testTeam.addShowdownUsername("larry ayuso");
        testTeam = teamRepository.save(testTeam);

        Replay replay = createReplayFromJson("bo1/bothtera.json");
        replay.setOpponent("surgevgc");
        replay.setResult("loss");
        replayRepository.save(replay);

        assertEquals("surgevgc", replay.getOpponent());
        assertEquals("loss", replay.getResult());

        // Now reprocess with "surgevgc" as the user — should flip opponent and result
        int modified = replayService.reprocessReplaysForTeam(
                testTeam.getId(), List.of("surgevgc"));

        assertEquals(1, modified, "Should have modified 1 replay");

        Replay reloaded = replayRepository.findById(replay.getId()).orElseThrow();
        assertEquals("larry ayuso", reloaded.getOpponent(), "Opponent should now be larry ayuso");
        assertEquals("win", reloaded.getResult(), "Result should now be win");
    }

    @Test
    void testReprocessReplays_AlreadyCorrect_NoChanges() throws IOException {
        // Set username to "surgevgc" and set correct opponent/result
        testTeam.addShowdownUsername("surgevgc");
        testTeam = teamRepository.save(testTeam);

        Replay replay = createReplayFromJson("bo1/bothtera.json");
        replay.setOpponent("larry ayuso");
        replay.setResult("win");
        replayRepository.save(replay);

        // Reprocess with the same username — nothing should change
        int modified = replayService.reprocessReplaysForTeam(
                testTeam.getId(), List.of("surgevgc"));

        assertEquals(0, modified, "Should have modified 0 replays");
    }

    @Test
    void testReprocessReplays_EmptyBattleLog_Skipped() {
        // Create a replay with empty battleLog
        Replay replay = new Replay();
        replay.setUrl("file://empty-battlelog-test");
        replay.setBattleLog("");
        replay.setOpponent("someone");
        replay.setResult("win");
        replay.setDate(LocalDateTime.now());
        replay.setTeam(testTeam);
        replayRepository.save(replay);

        int modified = replayService.reprocessReplaysForTeam(
                testTeam.getId(), List.of("testuser"));

        assertEquals(0, modified, "Should skip replays with empty battleLog");
    }

    @Test
    void testReprocessReplays_EmptyTeam_ReturnsZero() {
        int modified = replayService.reprocessReplaysForTeam(
                testTeam.getId(), List.of("testuser"));

        assertEquals(0, modified, "Empty team should return 0 modified");
    }

    @Test
    void testReprocessReplays_MatchOpponentUpdated() throws IOException {
        // Use Bo3 replays so a Match entity is created
        testTeam.addShowdownUsername("raohed");
        testTeam = teamRepository.save(testTeam);

        Replay game1 = createReplayFromJson(
                "raohed/gen9vgc2026regfbo3-2493790533-fl8jvhcfyt5ro0vlwdvpc9pq4iqxjmfpw.json");
        Replay game2 = createReplayFromJson(
                "raohed/gen9vgc2026regfbo3-2493792545-xmgmwjyed586p8xa20jmstvt8lh53frpw.json");

        assertNotNull(game1.getMatch(), "Should have a match");
        Long matchId = game1.getMatch().getId();

        // Force wrong opponent/result on both replays
        game1.setOpponent("WRONG_OPPONENT");
        game1.setResult("win");
        game2.setOpponent("WRONG_OPPONENT");
        game2.setResult("win");
        replayRepository.save(game1);
        replayRepository.save(game2);

        // Reprocess
        int modified = replayService.reprocessReplaysForTeam(
                testTeam.getId(), List.of("raohed"));

        assertTrue(modified > 0, "Should have modified replays");

        // Verify match opponent was updated
        Match match = matchRepository.findById(matchId).orElseThrow();
        assertNotEquals("WRONG_OPPONENT", match.getOpponent(),
                "Match opponent should have been updated from WRONG_OPPONENT");
    }

    @Test
    void testReprocessReplays_ViaAddShowdownUsername() throws IOException {
        // bothtera.json: players "larry ayuso" and "surgevgc", winner "surgevgc"
        // Start with no username — defaults to player1 ("larry ayuso")
        Replay replay = createReplayFromJson("bo1/bothtera.json");
        replay.setOpponent("surgevgc");
        replay.setResult("loss");
        replayRepository.save(replay);

        // Add "surgevgc" via TeamService — should trigger reprocessing
        teamService.addShowdownUsername(testTeam.getId(), testUser.getId(), "surgevgc");

        Replay reloaded = replayRepository.findById(replay.getId()).orElseThrow();
        assertEquals("larry ayuso", reloaded.getOpponent(),
                "After adding surgevgc as username, opponent should be larry ayuso");
        assertEquals("win", reloaded.getResult(),
                "After adding surgevgc as username, result should be win");
    }
}