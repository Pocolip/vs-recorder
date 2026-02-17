package com.yeskatronics.vs_recorder_backend.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * GamePlan entity representing a tournament/match preparation plan.
 * Contains multiple opponent teams and planned compositions.
 */
@Entity
@Table(name = "game_plans", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"team_id", "user_id"}, name = "uk_game_plan_team_user")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GamePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Optional reference to a Team - allows associating a game plan with a specific team.
     * When set, this game plan contains opponent planning for that team.
     */
    @Column(name = "team_id")
    private Long teamId;

    @NotBlank(message = "Game plan name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "gamePlan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GamePlanTeam> teams = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Helper method to add a team to this game plan
     */
    public void addTeam(GamePlanTeam team) {
        teams.add(team);
        team.setGamePlan(this);
    }

    /**
     * Helper method to remove a team from this game plan
     */
    public void removeTeam(GamePlanTeam team) {
        teams.remove(team);
        team.setGamePlan(null);
    }
}