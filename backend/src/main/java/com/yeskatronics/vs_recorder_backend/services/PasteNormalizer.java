package com.yeskatronics.vs_recorder_backend.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Makes a team's paste one the matchup engine accepts, without asking the user to
 * edit it.
 *
 * Showdown pastes list a Mega Evolving Pokemon as the species it evolves from,
 * holding its stone (the Mega forme only exists in battle). Many shared pastes name
 * the forme instead ({@code Garchomp-Mega @ Garchompite}), which Showdown's validator
 * quietly converts and the engine doesn't. This does the same conversion: on each
 * set's first line, a Mega forme held with its stone becomes the species it comes
 * from. Nicknames, gender, the item and every other line stay as they are.
 *
 * A Mega forme without its stone (or with another) is refused: which one was meant
 * can't be guessed.
 */
@Service
@RequiredArgsConstructor
public class PasteNormalizer {

    /** {@code Nickname (Species)}: the species is in the last parentheses. */
    private static final Pattern NICKNAMED = Pattern.compile("^(.*\\S)\\s*\\(([^()]+)\\)$");
    private static final Pattern GENDER = Pattern.compile("\\s+\\((M|F)\\)$");
    private static final String ITEM_SEPARATOR = " @ ";

    private final PokemonService pokemonService;

    /**
     * @param text  the paste to send
     * @param notes what was changed, for the user ("Garchomp-Mega was sent as Garchomp
     *              holding Garchompite."); empty when nothing was
     */
    public record Result(String text, List<String> notes) {}

    /**
     * @throws IllegalArgumentException naming each Mega forme that doesn't hold its stone
     */
    public Result normalize(String paste) {
        String[] lines = paste.split("\n", -1);
        List<String> notes = new ArrayList<>();
        List<String> problems = new ArrayList<>();
        boolean setStart = true;
        for (int i = 0; i < lines.length; i++) {
            String raw = lines[i];
            boolean carriageReturn = raw.endsWith("\r");
            String line = carriageReturn ? raw.substring(0, raw.length() - 1) : raw;
            if (line.isBlank()) {
                setStart = true;
                continue;
            }
            if (!setStart) {
                continue;
            }
            setStart = false;
            String rewritten = rewriteFirstLine(line, notes, problems);
            if (rewritten != null) {
                lines[i] = rewritten + (carriageReturn ? "\r" : "");
            }
        }
        if (!problems.isEmpty()) {
            throw new IllegalArgumentException(String.join(" ", problems));
        }
        return new Result(String.join("\n", lines), List.copyOf(notes));
    }

    /** The set's first line with its Mega forme replaced, or null to leave it alone. */
    private String rewriteFirstLine(String line, List<String> notes, List<String> problems) {
        int at = line.indexOf(ITEM_SEPARATOR);
        String head = at >= 0 ? line.substring(0, at) : line;
        String itemPart = at >= 0 ? line.substring(at) : "";
        String item = at >= 0 ? line.substring(at + ITEM_SEPARATOR.length()).trim() : "";

        String gender = "";
        Matcher genderMatch = GENDER.matcher(head);
        if (genderMatch.find()) {
            gender = head.substring(genderMatch.start());
            head = head.substring(0, genderMatch.start());
        }

        String nickname = null;
        String species = head.trim();
        Matcher nicknamed = NICKNAMED.matcher(species);
        if (nicknamed.matches()) {
            nickname = nicknamed.group(1);
            species = nicknamed.group(2).trim();
        }

        Optional<PokemonService.MegaForme> found = pokemonService.megaForme(species);
        if (found.isEmpty()) {
            return null;
        }
        PokemonService.MegaForme mega = found.get();
        if (!sameItem(item, mega.stone())) {
            problems.add("%s needs to hold %s (%s). List it as %s @ %s.".formatted(
                    mega.name(), mega.stone(), item.isEmpty() ? "it holds no item" : "it holds " + item,
                    mega.from(), mega.stone()));
            return null;
        }
        notes.add("%s was sent as %s holding %s.".formatted(mega.name(), mega.from(), mega.stone()));
        String newHead = nickname != null ? nickname + " (" + mega.from() + ")" : mega.from();
        return newHead + gender + itemPart;
    }

    private static boolean sameItem(String a, String b) {
        return key(a).equals(key(b));
    }

    private static String key(String item) {
        return item.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
