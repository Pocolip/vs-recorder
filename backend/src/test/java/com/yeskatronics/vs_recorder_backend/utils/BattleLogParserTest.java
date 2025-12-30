package com.yeskatronics.vs_recorder_backend.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static com.yeskatronics.vs_recorder_backend.utils.BattleLogParser.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Slf4j
class BattleLogParserTest {

    private ObjectMapper objectMapper = new ObjectMapper();

    // Helper to load test files
    private String loadTestFile(String filename) throws IOException {
        Path path = Paths.get("src/test/resources/replays", filename);
        return Files.readString(path);
    }

    @Test
    void testParseBattleLog_shouldExtractPlayersFromArray() throws IOException {
        // Load replay with "players": ["player1", "player2"]
        // Parse battle log
        // Assert player1 and player2 are extracted correctly
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json"));

        assertEquals("mofonguero", battleData.getPlayer1());
        assertEquals("Kuronisa1332", battleData.getPlayer2());
    }

    @Test
    void testParseBattleLog_withMissingPlayers_shouldHandleGracefully() throws IOException {
        // Test with empty or null players array
        // Should not crash, return empty BattleData
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bad/nousernames.json"));

        assertNull(battleData.getPlayer1());
        assertNull(battleData.getPlayer2());
    }

    @Test
    void testParseBattleLog_shouldExtractTeamSheets() throws IOException {
        // Load replay
        // Parse battle log
        // Assert p1Team has 6 Pokemon
        // Assert p2Team has 6 Pokemon
        // Verify specific Pokemon names

        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json"));

        log.info(battleData.getP1Team().toString());
        assertEquals("Grimmsnarl", battleData.getP1Team().get(0));
        assertEquals("Landorus", battleData.getP1Team().get(1));
        assertEquals("Urshifu", battleData.getP1Team().get(2));
        assertEquals("Ogerpon", battleData.getP1Team().get(3));
        assertEquals("Raging Bolt", battleData.getP1Team().get(4));
        assertEquals("Chien-Pao", battleData.getP1Team().get(5));

        log.info(battleData.getP2Team().toString());
        assertEquals("Articuno", battleData.getP2Team().get(0));
        assertEquals("Ninetales", battleData.getP2Team().get(1));
        assertEquals("Ogerpon", battleData.getP2Team().get(2));
        assertEquals("Raging Bolt", battleData.getP2Team().get(3));
        assertEquals("Arcanine", battleData.getP2Team().get(4));
        assertEquals("Landorus", battleData.getP2Team().get(5));
    }

    @Test
    void testParseBattleLog_shouldNormalizePokemonNames() throws IOException {
        // Test that "Urshifu-*, L50, F" becomes "Urshifu"
        // Test that "Terapagos-Stellar, L50" becomes "Terapagos"
        // Test that "Calyrex-Shadow, L50" stays "Calyrex-Shadow"
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/reggshadowvsice.json"));

        log.info(battleData.getP1Team().toString());
        log.info(battleData.getP1Leads().toString());
        log.info(battleData.getP1Picks().toString());
        assertTrue(battleData.getP1Team().contains("Urshifu"));
        assertTrue(battleData.getP1Leads().contains("Urshifu"));
        assertTrue(battleData.getP1Picks().contains("Urshifu"));

    }

    @Test
    void testParseBattleLog_shouldIdentifyPicks() throws IOException {
        // Parse battle log
        // Assert p1Picks has 4 Pokemon (those that switched in)
        // Assert p2Picks has 4 Pokemon
        // Verify picks match expected Pokemon

        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/reggshadowvsice.json"));

        assertTrue(battleData.getP1Picks().contains("Urshifu"));
        assertTrue(battleData.getP1Picks().contains("Incineroar"));
        assertTrue(battleData.getP1Picks().contains("Clefairy"));
        assertTrue(battleData.getP1Picks().contains("Calyrex"));

        assertTrue(battleData.getP1Leads().contains("Urshifu"));
        assertTrue(battleData.getP1Leads().contains("Incineroar"));

        assertTrue(battleData.getP2Picks().contains("Landorus"));
        assertTrue(battleData.getP2Picks().contains("Grimmsnarl"));
        assertTrue(battleData.getP2Picks().contains("Calyrex"));
        assertTrue(battleData.getP2Picks().contains("Raging Bolt"));

        assertTrue(battleData.getP2Leads().contains("Landorus"));
        assertTrue(battleData.getP2Leads().contains("Grimmsnarl"));

    }


    @Test
    void testParseBattleLog_shouldDetectTerastallization() throws IOException {
        // Load replay where p1 Teras
        // Assert p1Tera is set to correct Pokemon
        // Assert p2Tera is null (or the other way around)
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/pagos.json"));

        assertNull(battleData.getP1Tera());
        assertEquals("Terapagos", battleData.getP2Tera());

        battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/urshitera.json"));

        assertNull(battleData.getP1Tera());
        assertEquals("Urshifu", battleData.getP2Tera());

        battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/notera.json"));

        assertNull(battleData.getP1Tera());
        assertNull(battleData.getP2Tera());

        battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/bothtera.json"));

        assertEquals("Landorus", battleData.getP1Tera());
        assertEquals("Kyogre", battleData.getP2Tera());
    }


