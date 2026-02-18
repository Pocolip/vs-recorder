package com.yeskatronics.vs_recorder_backend.utils;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test ReplayMatcher with real Bo3 battle logs
 */
class ReplayMatcherTest {

    private String loadTestFile(String filename) throws IOException {
        Path path = Paths.get("src/test/resources/replays", filename);
        return Files.readString(path);
    }

    // Sample from actual Bo3 - Game 1
    private static final String GAME1_LOG = """
            {
                "id": "gen9vgc2026regfbo3-2493790533",
                "log": "|tier|[Gen 9] VGC 2026 Reg F (Bo3)\\n|uhtml|bestof|<h2><strong>Game 1</strong> of <a href=\\"/game-bestof3-gen9vgc2026regfbo3-2493790532-owbra3llb90b5mu5sg8dkkq3yx8s6uqpw\\">a best-of-3</a></h2>\\n"
            }
            """;

    // Sample from actual Bo3 - Game 2
    private static final String GAME2_LOG = """
            {
                "id": "gen9vgc2026regfbo3-2493792545",
                "log": "|tier|[Gen 9] VGC 2026 Reg F (Bo3)\\n|uhtml|bestof|<h2><strong>Game 2</strong> of <a href=\\"/game-bestof3-gen9vgc2026regfbo3-2493790532-owbra3llb90b5mu5sg8dkkq3yx8s6uqpw\\">a best-of-3</a></h2>\\n"
            }
            """;

    // Sample from actual Bo3 - Game 3
    private static final String GAME3_LOG = """
            {
                "id": "gen9vgc2026regfbo3-2493794500",
                "log": "|tier|[Gen 9] VGC 2026 Reg F (Bo3)\\n|uhtml|bestof|<h2><strong>Game 3</strong> of <a href=\\"/game-bestof3-gen9vgc2026regfbo3-2493790532-owbra3llb90b5mu5sg8dkkq3yx8s6uqpw\\">a best-of-3</a></h2>\\n"
            }
            """;

    // Sample Bo1 replay
    private static final String BO1_LOG = """
            {
                "id": "gen9vgc2026regf-1234567890",
                "log": "|tier|[Gen 9] VGC 2026 Reg F\\n|start\\n"
            }
            """;

    @Test
    void testParseBattleLog_Game1() {
        ReplayMatcher.Bo3MatchInfo info = ReplayMatcher.parseBattleLog(GAME1_LOG);

        assertTrue(info.isBo3(), "Should detect Bo3");
        assertEquals(1, info.getGameNumber(), "Should be game 1");
        assertEquals("gen9vgc2026regfbo3-2493790532-owbra3llb90b5mu5sg8dkkq3yx8s6uqpw",
                info.getMatchId(), "Match ID should match");
    }

    @Test
    void testParseBattleLog_Game2() {
        ReplayMatcher.Bo3MatchInfo info = ReplayMatcher.parseBattleLog(GAME2_LOG);

        assertTrue(info.isBo3(), "Should detect Bo3");
        assertEquals(2, info.getGameNumber(), "Should be game 2");
        assertEquals("gen9vgc2026regfbo3-2493790532-owbra3llb90b5mu5sg8dkkq3yx8s6uqpw",
                info.getMatchId(), "Match ID should match");
    }

    @Test
    void testParseBattleLog_Game3() {
        ReplayMatcher.Bo3MatchInfo info = ReplayMatcher.parseBattleLog(GAME3_LOG);

        assertTrue(info.isBo3(), "Should detect Bo3");
        assertEquals(3, info.getGameNumber(), "Should be game 3");
        assertEquals("gen9vgc2026regfbo3-2493790532-owbra3llb90b5mu5sg8dkkq3yx8s6uqpw",
                info.getMatchId(), "Match ID should match");
    }

    @Test
    void testParseBattleLog_Bo1() {
        ReplayMatcher.Bo3MatchInfo info = ReplayMatcher.parseBattleLog(BO1_LOG);

        assertFalse(info.isBo3(), "Should detect Bo1");
        assertNull(info.getMatchId(), "Bo1 should have null match ID");
    }

    @Test
    void testIsBo3Replay() {
        assertTrue(ReplayMatcher.isBo3Replay(GAME1_LOG));
        assertTrue(ReplayMatcher.isBo3Replay(GAME2_LOG));
        assertTrue(ReplayMatcher.isBo3Replay(GAME3_LOG));
        assertFalse(ReplayMatcher.isBo3Replay(BO1_LOG));
    }

    @Test
    void testGetGameNumber() {
        assertEquals(1, ReplayMatcher.getGameNumber(GAME1_LOG));
        assertEquals(2, ReplayMatcher.getGameNumber(GAME2_LOG));
        assertEquals(3, ReplayMatcher.getGameNumber(GAME3_LOG));
        assertNull(ReplayMatcher.getGameNumber(BO1_LOG));
    }

    @Test
    void testGetMatchId() {
        String matchId = "gen9vgc2026regfbo3-2493790532-owbra3llb90b5mu5sg8dkkq3yx8s6uqpw";

        assertEquals(matchId, ReplayMatcher.getMatchId(GAME1_LOG));
        assertEquals(matchId, ReplayMatcher.getMatchId(GAME2_LOG));
        assertEquals(matchId, ReplayMatcher.getMatchId(GAME3_LOG));
        assertNull(ReplayMatcher.getMatchId(BO1_LOG));
    }

