package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamCollaboratorRepository extends JpaRepository<TeamCollaborator, Long> {

    List<TeamCollaborator> findByTeamId(Long teamId);

    List<TeamCollaborator> findByTeamIdAndStatus(Long teamId, Status status);

    Optional<TeamCollaborator> findByTeamIdAndUserIdAndStatus(Long teamId, Long userId, Status status);

    Optional<TeamCollaborator> findByInviteToken(String inviteToken);

    List<TeamCollaborator> findByUserIdAndStatus(Long userId, Status status);

    @Query("SELECT c FROM TeamCollaborator c WHERE LOWER(c.inviteEmail) = LOWER(:email) AND c.status = :status")
    List<TeamCollaborator> findByInviteEmailIgnoreCaseAndStatus(@Param("email") String email,
                                                                @Param("status") Status status);

    @Query("SELECT c FROM TeamCollaborator c WHERE c.team.id = :teamId AND LOWER(c.inviteEmail) = LOWER(:email) AND c.status = :status")
    Optional<TeamCollaborator> findByTeamIdAndInviteEmailIgnoreCaseAndStatus(@Param("teamId") Long teamId,
                                                                             @Param("email") String email,
                                                                             @Param("status") Status status);

    boolean existsByTeamIdAndUserIdAndStatus(Long teamId, Long userId, Status status);

    /**
     * Teams the user has accepted access to (does not include teams the user owns).
     */
    @Query("SELECT c.team FROM TeamCollaborator c WHERE c.user.id = :userId AND c.status = 'ACCEPTED'")
    List<Team> findAcceptedTeamsByUserId(@Param("userId") Long userId);

    /**
     * Teams the user owns that have at least one active (PENDING or ACCEPTED) collaborator row.
     */
    @Query("SELECT DISTINCT c.team FROM TeamCollaborator c " +
           "WHERE c.team.user.id = :ownerUserId AND c.status IN ('PENDING','ACCEPTED')")
    List<Team> findTeamsOwnedByUserWithCollaborators(@Param("ownerUserId") Long ownerUserId);
}
