package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for TeamMember entity.
 */
@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    interface TeamSpecies {
        Long getTeamId();
        String getPokemonName();
    }

    @org.springframework.data.jpa.repository.Query("SELECT m.team.id AS teamId, m.pokemonName AS pokemonName " +
            "FROM TeamMember m WHERE m.team.id IN :teamIds ORDER BY m.slot")
    List<TeamSpecies> findSpeciesByTeamIds(java.util.Collection<Long> teamIds);

    List<TeamMember> findByTeamIdOrderBySlotAsc(Long teamId);

    Optional<TeamMember> findByIdAndTeamId(Long id, Long teamId);

    void deleteByTeamId(Long teamId);
}
