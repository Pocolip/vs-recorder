export interface Composition {
  lead1: string;
  lead2: string;
  back1: string;
  back2: string;
  notes: string;
}

export interface GamePlanTeam {
  id: number;
  gamePlanId: number;
  pokepaste: string;
  playerName: string;
  notes: string;
  compositions: Composition[];
  createdAt: string;
  updatedAt: string;
}

export interface GamePlan {
  id: number;
  teamId: number;
  name: string;
  notes: string;
  teams: GamePlanTeam[];
  createdAt: string;
  updatedAt: string;
}
