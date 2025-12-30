package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.ShowdownDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.assertj.core.api.Fail.fail;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@SpringBootTest
class ShowdownServiceTest {

    @Autowired
    private ShowdownService showdownService;

    @MockitoBean
    private RestTemplate restTemplate;

    private String loadTestFile(String filename) {
        try {
            Path path = Paths.get("src/test/resources/replays", filename);
            return Files.readString(path);
        } catch (IOException e) {
            fail("Could not load test file: " + filename);
            return null;
        }
    }

    @Test
    void testFetchReplayData_withValidUrl_shouldParseCorrectly() {
        // Given: Load your saved replay JSON from file
        String replayJson =
                loadTestFile(
                        "bad/bad.json");
        when(restTemplate.getForObject(anyString(), eq(String.class)))
                .thenReturn(replayJson);

        // When: Fetch replay data
        ShowdownDTO.ReplayData result = showdownService.fetchReplayData(
                "https://replay.pokemonshowdown.com/gen9vgc2025-12345",
                List.of("mofonguero")
        );

        // Then: Verify correct parsing
        assertNotNull(result);
        assertEquals("Kuronisa1332", result.getOpponent());
        assertEquals("win", result.getResult());
        assertEquals("[Gen 9] VGC 2026 Reg F (Bo3)", result.getFormat());
        assertNotNull(result.getBattleLog());
        assertNotNull(result.getDate());
    }


}