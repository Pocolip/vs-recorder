package com.yeskatronics.vs_recorder_backend.engine;

import com.yeskatronics.vs_recorder_backend.dto.PlanDTO;
import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.dto.SimulationDTO;
import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Depth;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.RateLimitExceededException;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanRepository;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanTeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.PlanSimulationService;
import com.yeskatronics.vs_recorder_backend.services.PokepasteService;
import com.yeskatronics.vs_recorder_backend.services.SimulationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Simulations opened to everyone ({@code engine.allowed-users=*}), with the global daily
 * caps that bound what a day can cost.
 */
@SpringBootTest(properties = {
        "engine.enabled=true",
        "engine.allowed-users=*",
        "engine.daily-cap=3",
        "engine.global-daily-cap=2",
        "engine.plan-daily-cap=20",
        "engine.global-plan-daily-cap=3",
        "engine.poll-initial-delay=PT24H"
})
@Transactional
class SimulationOpenAccessTest {

    private static final String PASTE = "Pelipper @ Damp Rock\nAbility: Drizzle\n- Hurricane\n";

    @MockitoBean private EngineQueue queue;
    @MockitoBean private WorkerStarter workerStarter;
    @MockitoBean private PokepasteService pokepasteService;

    @Autowired private SimulationService simulationService;
    @Autowired private PlanSimulationService planService;
    @Autowired private UserRepository userRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private GamePlanRepository gamePlanRepository;
    @Autowired private GamePlanTeamRepository gamePlanTeamRepository;

    private User alice;
    private User bob;
    private User carol;

    @BeforeEach
    void setUp() {
        alice = saveUser("open-alice");
        bob = saveUser("open-bob");
        carol = saveUser("open-carol");
        PokepasteDTO.PasteData paste = new PokepasteDTO.PasteData();
        paste.setRawText(PASTE);
        when(pokepasteService.fetchPasteData(anyString())).thenReturn(paste);
    }

    @Test
    void anyOwnerMayRunButOnlyOnTheirOwnTeam() {
        Team alicesTeam = saveTeam(alice);
        SimulationDTO.StatusResponse status = simulationService.getStatus(alicesTeam.getId(), alice.getId(), alice.getUsername());
        assertTrue(status.isCanRun(), status.getRunBlockedReason());
        assertTrue(status.isOpenToAll());

        assertNotNull(simulationService.submit(alicesTeam.getId(), alice.getId(), alice.getUsername(), Depth.QUICK, false).getJob());
        // Open to everyone still means owners: bob can't run alice's team
        assertThrows(TeamAccessDeniedException.class,
                () -> simulationService.submit(alicesTeam.getId(), bob.getId(), bob.getUsername(), Depth.QUICK, false));
    }

    @Test
    void theGlobalCapStopsEveryoneOnceTheDayIsUsedUp() {
        simulationService.submit(saveTeam(alice).getId(), alice.getId(), alice.getUsername(), Depth.QUICK, false);
        simulationService.submit(saveTeam(bob).getId(), bob.getId(), bob.getUsername(), Depth.QUICK, false);

        // Carol has her own runs left, but the day's are used up
        Team carolsTeam = saveTeam(carol);
        SimulationDTO.StatusResponse status = simulationService.getStatus(carolsTeam.getId(), carol.getId(), carol.getUsername());
        assertFalse(status.isCanRun());
        assertEquals(0, status.getRunsLeftToday());
        assertTrue(status.getRunBlockedReason().contains("used up for everyone"), status.getRunBlockedReason());
        RateLimitExceededException e = assertThrows(RateLimitExceededException.class,
                () -> simulationService.submit(carolsTeam.getId(), carol.getId(), carol.getUsername(), Depth.QUICK, false));
        assertTrue(e.getMessage().contains("used up for everyone"), e.getMessage());
    }

    @Test
    void runsLeftIsTheSmallerOfTheUsersAndEveryones() {
        simulationService.submit(saveTeam(alice).getId(), alice.getId(), alice.getUsername(), Depth.QUICK, false);
        // Bob has 3 of his own, but only 1 is left for everyone
        Team bobsTeam = saveTeam(bob);
        assertEquals(1, simulationService.getStatus(bobsTeam.getId(), bob.getId(), bob.getUsername()).getRunsLeftToday());
    }

    @Test
    void theGlobalPlanCapRefusesTheRestOfABatch() {
        Team team = saveTeam(alice);
        GamePlan plan = new GamePlan();
        plan.setUser(alice);
        plan.setTeamId(team.getId());
        plan.setName("Opponent Plans");
        plan = gamePlanRepository.save(plan);
        List<GamePlanTeam> entries = List.of(
                saveEntry(plan, "Gholdengo @ Choice Specs\nAbility: Good as Gold\n- Make It Rain\n", 0),
                saveEntry(plan, "Incineroar @ Sitrus Berry\nAbility: Intimidate\n- Fake Out\n", 1),
                saveEntry(plan, "Kingambit @ Black Glasses\nAbility: Defiant\n- Kowtow Cleave\n", 2),
                saveEntry(plan, "Rillaboom @ Miracle Seed\nAbility: Grassy Surge\n- Grassy Glide\n", 3));

        PlanDTO.SubmitResponse response = planService.submit(team.getId(), alice.getId(), alice.getUsername(),
                entries.stream().map(GamePlanTeam::getId).toList(), false);
        assertEquals(3, response.getOutcomes().stream().filter(PlanDTO.SubmitOutcome::isQueued).count());
        PlanDTO.SubmitOutcome refused = response.getOutcomes().stream().filter(o -> !o.isQueued()).findFirst().orElseThrow();
        assertEquals("daily_cap", refused.getErrorCode());
        assertTrue(refused.getMessage().contains("used up for everyone"), refused.getMessage());
        assertEquals(0, response.getStatus().getRunsLeftToday());
    }

    @Test
    void theWildcardIsTheOnlyWayToOpenItUp() {
        EngineProperties listed = new EngineProperties(true, "redis://x", "vsr", List.of(), "us-east-1",
                List.of("someone"), 3, 20, 0, 0, Duration.ofHours(3));
        assertFalse(listed.openToAll());
        assertFalse(listed.isAllowed("someone-else"));
        EngineProperties open = new EngineProperties(true, "redis://x", "vsr", List.of(), "us-east-1",
                List.of(" * "), 3, 20, 0, 0, Duration.ofHours(3));
        assertTrue(open.openToAll());
        assertTrue(open.isAllowed("someone-else"));
        assertFalse(open.isAllowed(" "));
    }

    private User saveUser(String username) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(username + "@example.com");
        u.setPasswordHash("hashed_password");
        return userRepository.save(u);
    }

    private Team saveTeam(User user) {
        Team t = new Team();
        t.setUser(user);
        t.setName(user.getUsername() + "'s team");
        t.setPokepaste("https://pokepast.es/" + user.getUsername());
        t.setRegulation("VGC 2026 Regulation M-C");
        return teamRepository.save(t);
    }

    private GamePlanTeam saveEntry(GamePlan gamePlan, String pokepaste, int position) {
        GamePlanTeam entry = new GamePlanTeam();
        entry.setGamePlan(gamePlan);
        entry.setPokepaste(pokepaste);
        entry.setPosition(position);
        return gamePlanTeamRepository.save(entry);
    }
}
