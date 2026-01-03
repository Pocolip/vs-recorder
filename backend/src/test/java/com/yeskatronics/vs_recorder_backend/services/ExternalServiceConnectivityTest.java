package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.dto.ShowdownDTO;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for external service connectivity.
 *
 * These tests make actual HTTP requests to external services and are disabled by default
 * to avoid network dependencies during normal builds.
 *
 * To run these tests:
 * 1. Remove @Disabled annotation from the test method
 * 2. Run the specific test
 * 3. Re-enable @Disabled when done
 */
@SpringBootTest
@Slf4j
class ExternalServiceConnectivityTest {

    @Autowired
    private ShowdownService showdownService;

    @Autowired
    private PokepasteService pokepasteService;

    private final RestTemplate restTemplate = new RestTemplate();

    // ==================== Pokemon Showdown Tests ====================

    @Test
    @Disabled("Enable manually to test Pokemon Showdown connectivity")
    void testShowdownReplayFetch() {
        String testReplayUrl =
                "https://replay.pokemonshowdown.com/gen9vgc2026regf-2497886991-lhkjlbj27mv7j0abg9980qu601bm9cipw";

        try {
            ShowdownDTO.ReplayData battleLog =
                    showdownService.fetchReplayData(testReplayUrl, List.of("genshinmintpicker"));

            assertNotNull(battleLog, "Battle log should not be null");
            assertFalse(battleLog.getBattleLog().isEmpty(),
                    "Battle log should not be empty");
            log.info(battleLog.getBattleLog());
            assertTrue(battleLog.getBattleLog().contains("|tier|"),
                    "Battle log should contain tier information");

            log.info("✅ Pokemon Showdown connectivity: SUCCESS");
            log.info("Battle log length: " + battleLog.getBattleLog().length() + " characters");
        } catch (Exception e) {
            fail("Failed to fetch replay from Pokemon Showdown: " + e.getMessage());
        }
    }

    @Test
    @Disabled("Enable manually to test Pokemon Showdown base URL connectivity")
    void testShowdownBaseUrlConnectivity() {
        String baseUrl = "https://replay.pokemonshowdown.com";

        try {
            String response = restTemplate.getForObject(baseUrl, String.class);

            assertNotNull(response, "Response should not be null");
            log.info("✅ Pokemon Showdown base URL: REACHABLE");
        } catch (RestClientException e) {
            fail("Failed to connect to Pokemon Showdown: " + e.getMessage());
        }
    }

    // ==================== Pokepaste Tests ====================

    @Test
    @Disabled("Enable manually to test Pokepaste connectivity")
    void testPokepasteFetch() {
        String testPokepasteUrl = "https://pokepast.es/266824d87d906423";

        try {
            PokepasteDTO.PasteData pokepaste = pokepasteService.fetchPasteData(testPokepasteUrl);

            assertNotNull(pokepaste, "Pokepaste should not be null");
            assertFalse(pokepaste.getRawText().isEmpty(), "Pokepaste should not be empty");

            log.info("✅ Pokepaste connectivity: SUCCESS");
            log.info("Pokepaste length: " + pokepaste.getRawText().length() + " characters");
            log.info("First 200 chars: " +
                    pokepaste.getRawText().substring(0, Math.min(200, pokepaste.getRawText().length())));
        } catch (Exception e) {
            fail("Failed to fetch pokepaste: " + e.getMessage());
        }
    }

    @Test
    @Disabled("Enable manually to test Pokepaste base URL connectivity")
    void testPokepasteBaseUrlConnectivity() {
        String baseUrl = "https://pokepast.es";

        try {
            String response = restTemplate.getForObject(baseUrl, String.class);

            assertNotNull(response, "Response should not be null");
            log.info("✅ Pokepaste base URL: REACHABLE");
        } catch (RestClientException e) {
            fail("Failed to connect to Pokepaste: " + e.getMessage());
        }
    }

    // ==================== Pokebin Tests ====================