    @Test
    void testParseBattleLog_shouldTrackMoveUsage() throws IOException {
        // Parse battle log
        // Get moveUsage map
        // Assert specific Pokemon has specific moves
        // Example: Kyogre used "Protect" and "Origin Pulse"

        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/reggshadowvsice.json"));

        log.info(battleData.getP1MoveUsage().toString());
        assertTrue(battleData.getP1MoveUsage().get("Calyrex").contains("Calm Mind"));
        assertTrue(battleData.getP1MoveUsage().get("Calyrex").contains("Astral Barrage"));
        assertFalse(battleData.getP1MoveUsage().get("Calyrex").contains("Protect"));

        log.info(battleData.getP2MoveUsage().toString());
        assertTrue(battleData.getP2MoveUsage().get("Calyrex").contains("Protect"));
        assertFalse(battleData.getP2MoveUsage().get("Calyrex").contains("Calm Mind"));
        assertFalse(battleData.getP2MoveUsage().get("Calyrex").contains("Astral Barrage"));

    }

    @Test
    void testParseBattleLog_shouldNotDuplicateMoves() throws IOException {
        // If Pokemon uses same move multiple times
        // Should only appear once in the Set
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/reggshadowvsice.json"));

        // cm is used twice but we only want one instance
        long calmMindCount = battleData
                        .getP1MoveUsage()
                        .get("Calyrex")
                        .stream()
                        .filter("Calm Mind"::equals).count();
        log.info(String.valueOf(calmMindCount));
        assertEquals(1, calmMindCount);

    }

    @Test
    void testGetPokemonMoves_shouldReturnMovesForPokemon() throws IOException {
        // Parse battle log
        // Call BattleLogParser.getPokemonMoves(data, "Rillaboom")
        // Assert returned Set contains expected moves

        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json"));

        assertTrue(BattleLogParser.getPokemonMoves(battleData, "Raging Bolt", "mofonguero").isEmpty());
        assertTrue(BattleLogParser.getPokemonMoves(battleData, "Ogerpon", "mofonguero")
                .contains("Ivy Cudgel"));
        assertTrue(BattleLogParser.getPokemonMoves(battleData, "Ogerpon", "mofonguero")
                .contains("Spiky Shield"));
    }

    @Test
    void testParseBattleLog_shouldExtractWinner() throws IOException {
        // Parse replay where player1 wins
        // Assert winner equals player1 name
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json"));

        assertEquals("mofonguero", battleData.getWinner());

        battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bad/nowinner.json"));

        assertNull(battleData.getWinner());
    }

    @Test
    void testParseBattleLog_shouldTrackTurnCount() throws IOException {
        // Parse battle log
        // Assert turnCount matches highest turn number in log
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/kuronisa/gen9vgc2026regfbo3-2493189799-ne46kfyk1lr0f9cmnl1gigtosox6ge2pw.json"));

        log.info(battleData.toString());
        assertEquals(11, battleData.getTurnCount());
    }

    @Test
    void testWasLead_shouldIdentifyLeadPokemon() throws IOException {
        // Parse battle log
        // Assert BattleLogParser.wasLead(data, "Tornadus", "p1") == true
        // Assert BattleLogParser.wasLead(data, "Miraidon", "p1") == false

        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/reggshadowvsice.json"));
        assertTrue(BattleLogParser.wasLead(battleData, "Urshifu", "p1"));
        assertTrue(BattleLogParser.wasLead(battleData, "Incineroar", "p1"));
        assertFalse(BattleLogParser.wasLead(battleData, "Landorus", "p1"));
        assertFalse(BattleLogParser.wasLead(battleData, "Grimmsnarl", "p1"));

        assertFalse(BattleLogParser.wasLead(battleData, "Urshifu", "p2"));
        assertFalse(BattleLogParser.wasLead(battleData, "Incineroar", "p2"));
        assertTrue(BattleLogParser.wasLead(battleData, "Landorus", "p2"));
        assertTrue(BattleLogParser.wasLead(battleData, "Grimmsnarl", "p2"));

    }

