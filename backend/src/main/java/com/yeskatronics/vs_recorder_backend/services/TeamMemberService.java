package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import com.yeskatronics.vs_recorder_backend.repositories.TeamMemberRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service class for TeamMember entity business logic.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;

    public TeamMember createTeamMember(TeamMember teamMember, Long teamId) {
        log.info("Creating team member for team ID: {}", teamId);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        teamMember.setTeam(team);

        TeamMember saved = teamMemberRepository.save(teamMember);
        log.info("Team member created with ID: {}", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<TeamMember> getTeamMembersByTeamId(Long teamId) {
        log.debug("Fetching team members for team ID: {}", teamId);
        return teamMemberRepository.findByTeamIdOrderBySlotAsc(teamId);
    }

    @Transactional(readOnly = true)
    public Optional<TeamMember> getTeamMemberById(Long id) {
        return teamMemberRepository.findById(id);
    }

    public TeamMember updateTeamMember(Long id, TeamMember updates) {
        log.info("Updating team member ID: {}", id);

        TeamMember existing = teamMemberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Team member not found with ID: " + id));

        if (updates.getNotes() != null) {
            existing.setNotes(updates.getNotes());
        }

        return teamMemberRepository.save(existing);
    }

    public void deleteTeamMember(Long id) {
        log.info("Deleting team member ID: {}", id);

        if (!teamMemberRepository.existsById(id)) {
            throw new IllegalArgumentException("Team member not found with ID: " + id);
        }

        teamMemberRepository.deleteById(id);
    }

    public void deleteByTeamId(Long teamId) {
        log.info("Deleting all team members for team ID: {}", teamId);
        teamMemberRepository.deleteByTeamId(teamId);
    }
}
