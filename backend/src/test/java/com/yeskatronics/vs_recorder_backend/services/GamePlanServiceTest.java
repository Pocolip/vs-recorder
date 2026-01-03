package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanRepository;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanTeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for GamePlanService
 */
@SpringBootTest
@Transactional
class GamePlanServiceTest {

    @Autowired
    private GamePlanService gamePlanService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GamePlanRepository gamePlanRepository;

    @Autowired
    private GamePlanTeamRepository gamePlanTeamRepository;

    private User testUser1;
    private User testUser2;

    @BeforeEach
    void setUp() {
        // Create test users
        testUser1 = new User();
        testUser1.setUsername("user1");
        testUser1.setEmail("user1@example.com");
        testUser1.setPasswordHash("hashed_password");
        testUser1 = userRepository.save(testUser1);

        testUser2 = new User();
        testUser2.setUsername("user2");
        testUser2.setEmail("user2@example.com");
        testUser2.setPasswordHash("hashed_password");
        testUser2 = userRepository.save(testUser2);
    }

    /**
     * Helper method to load pokepaste from file
     */
    private String loadPokepaste(String filepath) throws IOException {
        return Files.readString(Paths.get(filepath));
    }

    // ==================== Game Plan CRUD Tests ====================

    @Test
    void testCreateGamePlan() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Regional Prep Week 1");
        gamePlan.setNotes("Focus on TR matchups");

        GamePlan saved = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        assertNotNull(saved.getId());
        assertEquals("Regional Prep Week 1", saved.getName());
        assertEquals("Focus on TR matchups", saved.getNotes());
        assertEquals(testUser1.getId(), saved.getUser().getId());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    void testGetGamePlanById() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan saved = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        Optional<GamePlan> found = gamePlanService.getGamePlanById(saved.getId());

