package com.yeskatronics.vs_recorder_backend.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * GamePlanTeam entity representing an opponent team in a game plan.
 * Contains the opponent's Pokepaste and planned team compositions.
 */
@Entity
@Table(name = "game_plan_teams")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GamePlanTeam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_plan_id", nullable = false)
    private GamePlan gamePlan;

    @NotBlank(message = "Pokepaste is required")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String pokepaste;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /**
     * Team compositions stored as JSON array.
     * Each composition contains: lead1, lead2, back1, back2, notes
     *
     * Example:
     * [
     *   {
     *     "lead1": "Rillaboom",
     *     "lead2": "Incineroar",
     *     "back1": "Flutter Mane",
     *     "back2": "Urshifu-Rapid-Strike",
     *     "notes": "Standard mode lead against TR teams"
     *   }
     * ]
     *
     * In H2: stored as JSON string (VARCHAR/TEXT)
     * In PostgreSQL: will use JSONB column type
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "compositions", columnDefinition = "TEXT")
    private List<TeamComposition> compositions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Inner class representing a single team composition
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamComposition {
        private String lead1;
        private String lead2;
        private String back1;
        private String back2;
        private String notes;
    }

    /**
     * Helper method to add a composition
     */
    public void addComposition(TeamComposition composition) {
        if (compositions == null) {
            compositions = new ArrayList<>();
        }
        compositions.add(composition);
    }

    /**
     * Helper method to remove a composition by index
     */
    public void removeComposition(int index) {
        if (compositions != null && index >= 0 && index < compositions.size()) {
            compositions.remove(index);
        }
    }

    /**
     * Helper method to update a composition by index
     */
    public void updateComposition(int index, TeamComposition composition) {
        if (compositions != null && index >= 0 && index < compositions.size()) {
            compositions.set(index, composition);
        }
    }
}