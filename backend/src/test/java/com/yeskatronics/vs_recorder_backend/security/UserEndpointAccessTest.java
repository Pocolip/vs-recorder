package com.yeskatronics.vs_recorder_backend.security;

import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * No account can be listed, read, changed or deleted by anyone else. There's no
 * /api/users API: sign-up, sign-in and the current user are under /api/auth, and a
 * password changes only through the emailed reset.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserEndpointAccessTest {

    private static final String BOBS_PASSWORD = "bobs-password";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CustomUserDetailsService userDetailsService;
    @Autowired private JwtUtil jwtUtil;

    private User bob;
    private String alicesToken;

    @BeforeEach
    void setUp() {
        User alice = saveUser("access-alice", "alices-password");
        bob = saveUser("access-bob", BOBS_PASSWORD);
        alicesToken = "Bearer " + jwtUtil.generateAccessToken(
                userDetailsService.loadUserByUsername(alice.getUsername()), alice.getId());
    }

    @Test
    void aSignedInUserCannotListUsers() throws Exception {
        String body = mockMvc.perform(get("/api/users").header("Authorization", alicesToken))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains(bob.getEmail()), body);
    }

    @Test
    void aSignedInUserCannotReadAnotherUser() throws Exception {
        mockMvc.perform(get("/api/users/" + bob.getId()).header("Authorization", alicesToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/users/username/" + bob.getUsername()).header("Authorization", alicesToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void aSignedInUserCannotChangeAnotherUsersEmailOrPassword() throws Exception {
        mockMvc.perform(patch("/api/users/" + bob.getId())
                        .header("Authorization", alicesToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"taken-over@example.com\",\"password\":\"taken-over\"}"))
                .andExpect(status().isNotFound());

        User after = userRepository.findById(bob.getId()).orElseThrow();
        assertEquals("access-bob@example.com", after.getEmail());
        assertTrue(passwordEncoder.matches(BOBS_PASSWORD, after.getPasswordHash()));
    }

    @Test
    void aSignedInUserCannotDeleteAnotherUser() throws Exception {
        mockMvc.perform(delete("/api/users/" + bob.getId()).header("Authorization", alicesToken))
                .andExpect(status().isNotFound());
        assertTrue(userRepository.existsById(bob.getId()));
    }

    @Test
    void nobodyCanCheckWhetherAnEmailHasAnAccount() throws Exception {
        mockMvc.perform(get("/api/users/check/email/" + bob.getEmail()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/check/username/" + bob.getUsername()))
                .andExpect(status().isUnauthorized());
    }

    private User saveUser(String username, String password) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(username + "@example.com");
        u.setPasswordHash(passwordEncoder.encode(password));
        return userRepository.save(u);
    }
}