    @Test
    @Disabled("Enable manually to test Pokebin connectivity")
    void testPokebinFetch() {
        // Real example: https://pokebin.com/d4676db5cadc473f
        // JSON endpoint: https://pokebin.com/d4676db5cadc473f/json
        String testPokebinUrl = "https://pokebin.com/d4676db5cadc473f";

        try {
            String jsonUrl = testPokebinUrl + "/json";
            String response = restTemplate.getForObject(jsonUrl, String.class);

            assertNotNull(response, "Response should not be null");
            assertFalse(response.isEmpty(), "Response should not be empty");
            assertTrue(response.contains("\"content\""), "Response should contain 'content' field");
            assertTrue(response.contains("\"data\""), "Response should contain 'data' field");

            System.out.println("✅ Pokebin JSON endpoint: SUCCESS");
            System.out.println("Response length: " + response.length() + " characters");

            // Try to parse the content field
            if (response.contains("Dragonite") || response.contains("@")) {
                System.out.println("✅ Contains valid Pokemon paste data");
            }
        } catch (RestClientException e) {
            fail("Failed to fetch from Pokebin: " + e.getMessage());
        }
    }

    @Test
    @Disabled("Enable manually to test Pokebin via PokepasteService")
    void testPokebinViaService() {
        // Test that PokepasteService can handle Pokebin URLs
        String testPokebinUrl = "https://pokebin.com/d4676db5cadc473f";

        try {
            // This should work if the service was updated correctly
            PokepasteDTO.PasteData result = pokepasteService.fetchPasteData(testPokebinUrl);

            assertNotNull(result, "Pokepaste should not be null");
            assertFalse(result.getRawText().isEmpty(), "Pokepaste should not be empty");
            assertTrue(result.getRawText().contains("@") || result.getRawText().contains("-"),
                    "Should contain Pokemon paste format markers");

            System.out.println("✅ Pokebin via PokepasteService: SUCCESS");
            System.out.println("Paste length: " + result.getRawText().length() + " characters");
            System.out.println("First 300 chars:\n" +
                    result.getRawText().substring(0, Math.min(300, result.getRawText().length())));
        } catch (Exception e) {
            fail("Failed to fetch Pokebin via PokepasteService: " + e.getMessage());
        }
    }

    @Test
    @Disabled("Enable manually to test Pokebin base URL connectivity")
    void testPokebinBaseUrlConnectivity() {
        String baseUrl = "https://pokebin.com";

        try {
            String response = restTemplate.getForObject(baseUrl, String.class);

            assertNotNull(response, "Response should not be null");
            System.out.println("✅ Pokebin base URL: REACHABLE");
        } catch (RestClientException e) {
            fail("Failed to connect to Pokebin: " + e.getMessage());
        }
    }

    // ==================== All Services Test ====================

    @Test
    @Disabled("Enable manually to test all external services at once")
    void testAllExternalServicesConnectivity() {
        System.out.println("\n========================================");
        System.out.println("Testing External Service Connectivity");
        System.out.println("========================================\n");

        // Test Pokemon Showdown
        try {
            restTemplate.getForObject("https://replay.pokemonshowdown.com", String.class);
            System.out.println("✅ Pokemon Showdown: REACHABLE");
        } catch (Exception e) {
            System.out.println("❌ Pokemon Showdown: FAILED - " + e.getMessage());
        }

        // Test Pokepaste
        try {
            restTemplate.getForObject("https://pokepast.es", String.class);
            System.out.println("✅ Pokepaste: REACHABLE");
        } catch (Exception e) {
            System.out.println("❌ Pokepaste: FAILED - " + e.getMessage());
        }

        // Test Pokebin
        try {
            restTemplate.getForObject("https://pokebin.com", String.class);
            System.out.println("✅ Pokebin: REACHABLE");
        } catch (Exception e) {
            System.out.println("❌ Pokebin: FAILED - " + e.getMessage());
        }

        System.out.println("\n========================================");
        System.out.println("External Service Test Complete");
        System.out.println("========================================\n");
    }

    // ==================== Helper Test ====================

    @Test
    @Disabled("Enable manually to test a specific URL")
    void testCustomUrl() {
        // Use this test to quickly check any URL
        String customUrl = "https://example.com";

        try {
            String response = restTemplate.getForObject(customUrl, String.class);

            assertNotNull(response, "Response should not be null");
            System.out.println("✅ Custom URL test: SUCCESS");
            System.out.println("Response length: " + response.length() + " characters");
            System.out.println("First 500 chars:\n" + response.substring(0, Math.min(500, response.length())));
        } catch (RestClientException e) {
            fail("Failed to fetch from custom URL: " + e.getMessage());
        }
    }
}