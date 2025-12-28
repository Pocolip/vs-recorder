package com.yeskatronics.vs_recorder_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
}