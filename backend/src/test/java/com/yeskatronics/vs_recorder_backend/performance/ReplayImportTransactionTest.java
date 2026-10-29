package com.yeskatronics.vs_recorder_backend.performance;

import com.yeskatronics.vs_recorder_backend.dto.ReplayDTO;
import com.yeskatronics.vs_recorder_backend.entities.*;
import com.yeskatronics.vs_recorder_backend.repositories.*;
import com.yeskatronics.vs_recorder_backend.services.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class ReplayImportTransactionTest {
    @Autowired ReplayImportService imports;
    @Autowired TeamRepository teams;
    @Autowired UserRepository users;
    @Autowired ReplayRepository replays;
    @Autowired TeamCollaboratorRepository collaborators;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean ShowdownService showdown;
    static final String URL = "https://replay.pokemonshowdown.com/gen9-perf";
    static final String RAW = "{\"players\":[\"Owner\",\"Rival\"],\"log\":\"|player|p1|Owner|\\n|player|p2|Rival|\\n|poke|p1|Pikachu|\\n|poke|p2|Incineroar|\\n|win|Owner\"}";

    private long[] seed() {
        return new TransactionTemplate(transactions).execute(status -> {
            User user = new User(); user.setUsername("perf" + UUID.randomUUID()); user.setEmail(user.getUsername()+"@example.com"); user.setPasswordHash("password"); users.save(user);
            Team team = new Team(); team.setName("Perf"); team.setPokepaste("https://pokepast.es/test"); team.setUser(user);
            team.setShowdownUsernames(new ArrayList<>(List.of("Owner"))); teams.save(team);
            return new long[]{team.getId(), user.getId()};
        });
    }
    @Test void fetchRunsWithoutTransactionAndPersistenceUsesCurrentIdentification() {
        long[] ids = seed();
        doAnswer(call -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            new TransactionTemplate(transactions).executeWithoutResult(status ->
                    teams.findById(ids[0]).orElseThrow().setShowdownUsernames(new ArrayList<>(List.of("Rival"))));
            return RAW;
        }).when(showdown).fetchRawReplay(URL);
        Replay replay = imports.create(ids[0], ids[1], new ReplayDTO.CreateFromUrlRequest(URL, "note", true));
        assertEquals("loss", replay.getResult()); assertEquals("Owner", replay.getOpponent());
        assertEquals("note", replay.getNotes()); assertTrue(replay.getReviewed());
    }
    @Test void concurrentDuplicateImportsPersistOneReplay() throws Exception {
        long[] ids = seed(); CountDownLatch arrived = new CountDownLatch(2);
        doAnswer(call -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            arrived.countDown(); assertTrue(arrived.await(10, TimeUnit.SECONDS)); return RAW;
        }).when(showdown).fetchRawReplay(URL);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> task = () -> {
                try { imports.create(ids[0], ids[1], new ReplayDTO.CreateFromUrlRequest(URL, null, false)); return true; }
                catch (IllegalArgumentException duplicate) { assertTrue(duplicate.getMessage().contains("already exists")); return false; }
            };
            var futures = executor.invokeAll(List.of(task, task));
            assertNotEquals(futures.get(0).get(), futures.get(1).get());
            assertEquals(1, replays.countByTeamId(ids[0]));
        } finally { executor.shutdownNow(); }
    }
    @Test void teamDeletedWhileFetchingCannotReceiveReplay() {
        long[] ids = seed();
        doAnswer(call -> {
            new TransactionTemplate(transactions).executeWithoutResult(status -> teams.deleteById(ids[0]));
            return RAW;
        }).when(showdown).fetchRawReplay(URL);
        assertThrows(IllegalArgumentException.class, () -> imports.create(ids[0], ids[1], new ReplayDTO.CreateFromUrlRequest(URL, null, false)));
        assertEquals(0, replays.countByTeamId(ids[0]));
    }
    @Test void collaboratorPermissionRevokedDuringFetchIsRechecked() {
        long[] owner = seed(); long[] collaborator = seed();
        Long membership = new TransactionTemplate(transactions).execute(status -> {
            TeamCollaborator entry = new TeamCollaborator();
            entry.setTeam(teams.findById(owner[0]).orElseThrow());
            entry.setUser(users.findById(collaborator[1]).orElseThrow());
            entry.setInviteEmail(entry.getUser().getEmail());
            entry.setInviteExpiresAt(java.time.LocalDateTime.now().plusDays(1));
            entry.setStatus(TeamCollaborator.Status.ACCEPTED); entry.setCanAddReplays(true);
            return collaborators.save(entry).getId();
        });
        doAnswer(call -> {
            new TransactionTemplate(transactions).executeWithoutResult(status ->
                    collaborators.findById(membership).orElseThrow().setCanAddReplays(false));
            return RAW;
        }).when(showdown).fetchRawReplay(URL);
        assertThrows(com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException.class,
                () -> imports.create(owner[0], collaborator[1], new ReplayDTO.CreateFromUrlRequest(URL, null, false)));
        assertEquals(0, replays.countByTeamId(owner[0]));
    }
}
