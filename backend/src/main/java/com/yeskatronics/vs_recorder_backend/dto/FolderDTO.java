package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class FolderDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Folder name is required")
        @Size(max = 100, message = "Folder name must not exceed 100 characters")
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @NotBlank(message = "Folder name is required")
        @Size(max = 100, message = "Folder name must not exceed 100 characters")
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReorderRequest {
        @NotEmpty(message = "Folder IDs are required")
        private List<Long> folderIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String name;
        private int position;
        private LocalDateTime createdAt;
        private int teamCount;
    }
}
