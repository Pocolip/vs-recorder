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
 * Team entity representing a Pokemon VGC team.
 * Each team belongs to a user and can have multiple replays and matches.
 */
@Entity
@Table(name = "teams")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank(message = "Team name is required")
    @Size(max = 100, message = "Team name must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank(message = "Pokepaste URL is required")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String pokepaste;

    @Size(max = 50, message = "Regulation must not exceed 50 characters")
    @Column(length = 50)
    private String regulation;

    /**
     * List of Pokemon Showdown usernames associated with this team.
     * In H2, stored as a separate collection table.
     * In PostgreSQL, this will use TEXT[] array type.
     */
    @ElementCollection
    @CollectionTable(name = "team_showdown_usernames", joinColumns = @JoinColumn(name = "team_id"))
    @Column(name = "username")
    private List<String> showdownUsernames = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Replay> replays = new ArrayList<>();

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Match> matches = new ArrayList<>();

    /**
     * Helper method to add a replay to this team
     */
    public void addReplay(Replay replay) {
        replays.add(replay);
        replay.setTeam(this);
    }

    /**
     * Helper method to remove a replay from this team
     */
    public void removeReplay(Replay replay) {
        replays.remove(replay);
        replay.setTeam(null);
    }

    /**
     * Helper method to add a match to this team
     */
    public void addMatch(Match match) {
        matches.add(match);
        match.setTeam(this);
    }

    /**
     * Helper method to remove a match from this team
     */
    public void removeMatch(Match match) {
        matches.remove(match);
        match.setTeam(null);
    }

    /**
     * Helper method to add a showdown username
     */
    public void addShowdownUsername(String username) {
        if (!showdownUsernames.contains(username)) {
            showdownUsernames.add(username);
        }
    }

    /**
     * Helper method to remove a showdown username
     */
    public void removeShowdownUsername(String username) {
        showdownUsernames.remove(username);
    }
}