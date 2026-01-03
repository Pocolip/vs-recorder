package com.yeskatronics.vs_recorder_backend.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test ReplayMatcher with real Bo3 battle logs
 */
class ReplayMatcherTest {

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
}