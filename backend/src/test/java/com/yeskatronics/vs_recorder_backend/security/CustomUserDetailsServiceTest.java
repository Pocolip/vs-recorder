package com.yeskatronics.vs_recorder_backend.security;

import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class CustomUserDetailsServiceTest {

    @Autowired private CustomUserDetailsService userDetailsService;
    @Autowired private UserRepository userRepository;

    @Test
    void loadsByUsername() {
        saveUser("cuds-alice", "cuds-alice@example.com");

        UserDetails details = userDetailsService.loadUserByUsername("cuds-alice");
        assertEquals("cuds-alice", details.getUsername());
    }

    @Test
    void loadsByEmail_caseInsensitive_returnsCanonicalUsername() {
        saveUser("cuds-bob", "Cuds-Bob@Example.com");

        assertEquals("cuds-bob", userDetailsService.loadUserByUsername("cuds-bob@example.com").getUsername());
        assertEquals("cuds-bob", userDetailsService.loadUserByUsername("CUDS-BOB@EXAMPLE.COM").getUsername());
        assertEquals("cuds-bob", userDetailsService.loadUserByUsername(" cuds-bob@example.com ").getUsername());
    }

    @Test
    void usernameMatchTakesPrecedenceOverEmail() {
        // Legacy usernames may contain '@' and collide with another account's email
        saveUser("cuds-shared@example.com", "cuds-owner-a@example.com");
        saveUser("cuds-other", "cuds-shared@example.com");

        UserDetails details = userDetailsService.loadUserByUsername("cuds-shared@example.com");
        assertEquals("cuds-shared@example.com", details.getUsername());
    }

    @Test
    void ambiguousCaseVariantEmails_doNotResolve() {
        saveUser("cuds-dup1", "cuds-dup@example.com");
        saveUser("cuds-dup2", "CUDS-DUP@example.com");

        assertThrows(UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("cuds-dup@example.com"));
        // Username login still works for both
        assertEquals("cuds-dup1", userDetailsService.loadUserByUsername("cuds-dup1").getUsername());
        assertEquals("cuds-dup2", userDetailsService.loadUserByUsername("cuds-dup2").getUsername());
    }

    @Test
    void unknownIdentifier_throws() {
        assertThrows(UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("cuds-nobody"));
        assertThrows(UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("cuds-nobody@example.com"));
    }

    private User saveUser(String username, String email) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPasswordHash("hash");
        return userRepository.save(u);
    }
}
