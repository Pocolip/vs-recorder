package com.yeskatronics.vs_recorder_backend.utils;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.*;

/** Original roster/item evidence, not the items held after Trick or other transfers. */
public final class ReplayTeamDetailsParser {
    private ReplayTeamDetailsParser() {}

    @Data
    @lombok.NoArgsConstructor
    @AllArgsConstructor
    public static class Member {
        private String species;
        // null = unrevealed; "" = an explicitly empty item slot in a team sheet.
        private String item;
    }

    public static Map<String, List<Member>> parse(String log, Map<String, List<String>> teams) {
        Map<String, List<Member>> result = new HashMap<>();
        Set<String> openSheets = new HashSet<>();
        teams.forEach((player, names) -> {
            List<Member> members = new ArrayList<>();
            names.forEach(name -> members.add(new Member(name, null)));
            result.put(player, members);
        });
        for (String line : log.split("\n")) {
            if (!line.startsWith("|showteam|")) continue;
            String[] parts = line.split("\\|", 4);
            if (parts.length != 4 || !result.containsKey(parts[2])) continue;
            List<Member> sheet = new ArrayList<>();
            for (String packed : parts[3].split("\\]", -1)) {
                String[] fields = packed.split("\\|", -1);
                if (fields.length < 3) continue;
                String species = (fields[1].isBlank() ? fields[0] : fields[1]).trim();
                if (!species.isBlank()) sheet.add(new Member(species, fields[2].trim()));
            }
            if (sheet.size() == 6) {
                result.put(parts[2], sheet);
                openSheets.add(parts[2]);
            }
        }
        // Preview hides the Crowned formes even without a '*' marker. Keep them
        // uncertain until a switch/detailschange reveals the actual forme.
        result.forEach((player, members) -> {
            if (openSheets.contains(player)) return;
            members.forEach(member -> {
                if (Set.of("zacian", "zamazenta").contains(id(member.getSpecies()))) {
                    member.setSpecies(member.getSpecies() + "-*");
                }
            });
        });
        for (String line : log.split("\n")) {
            if (!line.startsWith("|switch|") && !line.startsWith("|drag|") && !line.startsWith("|detailschange|")) continue;
            String[] parts = line.split("\\|", -1);
            if (parts.length < 4 || parts[2].length() < 2) continue;
            String player = parts[2].substring(0, 2);
            if (openSheets.contains(player)) continue;
            List<Member> members = result.get(player);
            if (members == null) continue;
            String species = parts[3].split(",")[0].trim();
            if (species.contains("*")) continue;
            for (Member member : members) {
                String base = member.getSpecies().replace("-*", "");
                if (member.getSpecies().contains("*") &&
                        (id(species).equals(id(base)) || species.startsWith(base + "-"))) {
                    member.setSpecies(species);
                    break;
                }
                // Crowned can be revealed by detailschange after the first switch.
                if (Set.of("zacian", "zamazenta").contains(id(member.getSpecies())) &&
                        id(species).equals(id(member.getSpecies()) + "crowned")) {
                    member.setSpecies(species);
                    break;
                }
            }
        }
        // Mega Stones cannot be transferred: the event confirms the original held item.
        for (String line : log.split("\n")) {
            if (!line.startsWith("|-mega|")) continue;
            String[] parts = line.split("\\|", -1);
            if (parts.length < 5 || parts[2].length() < 2 || parts[4].isBlank()) continue;
            List<Member> members = result.get(parts[2].substring(0, 2));
            if (members == null) continue;
            for (Member member : members) {
                if (id(member.getSpecies()).equals(id(parts[3]))) {
                    if (member.getItem() == null) member.setItem(parts[4].trim());
                    break;
                }
            }
        }
        return result;
    }

    private static String id(String name) {
        return name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
