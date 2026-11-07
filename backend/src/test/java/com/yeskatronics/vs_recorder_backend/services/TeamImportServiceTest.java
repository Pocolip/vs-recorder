package com.yeskatronics.vs_recorder_backend.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Validation rules for opponent pokepastes in imported team exports.
 */
class TeamImportServiceTest {

    private static final String SHEET = """
            Raichu @ Raichunite Y
            Ability: Lightning Rod
            Timid Nature
            - Zap Cannon
            - Protect

            Kommo-o
            - Clanging Scales
            """;

    @Test
    void acceptsSupportedPasteUrls() {
        assertTrue(TeamImportService.isValidOpponentPaste("https://pokepast.es/f923016c52691ce2"));
        assertTrue(TeamImportService.isValidOpponentPaste("https://pokebin.com/abc123"));
        assertTrue(TeamImportService.isValidOpponentPaste("https://vrpastes.com/abc123"));
    }

    @Test
    void acceptsInlineOpenTeamsheetText() {
        assertTrue(TeamImportService.isValidOpponentPaste(SHEET));
    }

    @Test
    void rejectsUnsupportedUrls() {
        assertFalse(TeamImportService.isValidOpponentPaste("https://evil.example/paste"));
        assertFalse(TeamImportService.isValidOpponentPaste("http://pokepast.es/abc123"));
        assertFalse(TeamImportService.isValidOpponentPaste("HTTPS://evil.example/a\nb"));
    }

    @Test
    void rejectsSingleLineTextAndOversizedSheets() {
        assertFalse(TeamImportService.isValidOpponentPaste("Pikachu"));
        assertFalse(TeamImportService.isValidOpponentPaste(SHEET.repeat(200)));
    }
}
