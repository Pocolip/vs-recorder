import { createContext, useCallback, useContext, useRef } from "react";
import type { PokemonState, FieldState } from "../types";
import type { PokemonData as PokemonFromPaste } from "../services/pokepasteService";

interface CalcSnapshot {
  p1: PokemonState;
  p2: PokemonState;
  field: FieldState;
  selectedP1Move: number;
  selectedP2Move: number;
  activeSide: "p1" | "p2";
  teamPokemon: PokemonFromPaste[];
}

interface CalcStateContextType {
  get: (teamId: number) => CalcSnapshot | undefined;
  set: (teamId: number, snapshot: CalcSnapshot) => void;
}

const CalcStateContext = createContext<CalcStateContextType | undefined>(undefined);

export const useCalcState = () => {
  const ctx = useContext(CalcStateContext);
  if (!ctx) throw new Error("useCalcState must be used within CalcStateProvider");
  return ctx;
};

export const CalcStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useRef<Map<number, CalcSnapshot>>(new Map());

  const get = useCallback((teamId: number) => store.current.get(teamId), []);
  const set = useCallback((teamId: number, snapshot: CalcSnapshot) => {
    store.current.set(teamId, snapshot);
  }, []);

  return (
    <CalcStateContext.Provider value={{ get, set }}>
      {children}
    </CalcStateContext.Provider>
  );
};