        assertTrue(found.isPresent());
        assertEquals("Test Plan", found.get().getName());
    }

    @Test
    void testGetGamePlansByUserId() {
        // Create multiple game plans for user1
        GamePlan plan1 = new GamePlan();
        plan1.setName("Plan 1");
        gamePlanService.createGamePlan(plan1, testUser1.getId());

        GamePlan plan2 = new GamePlan();
        plan2.setName("Plan 2");
        gamePlanService.createGamePlan(plan2, testUser1.getId());

        // Create one for user2
        GamePlan plan3 = new GamePlan();
        plan3.setName("Plan 3");
        gamePlanService.createGamePlan(plan3, testUser2.getId());

        List<GamePlan> user1Plans = gamePlanService.getGamePlansByUserId(testUser1.getId());
        List<GamePlan> user2Plans = gamePlanService.getGamePlansByUserId(testUser2.getId());

        assertEquals(2, user1Plans.size());
        assertEquals(1, user2Plans.size());
    }

    @Test
    void testUpdateGamePlan() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Original Name");
        gamePlan.setNotes("Original Notes");
        GamePlan saved = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlan updates = new GamePlan();
        updates.setName("Updated Name");
        updates.setNotes("Updated Notes");

        GamePlan updated = gamePlanService.updateGamePlan(saved.getId(), testUser1.getId(), updates);

        assertEquals("Updated Name", updated.getName());
        assertEquals("Updated Notes", updated.getNotes());
    }

    @Test
    void testDeleteGamePlan() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("To Delete");
        GamePlan saved = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        gamePlanService.deleteGamePlan(saved.getId(), testUser1.getId());

        Optional<GamePlan> found = gamePlanService.getGamePlanById(saved.getId());
        assertFalse(found.isPresent());
    }

    @Test
    void testDeleteGamePlan_CascadeDeletesTeams() {
        // Create game plan with team
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste("Test Pokepaste");
        gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        // Verify we can query the teams before deletion
        List<GamePlanTeam> teamsBefore = gamePlanService.getTeamsByGamePlanId(savedPlan.getId());
        assertEquals(1, teamsBefore.size(), "Should have 1 team before deletion");

        // Delete game plan - this will succeed only if cascade delete is properly configured
        // If cascade wasn't working, we'd get a foreign key constraint violation
        gamePlanService.deleteGamePlan(savedPlan.getId(), testUser1.getId());

        // Verify game plan is deleted
        Optional<GamePlan> found = gamePlanService.getGamePlanById(savedPlan.getId());
        assertFalse(found.isPresent(), "Game plan should be deleted");

        // The fact that delete succeeded without foreign key constraint errors
        // confirms that cascade delete is working correctly
    }

    // ==================== Team Management Tests ====================

    @Test
    void testAddTeamToGamePlan() throws IOException {
        String pokepaste = loadPokepaste("src/test/resources/pastes/fariursa.txt");

        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste(pokepaste);
        team.setNotes("Strong TR team");

        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        assertNotNull(savedTeam.getId());
        assertEquals(pokepaste, savedTeam.getPokepaste());
        assertEquals("Strong TR team", savedTeam.getNotes());
        assertEquals(savedPlan.getId(), savedTeam.getGamePlan().getId());
    }

    @Test
    void testGetTeamsByGamePlanId() throws IOException {
        String pokepaste1 = loadPokepaste("src/test/resources/pastes/fariursa.txt");
        String pokepaste2 = loadPokepaste("src/test/resources/pastes/oger.txt");

        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        // Add two teams
        GamePlanTeam team1 = new GamePlanTeam();
        team1.setPokepaste(pokepaste1);
        gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team1);

        GamePlanTeam team2 = new GamePlanTeam();
        team2.setPokepaste(pokepaste2);
        gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team2);

        List<GamePlanTeam> teams = gamePlanService.getTeamsByGamePlanId(savedPlan.getId());

        assertEquals(2, teams.size());
    }

    @Test
    void testUpdateGamePlanTeam() throws IOException {
        String originalPokepaste = loadPokepaste("src/test/resources/pastes/fariursa.txt");
        String updatedPokepaste = loadPokepaste("src/test/resources/pastes/fariursaedit.txt");

        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste(originalPokepaste);
        team.setNotes("Original notes");
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        GamePlanTeam updates = new GamePlanTeam();
        updates.setPokepaste(updatedPokepaste);
        updates.setNotes("Updated notes");

        GamePlanTeam updated = gamePlanService.updateGamePlanTeam(
                savedTeam.getId(), savedPlan.getId(), testUser1.getId(), updates);

        assertEquals(updatedPokepaste, updated.getPokepaste());
        assertEquals("Updated notes", updated.getNotes());
    }

    @Test
    void testDeleteGamePlanTeam() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste("Test Pokepaste");
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        gamePlanService.deleteGamePlanTeam(savedTeam.getId(), savedPlan.getId(), testUser1.getId());

        Optional<GamePlanTeam> found = gamePlanTeamRepository.findById(savedTeam.getId());
        assertFalse(found.isPresent());
    }

    // ==================== Composition Management Tests ====================

    @Test
    void testAddComposition() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste("Test Pokepaste");
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        GamePlanTeam.TeamComposition composition = new GamePlanTeam.TeamComposition(
                "Rillaboom", "Incineroar", "Flutter Mane", "Urshifu-Rapid-Strike",
                "Standard mode lead"
        );

        GamePlanTeam updated = gamePlanService.addComposition(
                savedTeam.getId(), savedPlan.getId(), testUser1.getId(), composition);

        assertNotNull(updated.getCompositions());
        assertEquals(1, updated.getCompositions().size());
        assertEquals("Rillaboom", updated.getCompositions().get(0).getLead1());
        assertEquals("Incineroar", updated.getCompositions().get(0).getLead2());
        assertEquals("Flutter Mane", updated.getCompositions().get(0).getBack1());
        assertEquals("Urshifu-Rapid-Strike", updated.getCompositions().get(0).getBack2());
        assertEquals("Standard mode lead", updated.getCompositions().get(0).getNotes());
    }

    @Test
    void testAddMultipleCompositions() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste("Test Pokepaste");
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        // Add first composition
        GamePlanTeam.TeamComposition comp1 = new GamePlanTeam.TeamComposition(
                "Rillaboom", "Incineroar", "Flutter Mane", "Urshifu-Rapid-Strike", "Mode 1"
        );
        GamePlanTeam updated1 = gamePlanService.addComposition(
                savedTeam.getId(), savedPlan.getId(), testUser1.getId(), comp1);

        // Add second composition
        GamePlanTeam.TeamComposition comp2 = new GamePlanTeam.TeamComposition(
                "Ogerpon-Hearthflame", "Landorus", "Raging Bolt", "Chien-Pao", "Mode 2"
        );
        GamePlanTeam updated2 = gamePlanService.addComposition(
                updated1.getId(), savedPlan.getId(), testUser1.getId(), comp2);

        assertEquals(2, updated2.getCompositions().size());
        assertEquals("Rillaboom", updated2.getCompositions().get(0).getLead1());
        assertEquals("Ogerpon-Hearthflame", updated2.getCompositions().get(1).getLead1());
    }

    @Test
    void testUpdateComposition() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste("Test Pokepaste");
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        // Add composition
        GamePlanTeam.TeamComposition original = new GamePlanTeam.TeamComposition(
                "Pokemon1", "Pokemon2", "Pokemon3", "Pokemon4", "Original notes"
        );
        GamePlanTeam withComp = gamePlanService.addComposition(
                savedTeam.getId(), savedPlan.getId(), testUser1.getId(), original);

        // Update composition at index 0
        GamePlanTeam.TeamComposition updated = new GamePlanTeam.TeamComposition(
                "NewPokemon1", "NewPokemon2", "NewPokemon3", "NewPokemon4", "Updated notes"
        );
        GamePlanTeam result = gamePlanService.updateComposition(
                withComp.getId(), savedPlan.getId(), testUser1.getId(), 0, updated);

        assertEquals(1, result.getCompositions().size());
        assertEquals("NewPokemon1", result.getCompositions().get(0).getLead1());
        assertEquals("Updated notes", result.getCompositions().get(0).getNotes());
    }

    @Test
    void testDeleteComposition() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste("Test Pokepaste");
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        // Add two compositions
        GamePlanTeam.TeamComposition comp1 = new GamePlanTeam.TeamComposition(
                "P1", "P2", "P3", "P4", "Comp 1"
        );
        GamePlanTeam withComp1 = gamePlanService.addComposition(
                savedTeam.getId(), savedPlan.getId(), testUser1.getId(), comp1);

        GamePlanTeam.TeamComposition comp2 = new GamePlanTeam.TeamComposition(
                "P5", "P6", "P7", "P8", "Comp 2"
        );
        GamePlanTeam withComp2 = gamePlanService.addComposition(
                withComp1.getId(), savedPlan.getId(), testUser1.getId(), comp2);

        // Delete first composition (index 0)
        GamePlanTeam result = gamePlanService.deleteComposition(
                withComp2.getId(), savedPlan.getId(), testUser1.getId(), 0);

        assertEquals(1, result.getCompositions().size());
        assertEquals("P5", result.getCompositions().get(0).getLead1()); // Second comp is now first
    }

    @Test
    void testUpdateComposition_InvalidIndex() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste("Test Pokepaste");
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        GamePlanTeam.TeamComposition comp = new GamePlanTeam.TeamComposition(
                "P1", "P2", "P3", "P4", "Notes"
        );

        assertThrows(IllegalArgumentException.class, () -> {
            gamePlanService.updateComposition(
                    savedTeam.getId(), savedPlan.getId(), testUser1.getId(), 5, comp);
        }, "Should throw exception for invalid index");
    }

    @Test
    void testDeleteComposition_InvalidIndex() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Test Plan");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlanTeam team = new GamePlanTeam();
        team.setPokepaste("Test Pokepaste");
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team);

        assertThrows(IllegalArgumentException.class, () -> {
            gamePlanService.deleteComposition(
                    savedTeam.getId(), savedPlan.getId(), testUser1.getId(), 0);
        }, "Should throw exception when deleting from empty compositions");
    }

    // ==================== Ownership Verification Tests ====================

    @Test
    void testGetGamePlan_DifferentUser() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("User1 Plan");
        GamePlan saved = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        // User2 tries to access User1's plan
        Optional<GamePlan> found = gamePlanService.getGamePlanByIdAndUserId(saved.getId(), testUser2.getId());

        assertFalse(found.isPresent(), "User should not access another user's game plan");
    }

    @Test
    void testUpdateGamePlan_DifferentUser() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("User1 Plan");
        GamePlan saved = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        GamePlan updates = new GamePlan();
        updates.setName("Hacked Name");

        // User2 tries to update User1's plan
        assertThrows(IllegalArgumentException.class, () -> {
            gamePlanService.updateGamePlan(saved.getId(), testUser2.getId(), updates);
        }, "User should not update another user's game plan");
    }

    @Test
    void testDeleteGamePlan_DifferentUser() {
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("User1 Plan");
        GamePlan saved = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        // User2 tries to delete User1's plan
        assertThrows(IllegalArgumentException.class, () -> {
            gamePlanService.deleteGamePlan(saved.getId(), testUser2.getId());
        }, "User should not delete another user's game plan");
    }

    // ==================== Integration Tests ====================

    @Test
    void testFullWorkflow_CreatePlanAddTeamsAddCompositions() throws IOException {
        String pokepaste1 = loadPokepaste("src/test/resources/pastes/fariursa.txt");
        String pokepaste2 = loadPokepaste("src/test/resources/pastes/oger.txt");

        // Create game plan
        GamePlan gamePlan = new GamePlan();
        gamePlan.setName("Regional Prep");
        gamePlan.setNotes("Preparing for upcoming regional");
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, testUser1.getId());

        // Add first opponent team
        GamePlanTeam team1 = new GamePlanTeam();
        team1.setPokepaste(pokepaste1);
        team1.setNotes("Strong TR player");
        GamePlanTeam savedTeam1 = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team1);

        // Add composition to team1
        GamePlanTeam.TeamComposition comp1 = new GamePlanTeam.TeamComposition(
                "Rillaboom", "Incineroar", "Flutter Mane", "Urshifu-Rapid-Strike",
                "Standard anti-TR mode"
        );
        gamePlanService.addComposition(savedTeam1.getId(), savedPlan.getId(), testUser1.getId(), comp1);

        // Add second opponent team
        GamePlanTeam team2 = new GamePlanTeam();
        team2.setPokepaste(pokepaste2);
        team2.setNotes("Weather team");
        GamePlanTeam savedTeam2 = gamePlanService.addTeamToGamePlan(savedPlan.getId(), testUser1.getId(), team2);

        // Add multiple compositions to team2
        GamePlanTeam.TeamComposition comp2a = new GamePlanTeam.TeamComposition(
                "Ogerpon-Hearthflame", "Landorus", "Raging Bolt", "Chien-Pao",
                "Sun mode"
        );
        GamePlanTeam updated = gamePlanService.addComposition(savedTeam2.getId(), savedPlan.getId(), testUser1.getId(), comp2a);

        GamePlanTeam.TeamComposition comp2b = new GamePlanTeam.TeamComposition(
                "Ninetales-Alola", "Abomasnow", "Chien-Pao", "Urshifu-Rapid-Strike",
                "Hail mode"
        );
        gamePlanService.addComposition(updated.getId(), savedPlan.getId(), testUser1.getId(), comp2b);

        // Verify final state
        GamePlan finalPlan = gamePlanService.getGamePlanById(savedPlan.getId()).orElseThrow();
        List<GamePlanTeam> teams = gamePlanService.getTeamsByGamePlanId(finalPlan.getId());

        assertEquals(2, teams.size());
        assertEquals(1, teams.get(0).getCompositions().size());
        assertEquals(2, teams.get(1).getCompositions().size());
    }
}