package com.yeskatronics.vs_recorder_backend.security;

import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Custom UserDetailsService implementation for Spring Security.
 * Loads user details from the database for authentication.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Load a user by username or email.
     * An exact username match takes precedence (legacy usernames may contain '@');
     * otherwise an identifier containing '@' is matched case-insensitively against email.
     * The returned principal always carries the canonical username, so JWT subjects are unchanged.
     */
    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(identifier)
                .or(() -> findUniqueByEmail(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                new ArrayList<>() // No roles/authorities for now
        );
    }

    /**
     * Resolve an email to a single user. Ambiguous matches (legacy case-variant
     * duplicates) resolve to nothing rather than guessing.
     */
    private Optional<User> findUniqueByEmail(String identifier) {
        if (identifier == null || !identifier.contains("@")) {
            return Optional.empty();
        }
        List<User> matches = userRepository.findAllByEmailIgnoreCase(identifier.trim());
        return matches.size() == 1 ? Optional.of(matches.get(0)) : Optional.empty();
    }

    /**
     * Load user with ID (useful for JWT claims)
     */
    public UserDetails loadUserByUsernameWithId(String username) throws UsernameNotFoundException {
        return loadUserByUsername(username);
    }

    /**
     * Get user ID by username
     */
    public Long getUserIdByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        return user.getId();
    }

    /**
     * Get user email by ID
     */
    public String getUserEmailById(Long userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));
    }
}