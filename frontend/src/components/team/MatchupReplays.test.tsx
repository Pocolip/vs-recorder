import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MatchupReplays from "./MatchupReplays";
import { matchupPaste, replayFixture } from "../../test/replayFixtures";

describe("matchup replay disclosure", () => {
  it("starts collapsed, separates possible matches and paginates", () => {
    const replays = Array.from({ length: 12 }, (_, i) => replayFixture(i));
    const possible = replayFixture(13);
    possible.battleData!.teamDetails!.p2[0].item = null;
    render(<MatchupReplays pokemon={matchupPaste} replays={[...replays, possible]} loading={false} error={null} onRetry={vi.fn()} />);
    const toggle = screen.getByRole("button", { name: /Replays/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "View" })).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText("Confirmed matches (12)")).toBeTruthy();
    expect(screen.getByText("Possible matches (1)")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "View" })).toHaveLength(11);
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getAllByRole("link", { name: "View" })).toHaveLength(13);
    expect(screen.getByText(/were not fully revealed/)).toBeTruthy();
  });
  it("renders loading, retry, incomplete paste, and empty states", () => {
    const retry = vi.fn();
    const props = { pokemon: matchupPaste, replays: [], loading: true, error: null as string | null, onRetry: retry };
    const { rerender } = render(<MatchupReplays {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Replays/ }));
    expect(screen.getByRole("status")).toBeTruthy();
    rerender(<MatchupReplays {...props} loading={false} error="Unavailable" />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<MatchupReplays {...props} loading={false} pokemon={[]} />);
    expect(screen.getByText(/complete six-Pokémon/)).toBeTruthy();
    rerender(<MatchupReplays {...props} loading={false} />);
    expect(screen.getByText(/No matching replays/)).toBeTruthy();
  });
});
