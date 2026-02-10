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

/**
 * TeamMember entity representing a single Pokemon on a team.
 * Each team member belongs to a team and can have individual notes.
 */
@Entity
@Table(name = "team_members", uniqueConstraints = {
    @UniqueConstraint(name = "uk_team_member_slot", columnNames = {"team_id", "slot"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @NotBlank(message = "Pokemon name is required")
    @Size(max = 100, message = "Pokemon name must not exceed 100 characters")
    @Column(name = "pokemon_name", nullable = false, length = 100)
    private String pokemonName;

    @Column(nullable = false)
    private Integer slot;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
