package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.ReplayDTO;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.Match;
import com.yeskatronics.vs_recorder_backend.mappers.ReplayMapper;
import com.yeskatronics.vs_recorder_backend.utils.ReplayMatcher;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class ReplayBrowseService {
    private final EntityManager entityManager;
    private final ReplayMetadataService metadata;
    private final ReplayMapper mapper;

    private Predicate[] filters(CriteriaBuilder cb, Root<Replay> root, Long teamId, ReplayDTO.BrowseRequest filter) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("team").get("id"), teamId));
        if (filter.getResult() != null && !filter.getResult().equals("all"))
            predicates.add(cb.equal(root.get("result"), filter.getResult()));
        if (filter.getReviewed() != null) predicates.add(cb.equal(root.get("reviewed"), filter.getReviewed()));
        if (filter.getTags() != null) for (String tag : filter.getTags()) {
            // Separate joins retain AND-across-tags / OR-across-species behavior.
            var species = root.<Replay, String>joinList("opponentSpecies");
            String pattern = "%" + tag.toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            predicates.add(cb.or(cb.like(species, pattern, '\\'),
                    cb.like(cb.function("replace", String.class, species, cb.literal("-"), cb.literal(" ")), pattern, '\\')));
        }
        return predicates.toArray(Predicate[]::new);
    }

    private List<Order> order(CriteriaBuilder cb, Root<Replay> root, ReplayDTO.BrowseRequest filter) {
        boolean asc = "asc".equals(filter.getDirection());
        List<Expression<?>> expressions = new ArrayList<>();
        switch (filter.getSort()) {
            case "opponent" -> expressions.add(cb.coalesce(root.<String>get("opponent"), ""));
            case "result" -> expressions.add(cb.<Integer>selectCase().when(cb.equal(root.get("result"), "win"), 0).otherwise(1));
            default -> { }
        }
        expressions.add(root.get("createdAt"));
        expressions.add(root.get("id"));
        return expressions.stream().map(expression -> asc ? cb.asc(expression) : cb.desc(expression)).toList();
    }

    private long count(Long teamId, ReplayDTO.BrowseRequest filter) {
        var cb = entityManager.getCriteriaBuilder();
        var query = cb.createQuery(Long.class);
        var root = query.from(Replay.class);
        query.select(cb.countDistinct(root.get("id"))).where(filters(cb, root, teamId, filter));
        return entityManager.createQuery(query).getSingleResult();
    }

    private List<ReplayDTO.Summary> summaries(Long teamId, Team identity, ReplayDTO.BrowseRequest filter, Integer offset, Integer size) {
        var cb = entityManager.getCriteriaBuilder();
        var query = cb.createTupleQuery();
        var root = query.from(Replay.class);
        // Explicit columns keep battle_log out of the generated SQL.
        query.multiselect(root.get("id").alias("id"), root.get("match").get("id").alias("matchId"),
                root.get("url").alias("url"), root.get("opponent").alias("opponent"), root.get("result").alias("result"),
                root.get("gameNumber").alias("gameNumber"), root.get("date").alias("date"), root.get("notes").alias("notes"),
                root.get("reviewed").alias("reviewed"), root.get("createdAt").alias("createdAt"),
                root.get("battleMetadata").alias("battleMetadata"));
        // Filtering through joins can repeat rows. Grouping by ID avoids DISTINCT on JSON on PostgreSQL.
        // Instead, use an ID subquery for filters and keep the outer query projection simple.
        var ids = query.subquery(Long.class);
        var filtered = ids.from(Replay.class);
        ids.select(filtered.get("id")).where(filters(cb, filtered, teamId, filter));
        query.where(root.get("id").in(ids)).orderBy(order(cb, root, filter));
        var typed = entityManager.createQuery(query);
        if (offset != null) typed.setFirstResult(offset);
        if (size != null) typed.setMaxResults(size);
        return typed.getResultList().stream().map(row -> toSummary(row, identity)).toList();
    }

    private ReplayDTO.Summary toSummary(Tuple row, Team identity) {
        Replay replay = new Replay();
        replay.setId(row.get("id", Long.class));
        replay.setTeam(identity);
        Long matchId = row.get("matchId", Long.class);
        if (matchId != null) { Match match = new Match(); match.setId(matchId); replay.setMatch(match); }
        replay.setUrl(row.get("url", String.class));
        replay.setOpponent(row.get("opponent", String.class));
        replay.setResult(row.get("result", String.class));
        replay.setGameNumber(row.get("gameNumber", Integer.class));
        replay.setDate(row.get("date", LocalDateTime.class));
        replay.setNotes(row.get("notes", String.class));
        replay.setReviewed(row.get("reviewed", Boolean.class));
        replay.setCreatedAt(row.get("createdAt", LocalDateTime.class));
        replay.setBattleMetadata(row.get("battleMetadata", ReplayMatcher.BattleData.class));
        return mapper.toSummaryDTO(replay);
    }

    public ReplayDTO.BrowsePage page(Long teamId, ReplayDTO.BrowseRequest filter) {
        Team identity = metadata.ensureTeam(teamId);
        int size = Math.max(1, Math.min(100, filter.getSize()));
        long total = count(teamId, filter);
        int page = (int) Math.min(Math.max(0, filter.getPage()), Math.max(0, (total - 1) / size));
        String result = filter.getResult();
        long wins = 0, losses = 0;
        if (result == null || result.equals("all") || result.equals("win")) {
            filter.setResult("win"); wins = count(teamId, filter);
        }
        if (result == null || result.equals("all") || result.equals("loss")) {
            filter.setResult("loss"); losses = count(teamId, filter);
        }
        filter.setResult(result);
        return new ReplayDTO.BrowsePage(summaries(teamId, identity, filter, page * size, size), total,
                count(teamId, new ReplayDTO.BrowseRequest()), wins, losses, page, size);
    }

    /** Explicit whole-history path for analytics consumers, still excluding raw logs. */
    public List<ReplayDTO.Summary> all(Long teamId) {
        return summaries(teamId, metadata.ensureTeam(teamId), new ReplayDTO.BrowseRequest(), null, null);
    }

    public List<String> urls(Long teamId, ReplayDTO.BrowseRequest filter) {
        metadata.ensureTeam(teamId);
        var cb = entityManager.getCriteriaBuilder();
        var query = cb.createQuery(String.class);
        var root = query.from(Replay.class);
        var ids = query.subquery(Long.class);
        var filtered = ids.from(Replay.class);
        ids.select(filtered.get("id")).where(filters(cb, filtered, teamId, filter));
        query.select(root.get("url")).where(root.get("id").in(ids)).orderBy(order(cb, root, filter));
        return entityManager.createQuery(query).getResultList();
    }

    public int setReviewed(Long teamId, ReplayDTO.BrowseRequest filter, boolean reviewed) {
        metadata.ensureTeam(teamId);
        var cb = entityManager.getCriteriaBuilder();
        var update = cb.createCriteriaUpdate(Replay.class);
        var root = update.from(Replay.class);
        var ids = update.subquery(Long.class);
        var filtered = ids.from(Replay.class);
        ids.select(filtered.get("id")).where(filters(cb, filtered, teamId, filter));
        update.set("reviewed", reviewed).where(root.get("id").in(ids));
        return entityManager.createQuery(update).executeUpdate();
    }
}
