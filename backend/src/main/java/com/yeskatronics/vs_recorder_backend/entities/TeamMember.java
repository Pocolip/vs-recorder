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

    @ElementCollection
    @CollectionTable(name = "team_member_calcs", joinColumns = @JoinColumn(name = "team_member_id"))
    @Column(name = "calc")
    private List<String> calcs = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
