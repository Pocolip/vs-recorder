package com.yeskatronics.vs_recorder_backend.utils;

import com.yeskatronics.vs_recorder_backend.services.PokemonService;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Identifies which side of a Pokemon Showdown replay corresponds to the team owner
 * vs. the opponent. Used by ReplayMapper, ShowdownService, ReplayService, and
 * AnalyticsService to avoid the historical bug where two registered usernames on the
 * same replay produced a null opponent (issue #160).
 *
 * <p>Cascade (strongest signal first):
 * <ol>
 *   <li>Exactly one side's username is registered AND that side's revealed roster
 *       matches the registered team roster.</li>
 *   <li>Exactly one side's username is registered.</li>
 *   <li>Exactly one side's revealed roster matches the registered team roster.</li>
 *   <li>Default: user = p1. Covers true mirrors and replays with no usable signal.</li>
 * </ol>
 */
public final class PlayerIdentifier {

    public record Identification(
            String userPlayer,
            String opponentPlayer,
            String userUsername,
            String opponentUsername
    ) {}

    private PlayerIdentifier() {}

    public static Identification identify(
            List<String> registeredUsernames,
            List<String> registeredRoster,
            Map<String, String> playerUsernames,
            Map<String, List<String>> playerTeams,
            PokemonService pokemonService
    ) {
        String p1User = playerUsernames == null ? "" : playerUsernames.getOrDefault("p1", "");
        String p2User = playerUsernames == null ? "" : playerUsernames.getOrDefault("p2", "");

        boolean p1Name = nameMatches(p1User, registeredUsernames);
        boolean p2Name = nameMatches(p2User, registeredUsernames);

        List<String> p1Team = playerTeams == null ? null : playerTeams.get("p1");
        List<String> p2Team = playerTeams == null ? null : playerTeams.get("p2");
        boolean p1TeamHit = teamMatches(p1Team, registeredRoster, pokemonService);
        boolean p2TeamHit = teamMatches(p2Team, registeredRoster, pokemonService);

        // Tier 1: name + team
        boolean p1Full = p1Name && p1TeamHit;
        boolean p2Full = p2Name && p2TeamHit;
        if (p1Full ^ p2Full) {
            return p1Full ? result("p1", p1User, p2User) : result("p2", p2User, p1User);
        }

        // Tier 2: name only
        if (p1Name ^ p2Name) {
            return p1Name ? result("p1", p1User, p2User) : result("p2", p2User, p1User);
        }

        // Tier 3: team only
        if (p1TeamHit ^ p2TeamHit) {
            return p1TeamHit ? result("p1", p1User, p2User) : result("p2", p2User, p1User);
        }

        // Tier 4: default p1
        return result("p1", p1User, p2User);
    }

    private static Identification result(String userSide, String userName, String oppName) {
        String opp = "p1".equals(userSide) ? "p2" : "p1";
        return new Identification(userSide, opp, userName, oppName);
    }

    private static boolean nameMatches(String username, List<String> registered) {
        if (username == null || username.isBlank() || registered == null) {
            return false;
        }
        return registered.stream().anyMatch(u -> u != null && u.equalsIgnoreCase(username));
    }

    private static boolean teamMatches(
            List<String> revealed,
            List<String> registeredRoster,
            PokemonService pokemonService
    ) {
        if (revealed == null || revealed.isEmpty()) return false;
        if (registeredRoster == null || registeredRoster.isEmpty()) return false;
        if (pokemonService == null) return false;

        Set<String> revealedCanon = revealed.stream()
                .map(pokemonService::resolveCanonical)
                .collect(Collectors.toSet());

        return registeredRoster.stream()
                .map(pokemonService::resolveCanonical)
                .allMatch(revealedCanon::contains);
    }
}
