package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.ReplayDTO;
import com.yeskatronics.vs_recorder_backend.dto.ShowdownDTO;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.LocalDateTime;
import java.util.ArrayList;

/** External I/O is deliberately outside both short database transactions. */
@Service
@RequiredArgsConstructor
public class ReplayImportService {
    private final TeamAccessService access;
    private final TeamRepository teams;
    private final ReplayService replays;
    private final ShowdownService showdown;
    private final PlatformTransactionManager transactions;
    private final EntityManager entityManager;

    private Team snapshot(Long teamId, Long userId) {
        return new TransactionTemplate(transactions).execute(status -> {
            Team source = access.requirePermission(teamId, userId, TeamAccessService.Permission.ADD_REPLAYS).getTeam();
            Team copy = new Team();
            copy.setShowdownUsernames(new ArrayList<>(source.getShowdownUsernames()));
            copy.setTeamMembers(source.getTeamMembers().stream().map(member -> {
                TeamMember cloned = new TeamMember();
                cloned.setPokemonName(member.getPokemonName());
                return cloned;
            }).toList());
            entityManager.clear();
            return copy;
        });
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public Replay create(Long teamId, Long userId, ReplayDTO.CreateFromUrlRequest request) {
        String url = request.getUrl().split("\\?")[0];
        snapshot(teamId, userId); // Reject unauthorized requests before contacting the provider.
        String raw = showdown.fetchRawReplay(url);
        return new TransactionTemplate(transactions).execute(status -> {
            entityManager.clear(); // Also discard any request-scoped identity-map state from before the wait.
            Team team = teams.findByIdForUpdate(teamId)
                    .orElseThrow(() -> new IllegalArgumentException("Team no longer exists"));
            var currentAccess = access.requirePermission(teamId, userId, TeamAccessService.Permission.ADD_REPLAYS);
            if (currentAccess.getMembership() != null) {
                entityManager.refresh(currentAccess.getMembership(), LockModeType.PESSIMISTIC_READ);
                access.requirePermission(currentAccess, TeamAccessService.Permission.ADD_REPLAYS);
                if (currentAccess.getMembership().getStatus() != com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator.Status.ACCEPTED)
                    throw new com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException("Team access was revoked");
            }
            // Identify against the current team, so edits during the network wait take effect.
            var data = showdown.parseReplayData(raw, team);
            Replay replay = new Replay();
            replay.setUrl(url);
            replay.setBattleLog(raw);
            replay.setOpponent(data.getOpponent());
            replay.setResult(data.getResult());
            replay.setDate(data.getDate() == null ? LocalDateTime.now() : data.getDate());
            replay.setNotes(request.getNotes());
            replay.setReviewed(Boolean.TRUE.equals(request.getReviewed()));
            return replays.createReplay(replay, teamId);
        });
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public ShowdownDTO.ReplayPreview preview(Long teamId, Long userId, String url) {
        Team team = snapshot(teamId, userId);
        return showdown.previewReplay(url.split("\\?")[0], team);
    }
}
