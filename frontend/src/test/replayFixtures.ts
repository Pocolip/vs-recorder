import type { Replay } from "../types";
import type { PokemonData } from "../services/pokepasteService";

export const matchupPaste: PokemonData[] = [
  { name: "Charizard", species: "Charizard", item: "Charizardite Y" },
  ...["Incineroar", "Rillaboom", "Urshifu-Rapid-Strike", "Amoonguss", "Farigiraf"]
    .map((name) => ({ name, species: name, item: "Sitrus Berry" })),
];
export function replayFixture(id = 1): Replay {
  return {
    id, teamId: 1, url: `https://replay.pokemonshowdown.com/test-${id}`,
    opponent: "Opponent", result: "win", gameNumber: null, matchId: null,
    notes: "", reviewed: false, battleLog: null,
    createdAt: "2026-10-20T12:00:00Z", updatedAt: "2026-10-20T12:00:00Z",
    battleData: {
      opponentPlayer: "p2",
      teams: { p2: matchupPaste.map((m) => m.name) },
      teamDetails: { p2: matchupPaste.map((m) => ({ species: m.name, item: m.item ?? "" })) },
    },
  };
}
