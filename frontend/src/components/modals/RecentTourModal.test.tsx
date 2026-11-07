import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecentTourModal from "./RecentTourModal";
import type { TournamentTeamsData } from "../../data/tournamentTeamsByRegulation";

vi.mock("../pokemon/PokemonSprite", () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

let data: TournamentTeamsData | null = null;
vi.mock("../../data/tournamentTeamsByRegulation", async (importActual) => ({
  ...(await importActual<typeof import("../../data/tournamentTeamsByRegulation")>()),
  getTournamentTeamsForRegulation: () => data,
}));

const SHEET = "Raichu @ Raichunite Y\nAbility: Lightning Rod\nTimid Nature\n- Protect\n\nKommo-o\n- Clanging Scales";
const names = ["Raichu", "Kommo-o", "Gholdengo", "Rillaboom"];

function dataset(team: Record<string, unknown>, extra: Partial<TournamentTeamsData> = {}): TournamentTeamsData {
  return {
    regulation: "M-C",
    dateRange: { from: "2026-09-08", to: "2026-11-07" },
    generatedAt: "2026-11-07",
    compositions: [{
      size: 6,
      clusters: [{
        pokemon: names, pokemonNames: names, wins: 10, losses: 5,
        teams: [{ name: "Eric", placement: 1, record: "17-0-0", pokemonNames: names, tournamentName: "Frankfurt Regional", ...team }],
      }],
    }],
    ...extra,
  };
}

function renderModal() {
  const onImport = vi.fn().mockResolvedValue(undefined);
  render(<RecentTourModal isOpen onClose={vi.fn()} teamRegulation="VGC 2026 Regulation M-C" onImport={onImport} />);
  fireEvent.click(screen.getByRole("button", { name: /Raichu/ }));
  return onImport;
}

describe("Recent Tour import", () => {
  beforeEach(() => { data = null; });

  it("imports direct-source teams as inline sheet text with the source link in notes", async () => {
    const sourceUrl = "https://standings.reportworm.com/2027/frankfurt/player/eric";
    data = dataset({ sheetId: "abc1234567", sourceUrl }, {
      source: "direct",
      sources: [{ name: "Limitless", events: 196 }, { name: "Reportworm", events: 8 }],
      sheets: { abc1234567: SHEET },
    });
    const onImport = renderModal();

    expect(screen.getByText(/Limitless/)).toBeTruthy();
    expect(screen.getByText(/196 events/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /View Teamsheet/ }).getAttribute("href")).toBe(sourceUrl);

    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Imported/ })).toBeTruthy());
    expect(onImport).toHaveBeenCalledWith(
      SHEET,
      `Eric · Frankfurt Regional · #1 · 17-0-0\n${sourceUrl}`,
    );
  });

  it("keeps LabMaus pokepaste imports unchanged", async () => {
    const pokepasteUrl = "https://pokepast.es/f923016c52691ce2";
    data = dataset({ pokepasteUrl }, { source: "labmaus", labmausRegulation: "Regulation Set M-C" });
    const onImport = renderModal();

    expect(screen.getByRole("link", { name: "labmaus.net" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /View Paste/ }).getAttribute("href")).toBe(pokepasteUrl);
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(onImport).toHaveBeenCalledWith(pokepasteUrl, "Eric · Frankfurt Regional · #1 · 17-0-0"));
  });

  it("disables import when a team has neither a paste link nor a sheet", () => {
    data = dataset({ sheetId: "missing" }, { source: "direct", sheets: {} });
    renderModal();
    expect((screen.getByRole("button", { name: "Import" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("link", { name: /View/ })).toBeNull();
  });
});
