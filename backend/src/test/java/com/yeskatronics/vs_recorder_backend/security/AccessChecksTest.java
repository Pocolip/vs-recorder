package com.yeskatronics.vs_recorder_backend.security;

import com.yeskatronics.vs_recorder_backend.controllers.AuthController;
import com.yeskatronics.vs_recorder_backend.dto.ExportDTO;
import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator.Status;
import com.yeskatronics.vs_recorder_backend.entities.TeamExport;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamCollaboratorRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamExportRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.TeamExportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Each request here is one a user shouldn't be able to make: reaching another team's
 * collaborators, claiming an invite by its email alone, guessing export codes, keeping a
 * team's plan after being removed, and the endpoints that should be gone or internal.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AccessChecksTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private TeamCollaboratorRepository collaboratorRepository;
    @Autowired private GamePlanRepository gamePlanRepository;
    @Autowired private TeamExportRepository exportRepository;
    @Autowired private TeamExportService exportService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CustomUserDetailsService userDetailsService;
    @Autowired private JwtUtil jwtUtil;

    private User alice;
    private User carol;
    private User mallory;
    private Team alicesTeam;
    private TeamCollaborator carolOnAlicesTeam;

    @BeforeEach
    void setUp() {
        alice = saveUser("acc-alice");
        carol = saveUser("acc-carol");
        mallory = saveUser("acc-mallory");
        alicesTeam = saveTeam(alice);
        carolOnAlicesTeam = saveCollaborator(alicesTeam, carol, Status.ACCEPTED, "acc-carol@example.com");
    }

    // ==================== Collaborators belong to their team ====================

    @Test
    void anotherTeamsOwnerCannotChangeOrRemoveACollaborator() throws Exception {
        Team mallorysTeam = saveTeam(mallory);
        String path = "/api/teams/" + mallorysTeam.getId() + "/collaborators/" + carolOnAlicesTeam.getId();

        String body = mockMvc.perform(patch(path).header("Authorization", token(mallory))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(allPermissions()))
                .andExpect(status().is4xxClientError())
                .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains("acc-carol@example.com"), body);
        mockMvc.perform(delete(path).header("Authorization", token(mallory)))
                .andExpect(status().is4xxClientError());

        TeamCollaborator after = collaboratorRepository.findById(carolOnAlicesTeam.getId()).orElseThrow();
        assertFalse(after.isCanDeleteReplays());
        assertFalse(after.isCanEditTeamDetails());
    }

    @Test
    void aCollaboratorCannotRaiseTheirOwnPermissionsThroughTheirOwnTeam() throws Exception {
        Team carolsTeam = saveTeam(carol);
        mockMvc.perform(patch("/api/teams/" + carolsTeam.getId() + "/collaborators/" + carolOnAlicesTeam.getId())
                        .header("Authorization", token(carol))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(allPermissions()))
                .andExpect(status().is4xxClientError());
        assertFalse(collaboratorRepository.findById(carolOnAlicesTeam.getId()).orElseThrow().isCanEditTeamDetails());
    }

    @Test
    void theOwnerCanStillChangeAndRemoveTheirOwnCollaborators() throws Exception {
        String path = "/api/teams/" + alicesTeam.getId() + "/collaborators/" + carolOnAlicesTeam.getId();
        mockMvc.perform(patch(path).header("Authorization", token(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(allPermissions()))
                .andExpect(status().isOk());
        assertTrue(collaboratorRepository.findById(carolOnAlicesTeam.getId()).orElseThrow().isCanEditTeamDetails());
        mockMvc.perform(delete(path).header("Authorization", token(alice)))
                .andExpect(status().isNoContent());
        assertFalse(collaboratorRepository.existsById(carolOnAlicesTeam.getId()));
    }

    // ==================== Invites need their emailed link ====================

    @Test
    void signingUpWithAnInvitedEmailDoesNotJoinTheTeam() throws Exception {
        TeamCollaborator invite = saveCollaborator(alicesTeam, null, Status.PENDING, "acc-newbie@example.com");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"acc-newbie\",\"email\":\"acc-newbie@example.com\",\"password\":\"password1\"}"))
                .andExpect(status().isCreated());
        User newbie = userRepository.findByUsername("acc-newbie").orElseThrow();

        assertEquals(Status.PENDING, collaboratorRepository.findById(invite.getId()).orElseThrow().getStatus());
        String pending = mockMvc.perform(get("/api/collaborations/pending-invites").header("Authorization", token(newbie)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertEquals("[]", pending);

        // The link from the email still works
        mockMvc.perform(post("/api/collaborations/invites/" + invite.getInviteToken() + "/accept")
                        .header("Authorization", token(newbie)))
                .andExpect(status().isOk());
        assertEquals(Status.ACCEPTED, collaboratorRepository.findById(invite.getId()).orElseThrow().getStatus());
    }

    // ==================== Export codes ====================

    @Test
    void lookingUpAnExportCodeNeedsSignIn() throws Exception {
        mockMvc.perform(get("/api/export/ABCDEFGH")).andExpect(status().isUnauthorized());
    }

    @Test
    void newCodesHaveEightCharactersAndOldSixCharacterOnesStillWork() throws Exception {
        String code = exportService.generateExportCode(alicesTeam.getId(), alice.getId(), new ExportDTO.ExportOptions()).getCode();
        assertTrue(code.matches("[A-HJ-NP-Z2-9]{8}"), code);
        mockMvc.perform(get("/api/export/" + code).header("Authorization", token(mallory))).andExpect(status().isOk());

        String legacy = saveLegacyExport();
        mockMvc.perform(get("/api/export/" + legacy).header("Authorization", token(mallory))).andExpect(status().isOk());
    }

    @Test
    void tooManyUnknownCodesStopsFurtherLookups() throws Exception {
        String legacy = saveLegacyExport();
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(get("/api/export/" + unknownCode(i)).header("Authorization", token(mallory)))
                    .andExpect(status().isBadRequest());
        }
        // Even a real code is refused now, through either path
        mockMvc.perform(get("/api/export/" + legacy).header("Authorization", token(mallory)))
                .andExpect(status().isTooManyRequests());
        mockMvc.perform(post("/api/import/code").header("Authorization", token(mallory))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + legacy + "\"}"))
                .andExpect(status().isTooManyRequests());
        // Other users aren't affected
        mockMvc.perform(get("/api/export/" + legacy).header("Authorization", token(carol)))
                .andExpect(status().isOk());
    }

    // ==================== Team plans follow the team ====================

    @Test
    void aRemovedCollaboratorLosesThePlanTheyCreated() throws Exception {
        GamePlan plan = new GamePlan();
        plan.setUser(carol);
        plan.setTeamId(alicesTeam.getId());
        plan.setName("Opponent Plans");
        plan = gamePlanRepository.save(plan);
        String path = "/api/game-plans/" + plan.getId();

        mockMvc.perform(get(path).header("Authorization", token(carol))).andExpect(status().isOk());
        collaboratorRepository.delete(carolOnAlicesTeam);

        mockMvc.perform(get(path).header("Authorization", token(carol))).andExpect(status().is4xxClientError());
        mockMvc.perform(get(path + "/teams").header("Authorization", token(carol))).andExpect(status().is4xxClientError());
        mockMvc.perform(patch(path).header("Authorization", token(carol))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"mine now\"}"))
                .andExpect(status().is4xxClientError());
        String list = mockMvc.perform(get("/api/game-plans").header("Authorization", token(carol)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertEquals("[]", list);
        // The owner still has it
        mockMvc.perform(get(path).header("Authorization", token(alice))).andExpect(status().isOk());
    }

    // ==================== Rate limits use nginx's address ====================

    @Test
    void theResetRateLimitIgnoresAForgedForwardedFor() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.5");
        request.addHeader("X-Forwarded-For", "1.2.3.4, 203.0.113.9");
        request.addHeader("X-Real-IP", "203.0.113.9");
        assertEquals("203.0.113.9", clientIp(request));

        MockHttpServletRequest direct = new MockHttpServletRequest();
        direct.setRemoteAddr("172.18.0.5");
        direct.addHeader("X-Forwarded-For", "1.2.3.4");
        assertEquals("172.18.0.5", clientIp(direct));
    }

    // ==================== Gone or internal ====================

    @Test
    void theGlobalReplayUrlCheckIsGone() throws Exception {
        mockMvc.perform(get("/api/replays/check/url").param("url", "https://replay.pokemonshowdown.com/x")
                        .header("Authorization", token(mallory)))
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyHealthAndInfoAreOpenOnTheActuator() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mockMvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());
    }

    // ==================== Helpers ====================

    private static String clientIp(MockHttpServletRequest request) throws Exception {
        Method method = AuthController.class.getDeclaredMethod("getClientIp", jakarta.servlet.http.HttpServletRequest.class);
        method.setAccessible(true);
        return (String) method.invoke(null, request);
    }

    private static String allPermissions() {
        return "{\"canAddReplays\":true,\"canDeleteReplays\":true,\"canEditReplayNotes\":true,"
                + "\"canEditTeamMemberNotes\":true,\"canEditTeamMemberCalcs\":true,"
                + "\"canEditTeamDetails\":true,\"canEditGamePlans\":true}";
    }

    /** Six characters (an older code) from the code alphabet, never one that exists. */
    private static String unknownCode(int i) {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return "ZZZZ" + alphabet.charAt(i / alphabet.length()) + alphabet.charAt(i % alphabet.length());
    }

    private String saveLegacyExport() {
        TeamExport export = new TeamExport();
        export.setCode("QWE234");
        export.setUserId(alice.getId());
        export.setTeamId(alicesTeam.getId());
        export.setTeamName(alicesTeam.getName());
        export.setExportData("{}");
        export.setCreatedAt(LocalDateTime.now());
        exportRepository.save(export);
        return "QWE234";
    }

    private String token(User user) {
        return "Bearer " + jwtUtil.generateAccessToken(
                userDetailsService.loadUserByUsername(user.getUsername()), user.getId());
    }

    private User saveUser(String username) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(username + "@example.com");
        u.setPasswordHash(passwordEncoder.encode("password1"));
        return userRepository.save(u);
    }

    private Team saveTeam(User owner) {
        Team t = new Team();
        t.setUser(owner);
        t.setName(owner.getUsername() + "'s team");
        t.setPokepaste("https://pokepast.es/" + owner.getUsername());
        t.setRegulation("VGC 2026 Regulation M-C");
        return teamRepository.save(t);
    }

    private TeamCollaborator saveCollaborator(Team team, User user, Status status, String email) {
        TeamCollaborator c = new TeamCollaborator();
        c.setTeam(team);
        c.setUser(user);
        c.setInviteEmail(email);
        c.setStatus(status);
        c.setInviteExpiresAt(LocalDateTime.now().plusDays(7));
        if (status == Status.PENDING) {
            c.setInviteToken(UUID.randomUUID().toString());
        } else {
            c.setAcceptedAt(LocalDateTime.now());
        }
        return collaboratorRepository.save(c);
    }
}