    @Test
    void testDidTerastallize_shouldIdentifyTeraPokemon() throws IOException {
        // Parse battle log
        // Assert BattleLogParser.didTerastallize(data, "Terapagos", "p2") == true
        // Assert BattleLogParser.didTerastallize(data, "Rillaboom", "p2") == false
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/pagos.json"));

        assertTrue(BattleLogParser.didTerastallize(battleData, "Terapagos", "p2"));
        assertFalse(BattleLogParser.didTerastallize(battleData, "Terapagos", "p1"));

        battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/urshitera.json"));

        assertTrue(BattleLogParser.didTerastallize(battleData, "Urshifu", "p2"));
        assertFalse(BattleLogParser.didTerastallize(battleData, "Terapagos", "p1"));


        battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/notera.json"));

        assertNull(battleData.getP1Tera());
        assertNull(battleData.getP2Tera());

        battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/bothtera.json"));

        assertTrue(BattleLogParser.didTerastallize(battleData, "Landorus", "p1"));
        assertTrue(BattleLogParser.didTerastallize(battleData, "Kyogre", "p2"));
        assertFalse(BattleLogParser.didTerastallize(battleData, "Landorus", "p2"));
        assertFalse(BattleLogParser.didTerastallize(battleData, "Kyogre", "p1"));

    }

    @Test
    void testGetPlayerPicks_shouldReturnCorrectPicks() throws IOException {
        // Parse battle log
        // Assert getPlayerPicks(data, "p1") returns 4 Pokemon
        // Assert getPlayerPicks(data, "p2") returns 4 Pokemon

        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/pagos.json"));

        assertEquals(2, getPlayerPicks(battleData, "p1").size());
        assertEquals(4, getPlayerPicks(battleData, "p2").size());
    }

    @Test
    void testGetOpponentPicks_shouldReturnOpponentsPokemon() throws IOException {
        // Parse battle log where player1 = "TheBig_Bro"
        // Assert getOpponentPicks(data, "TheBig_Bro") returns p2's picks
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/pagos.json"));

        assertEquals(2, getOpponentPicks(battleData, "ookkssiirr").size());
        assertEquals(4, getOpponentPicks(battleData, "platanera").size());
    }

    @Test
    void testGetOpponentTeam_shouldReturnOpponentsTeam() throws IOException {
        // Parse battle log
        // Assert getOpponentTeam(data, player1Name) returns p2Team
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/pagos.json"));

        log.info(getOpponentTeam(battleData, "ookkssiirr").toString());
        assertTrue(getOpponentTeam(battleData, "ookkssiirr").contains("Chien-Pao"));
        assertTrue(getOpponentTeam(battleData, "ookkssiirr").contains("Zacian"));
        assertTrue(getOpponentTeam(battleData, "ookkssiirr").contains("Rillaboom"));
        assertTrue(getOpponentTeam(battleData, "ookkssiirr").contains("Urshifu"));
        assertTrue(getOpponentTeam(battleData, "ookkssiirr").contains("Tornadus"));
        assertTrue(getOpponentTeam(battleData, "ookkssiirr").contains("Umbreon"));
        log.info(getOpponentTeam(battleData, "platanera").toString());
        assertTrue(getOpponentTeam(battleData, "platanera").contains("Terapagos"));
        assertTrue(getOpponentTeam(battleData, "platanera").contains("Ribombee"));
        assertTrue(getOpponentTeam(battleData, "platanera").contains("Alcremie"));
        assertTrue(getOpponentTeam(battleData, "platanera").contains("Smeargle"));
        assertTrue(getOpponentTeam(battleData, "platanera").contains("Slowpoke"));
        assertTrue(getOpponentTeam(battleData, "platanera").contains("Torkoal"));
    }

    @Test
    void testNormalizePokemonName_shouldHandleVariousFormats() {
        assertEquals("Urshifu", normalizePokemonName("Urshifu-*, L50, F"));
        assertEquals("Terapagos", normalizePokemonName("Terapagos-Stellar, L50"));
        assertEquals("Calyrex", normalizePokemonName("Calyrex-Shadow, L50"));
        assertEquals("Miraidon", normalizePokemonName("Miraidon, L50"));
        assertEquals("Rillaboom", normalizePokemonName("Rillaboom"));
        assertEquals("Ogerpon", normalizePokemonName("Ogerpon-Hearthflame, L50"));
        assertEquals("Ogerpon", normalizePokemonName("Ogerpon-Hearthflame-Tera, L50"));
    }

    @Test
    void testNormalizePokemonName_withNullOrEmpty_shouldHandleGracefully() {
        assertNull(normalizePokemonName(null));
        assertEquals("", normalizePokemonName(""));
    }

    @Test
    void testParseBattleLog_withMalformedJson_shouldHandleGracefully() throws IOException {
        // Test with invalid JSON
        // Should not crash, return empty BattleData
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bad/malformed.json"));

        assertEquals(0, battleData.getTurnCount());
        assertNull(battleData.getWinner());
        assertNull(battleData.getPlayer1());
    }

    @Test
    void testParseBattleLog_withIncompleteGame_shouldParseAvailableData() throws IOException {
        // Test with game that ended early (forfeit)
        // Should parse whatever data is available
        BattleLogParser.BattleData battleData =
                BattleLogParser.parseBattleLog(
                        loadTestFile(
                                "/bo1/bothtera.json"));

        assertEquals("surgevgc", battleData.getWinner());
    }
}