package com.yeskatronics.vs_recorder_backend.engine;

import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationNotFoundException;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.SimulationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * With engine jobs off (the default) nothing touches Redis or AWS, and the feature
 * reports itself as disabled.
 */
@SpringBootTest(properties = "engine.allowed-users=sim-off-owner")
@Transactional
class SimulationDisabledTest {

    @Autowired private ApplicationContext context;
    @Autowired private SimulationService simulationService;
    @Autowired private TeamRepository teamRepository;
    @Autowired private UserRepository userRepository;

    private User owner;
    private Team team;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setUsername("sim-off-owner");
        owner.setEmail("sim-off-owner@example.com");
        owner.setPasswordHash("hashed_password");
        owner = userRepository.save(owner);

        team = new Team();
        team.setUser(owner);
        team.setName("Off");
        team.setPokepaste("https://pokepast.es/off");
        team.setRegulation("VGC 2026 Regulation M-C");
        team = teamRepository.save(team);
    }

    @Test
    void noQueueWorkerOrPoller() {
        assertTrue(context.getBeansOfType(EngineQueue.class).isEmpty());
        assertTrue(context.getBeansOfType(WorkerStarter.class).isEmpty());
        assertTrue(context.getBeansOfType(SimulationPoller.class).isEmpty());
    }

    @Test
    void reportsDisabled() {
        var status = simulationService.getStatus(team.getId(), owner.getId(), "sim-off-owner");
        assertFalse(status.isEnabled());
        assertFalse(status.isCanRun());
        assertNull(status.getJob());
        assertNull(status.getResult());
    }

    @Test
    void submitAndCancelAreForbidden() {
        assertThrows(TeamAccessDeniedException.class,
                () -> simulationService.submit(team.getId(), owner.getId(), "sim-off-owner", SimulationJob.Depth.FULL, false));
        assertThrows(TeamAccessDeniedException.class,
                () -> simulationService.cancel(team.getId(), owner.getId(), "sim-off-owner"));
    }

    @Test
    void simulatedAnalyticsAreNotFound() {
        assertThrows(SimulationNotFoundException.class, () -> simulationService.getSimulatedUsageStats(team.getId()));
    }
}
