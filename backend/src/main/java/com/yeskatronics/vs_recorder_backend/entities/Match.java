package com.yeskatronics.vs_recorder_backend.entities;

import jakarta.persistence.*;
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
 * Match entity representing a Best-of-3 (Bo3) set of games.
 * Each match belongs to a team and can have multiple replays associated with it.
 */
@Entity
@Table(name = "matches")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Size(max = 100, message = "Opponent name must not exceed 100 characters")
    @Column(length = 100)
    private String opponent;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /**
     * Custom tags for organizing matches.
     * In H2, stored as a separate collection table.
     * In PostgreSQL, this will use TEXT[] array type.
     */
    @ElementCollection
    @CollectionTable(name = "match_tags", joinColumns = @JoinColumn(name = "match_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL)
    private List<Replay> replays = new ArrayList<>();

    /**
     * Helper method to add a replay to this match
     */
    public void addReplay(Replay replay) {
        replays.add(replay);
        replay.setMatch(this);
    }

    /**
     * Helper method to remove a replay from this match
     */
    public void removeReplay(Replay replay) {
        replays.remove(replay);
        replay.setMatch(null);
    }

    /**
     * Helper method to add a tag
     */
    public void addTag(String tag) {
        if (!tags.contains(tag)) {
            tags.add(tag);
        }
    }

    /**
     * Helper method to remove a tag
     */
    public void removeTag(String tag) {
        tags.remove(tag);
    }

    /**
     * Helper method to get the number of replays in this match
     */
    public int getReplayCount() {
        return replays.size();
    }

    /**
     * Helper method to check if this is a complete Bo3 (has 2-3 replays)
     */
    public boolean isComplete() {
        int count = getReplayCount();
        return count >= 2 && count <= 3;
    }

    /**
     * Helper method to calculate match result based on replay results
     * Returns "win" if won the match, "loss" if lost, "incomplete" if not enough replays
     */
    public String getMatchResult() {
        if (!isComplete()) {
            return "incomplete";
        }

        long wins = replays.stream()
                .filter(Replay::isWin)
                .count();

        return wins >= 2 ? "win" : "loss";
    }
}