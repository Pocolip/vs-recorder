package com.yeskatronics.vs_recorder_backend.config;

import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.ReplayService;
import com.yeskatronics.vs_recorder_backend.services.TeamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Data initializer for H2 database on startup.
 * Pre-populates test data for development.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final TeamService teamService;
    private final ReplayService replayService;
    private final PasswordEncoder passwordEncoder;

    // Test data configuration
    private static final String TEST_USERNAME = "pocolip";
    private static final String TEST_PASSWORD = "pikachu";
    private static final String TEST_EMAIL = "pocolip@example.com";
    private static final String TEAM_NAME = "tailroom";
    private static final String POKEPASTE_URL = "https://pokepast.es/d2ac417fa36d0013";
    private static final String REGULATION = "VGC 2025 Regulation F";
    private static final List<String> SHOWDOWN_USERNAMES = Arrays.asList("mofonguero", "genshinmintpicker");

    private static final List<String> REPLAY_URLS = Arrays.asList(
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503066942-x98p6wybr96jwwgd93b2eqwumdacgoapw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503064458-ry9f75irda1m6ltf0e7w84jmryy5kqqpw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503063356-2g4yj51xfrlmwjxa00atia7achfj8w3pw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503062667-mtwg9wcq8oy9it1uwbg659klv5j4000pw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503061760-c7wbm8bjhwe9d8kr5u846i3wp601h4jpw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503060392-l4tpnrvaqc14cingnq5pox9tevvssl9pw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503059932-38s7bwstsynfvfd76yhiw68a9d8r1dcpw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503058383-6fispicexmy2oda51o9tesdhcy9q7w8pw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503054341-ohers27ilc5v3ecnw7bptermj9b0qpopw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503052933-be70gfulrc9s6qgcwu554j0gjeg7w11pw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503048948-xfttdk1kiw5504dx9hmwfk1nk4s9bmepw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503047296-m4h8khppsdkjvpd9e5bd6q3ckuexqx1pw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503045154-ah28ku69u1ta0l6y38iy7ualxuv1qmcpw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503044418-at3at6eg4fine6g99f4dhmg8h9aq0plpw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503043533-q1i5hwg03pv1x5h7p1fgydn1d7grg1apw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2503002923-fj4qq7xjuy80qkc6i3tj3urlv1k08ogpw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2502999531-32lpjr62boevn40puxwk4sr5t8lu4a4pw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2502997614-ofsr9n0gfu49bo1dmrlerj0ty40o31bpw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2502996369-n4p7xxmi8d3pon4454oba2cgaym4qqipw",
            "https://replay.pokemonshowdown.com/gen9vgc2026regfbo3-2502995443-7qko5eqlpdtdsckv4hmwb9bhqv8j59apw"
    );

    @Override
    public void run(ApplicationArguments args) {
        log.info("Starting data initialization...");

        try {
            // Check if test user already exists
            if (userRepository.findByUsername(TEST_USERNAME).isPresent()) {
                log.info("Test data already exists. Skipping initialization.");
                return;
            }

            // Create test user
            User user = createTestUser();
            log.info("Created test user: {}", TEST_USERNAME);

            // Create team
            Team team = createTestTeam(user);
            log.info("Created team: {}", TEAM_NAME);

            // Import replays
            importReplays(team.getId());
            log.info("Data initialization completed successfully!");

        } catch (Exception e) {
            log.error("Error during data initialization: {}", e.getMessage(), e);
        }
    }

    private User createTestUser() {
        User user = new User();
        user.setUsername(TEST_USERNAME);
        user.setEmail(TEST_EMAIL);
        user.setPasswordHash(passwordEncoder.encode(TEST_PASSWORD));
        return userRepository.save(user);
    }

    private Team createTestTeam(User user) {
        Team team = new Team();
        team.setUser(user);
        team.setName(TEAM_NAME);
        team.setPokepaste(POKEPASTE_URL);
        team.setRegulation(REGULATION);
        team.setShowdownUsernames(SHOWDOWN_USERNAMES);
        return teamService.createTeam(team, user.getId());
    }

    private void importReplays(Long teamId) {
        int successCount = 0;
        int failCount = 0;

        log.info("Starting import of {} replays...", REPLAY_URLS.size());

        for (int i = 0; i < REPLAY_URLS.size(); i++) {
            String url = REPLAY_URLS.get(i);
            try {
                replayService.createReplayFromUrl(teamId, url);
                successCount++;
                log.debug("Imported replay {}/{}: {}", i + 1, REPLAY_URLS.size(), url);

                // Small delay to avoid overwhelming Showdown API
                Thread.sleep(500);
            } catch (Exception e) {
                failCount++;
                log.warn("Failed to import replay {}/{}: {} - {}", i + 1, REPLAY_URLS.size(), url, e.getMessage());
            }
        }

        log.info("Replay import complete: {} successful, {} failed", successCount, failCount);
    }
}
