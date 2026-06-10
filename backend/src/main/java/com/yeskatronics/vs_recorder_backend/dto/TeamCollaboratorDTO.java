package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTOs for team collaboration API operations.
 */
public class TeamCollaboratorDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long teamId;
        private String teamName;
        private Long userId;
        private String username;
        private String userEmail;
        private String inviteEmail;
        /**
         * Active invite token for PENDING rows. Owners and the invitee themselves see this
         * (returned only via owner-scoped or self-scoped endpoints).
         */
        private String inviteToken;
        private String status;
        private LocalDateTime acceptedAt;
        private LocalDateTime inviteExpiresAt;
        private LocalDateTime createdAt;
        private boolean canAddReplays;
        private boolean canDeleteReplays;
        private boolean canEditReplayNotes;
        private boolean canEditTeamMemberNotes;
        private boolean canEditTeamMemberCalcs;
        private boolean canEditTeamDetails;
        private boolean canEditGamePlans;
    }

    /**
     * Owner sends this to invite a collaborator. Permissions default to false if omitted.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InviteRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        private String email;

        private boolean canAddReplays = true;
        private boolean canDeleteReplays = false;
        private boolean canEditReplayNotes = true;
        private boolean canEditTeamMemberNotes = true;
        private boolean canEditTeamMemberCalcs = true;
        private boolean canEditTeamDetails = false;
        private boolean canEditGamePlans = true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdatePermissionsRequest {
        private boolean canAddReplays;
        private boolean canDeleteReplays;
        private boolean canEditReplayNotes;
        private boolean canEditTeamMemberNotes;
        private boolean canEditTeamMemberCalcs;
        private boolean canEditTeamDetails;
        private boolean canEditGamePlans;
    }

    /**
     * Public preview of an invite token. Returned by the unauthenticated preview endpoint
     * so the accept page can show team/owner details before the user logs in.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvitePreview {
        private String teamName;
        private String ownerUsername;
        private String inviteEmail;
        private String status;
        private LocalDateTime inviteExpiresAt;
        private boolean expired;
    }
}