    @Test
    void testAreSameMatch() {
        // All 3 games are same match
        assertTrue(ReplayMatcher.areSameMatch(GAME1_LOG, GAME2_LOG));
        assertTrue(ReplayMatcher.areSameMatch(GAME2_LOG, GAME3_LOG));
        assertTrue(ReplayMatcher.areSameMatch(GAME1_LOG, GAME3_LOG));

        // Bo1 is not part of the match
        assertFalse(ReplayMatcher.areSameMatch(GAME1_LOG, BO1_LOG));
        assertFalse(ReplayMatcher.areSameMatch(BO1_LOG, GAME2_LOG));
    }

    @Test
    void testParseBattleLog_EmptyLog() {
        ReplayMatcher.Bo3MatchInfo info = ReplayMatcher.parseBattleLog("");

        assertFalse(info.isBo3());
        assertNull(info.getMatchId());
    }

    @Test
    void testParseBattleLog_NullLog() {
        ReplayMatcher.Bo3MatchInfo info = ReplayMatcher.parseBattleLog(null);

        assertFalse(info.isBo3());
        assertNull(info.getMatchId());
    }

    // ==========================================================================
    // extractBattleData tests
    // ==========================================================================

    /**
     * Real replay where both players have Ogerpon-Hearthflame and both terastallize.
     * After tera, subsequent |switch| lines show "Ogerpon-Hearthflame-Tera" which
     * must NOT be counted as a separate pick from "Ogerpon-Hearthflame".
     *
     * Source: gen9vgc2026regfbo3-2523396202
     */
    @Test
    void testExtractBattleData_ogerponTeraFormNotDuplicatedInPicks() throws IOException {
        String log = loadTestFile("bo1/ogerpon-tera.json");
        ReplayMatcher.BattleData data = ReplayMatcher.extractBattleData(log, List.of("jonnybeblood"));

        // p1 picks: Ogerpon-Hearthflame, Regidrago, Urshifu-Rapid-Strike, Rillaboom
        List<String> p1Picks = data.getActualPicks().get("p1");
        assertEquals(4, p1Picks.size(), "p1 should have exactly 4 picks");
        assertTrue(p1Picks.contains("Ogerpon-Hearthflame"),
                "p1 picks should contain Ogerpon-Hearthflame (not -Tera variant)");
        assertFalse(p1Picks.contains("Ogerpon-Hearthflame-Tera"),
                "p1 picks must NOT contain Ogerpon-Hearthflame-Tera as a separate entry");
        assertTrue(p1Picks.contains("Regidrago"));
        assertTrue(p1Picks.contains("Urshifu-Rapid-Strike"));
        assertTrue(p1Picks.contains("Rillaboom"));

        // p2 picks: Flutter Mane, Ogerpon-Hearthflame, Incineroar, Raging Bolt
        List<String> p2Picks = data.getActualPicks().get("p2");
        assertEquals(4, p2Picks.size(), "p2 should have exactly 4 picks");
        assertTrue(p2Picks.contains("Ogerpon-Hearthflame"),
                "p2 picks should contain Ogerpon-Hearthflame (not -Tera variant)");
        assertFalse(p2Picks.contains("Ogerpon-Hearthflame-Tera"),
                "p2 picks must NOT contain Ogerpon-Hearthflame-Tera as a separate entry");
    }

    @Test
    void testExtractBattleData_ogerponTeraPositionMappingResolved() throws IOException {
        String log = loadTestFile("bo1/ogerpon-tera.json");
        ReplayMatcher.BattleData data = ReplayMatcher.extractBattleData(log, List.of("jonnybeblood"));

        // Tera events should reference the team roster name, not the -Tera variant
        List<ReplayMatcher.TeraEvent> p1Tera = data.getTeraEvents().get("p1");
        assertEquals(1, p1Tera.size());
        assertEquals("Ogerpon-Hearthflame", p1Tera.get(0).getPokemon(),
                "Tera event should reference team roster name");
        assertEquals("fire", p1Tera.get(0).getType());

        List<ReplayMatcher.TeraEvent> p2Tera = data.getTeraEvents().get("p2");
        assertEquals(1, p2Tera.size());
        assertEquals("Ogerpon-Hearthflame", p2Tera.get(0).getPokemon(),
                "Tera event should reference team roster name");
    }

    @Test
    void testExtractBattleData_moveUsageUsesResolvedName() throws IOException {
        String log = loadTestFile("bo1/ogerpon-tera.json");
        ReplayMatcher.BattleData data = ReplayMatcher.extractBattleData(log, List.of("jonnybeblood"));

        // Moves used after tera should be tracked under "Ogerpon-Hearthflame", not "-Tera"
        var p1Moves = data.getMoveUsage().get("p1");
        assertTrue(p1Moves.containsKey("Ogerpon-Hearthflame"),
                "Move usage should be keyed by team roster name");
        assertFalse(p1Moves.containsKey("Ogerpon-Hearthflame-Tera"),
                "Move usage must NOT have a separate -Tera key");
    }
}