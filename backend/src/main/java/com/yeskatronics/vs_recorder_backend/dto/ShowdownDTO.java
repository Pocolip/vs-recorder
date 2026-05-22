package com.yeskatronics.vs_recorder_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs for Pokemon Showdown replay data.
 */
public class ShowdownDTO {

    /**
     * DTO for parsed replay data from Pokemon Showdown
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReplayData {
        private String battleLog;
        private String opponent;
        private String result; // "win" or "loss" from user pov
        private LocalDateTime date;
        private String format;
        private String player1;
        private String player2;
    }

    /**
     * DTO for a non-persisting bulk-import preview of a single replay. Carries the
     * team-of-six the team owner ran in this battle so the frontend can group replays
     * by team before importing.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReplayPreview {
        private String url;
        private String opponent;
        private String result; // "win" or "loss" from user pov
        private List<String> userTeam; // raw Showdown species names of the user's side
        private boolean matchesTeam; // user side's roster matches this team's registered roster
        private boolean identified;  // a real username/roster signal pointed at one side
    }
}