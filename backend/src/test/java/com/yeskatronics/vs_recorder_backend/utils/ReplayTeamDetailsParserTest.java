package com.yeskatronics.vs_recorder_backend.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ReplayTeamDetailsParserTest {
    private static final List<String> TEAM =
            List.of("Charizard", "Incineroar", "Rillaboom", "Urshifu-*", "Amoonguss", "Farigiraf");

    private ReplayMatcher.BattleData parse(String log) throws Exception {
        return ReplayMatcher.extractBattleData(new ObjectMapper().writeValueAsString(Map.of("log", log)), List.of());
    }

    @Test
    void readsAllPackedMembersAndItemsIncludingNicknamesAndEmptyItems() throws Exception {
        String preview = String.join("\n", TEAM.stream().map(s -> "|poke|p2|" + s + ", L50").toList());
        String sheet = "|showteam|p2|Sunny|Charizard|CharizarditeY|Blaze|HeatWave]"
                + "Incineroar||SitrusBerry|Intimidate|FakeOut]Rillaboom|||GrassySurge|FakeOut]"
                + "Water Bear|Urshifu-Rapid-Strike|MysticWater|UnseenFist|SurgingStrikes]"
                + "Amoonguss||RockyHelmet|Regenerator|Spore]Farigiraf||SafetyGoggles|ArmorTail|TrickRoom";
        var data = parse(preview + "\n" + sheet);
        var details = data.getTeamDetails().get("p2");
        assertEquals(6, details.size());
        assertEquals("Charizard", details.get(0).getSpecies());
        assertEquals("CharizarditeY", details.get(0).getItem());
        assertEquals("", details.get(2).getItem());
        assertEquals("Urshifu-Rapid-Strike", details.get(3).getSpecies());
        assertEquals("SafetyGoggles", details.get(5).getItem());
        assertEquals("Urshifu-Rapid-Strike", data.getTeams().get("p2").get(3));
    }

    @Test
    void keepsUnrevealedItemsUnknownAndUsesMegaEvidenceWithoutTransferredItems() {
        String log = "|-mega|p2a: Nickname|Charizard|Charizardite Y\n"
                + "|-item|p2b: Incineroar|Leftovers|[from] move: Trick\n";
        var details = ReplayTeamDetailsParser.parse(log, Map.of("p2", TEAM)).get("p2");
        assertEquals("Charizardite Y", details.get(0).getItem());
        assertNull(details.get(1).getItem());
        assertEquals("Urshifu-*", details.get(3).getSpecies());
    }

    @Test
    void malformedSheetDoesNotPretendItemsAreKnown() {
        var details = ReplayTeamDetailsParser.parse("|showteam|p2|Charizard||CharizarditeY]broken", Map.of("p2", TEAM)).get("p2");
        assertEquals(6, details.size());
        assertTrue(details.stream().allMatch(m -> m.getItem() == null));
    }

    @Test
    void existingUploadsExposeBothMegaStonesEvenWhenOnlyOneWasUsed() throws Exception {
        String json = Files.readString(Path.of("src/test/resources/replays/issue160-followup/game1.json"));
        var data = ReplayMatcher.extractBattleData(json, List.of());
        var details = data.getTeamDetails().get("p1");
        assertEquals("CharizarditeY", details.stream().filter(m -> m.getSpecies().equals("Charizard")).findFirst().orElseThrow().getItem());
        assertEquals("Floettite", details.stream().filter(m -> m.getSpecies().equals("Floette-Eternal")).findFirst().orElseThrow().getItem());
    }

    @Test
    void capturesMegaZWithoutCollapsingItToAnotherMega() throws Exception {
        var data = parse("|poke|p1|Absol, L50\n|switch|p1a: Fluffy|Absol, L50\n"
                + "|detailschange|p1a: Fluffy|Absol-Mega-Z, L50\n|-mega|p1a: Fluffy|Absol|Absolite Z");
        assertEquals("Absol-Mega-Z", data.getMegaEvents().get("p1").get(0).getMegaForme());
        assertEquals("Absolite Z", data.getTeamDetails().get("p1").get(0).getItem());
    }

    @Test
    void keepsHiddenCrownedFormesUncertainUntilTheyAreRevealed() {
        var teams = Map.of("p2", List.of("Zamazenta"));
        assertEquals("Zamazenta-*", ReplayTeamDetailsParser.parse("", teams).get("p2").get(0).getSpecies());
        String reveal = "|switch|p2a: Dog|Zamazenta, L50\n|detailschange|p2a: Dog|Zamazenta-Crowned, L50";
        assertEquals("Zamazenta-Crowned", ReplayTeamDetailsParser.parse(reveal, teams).get("p2").get(0).getSpecies());
    }
}
