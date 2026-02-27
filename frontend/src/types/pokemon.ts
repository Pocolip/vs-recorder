export interface MoveState {
  name: string;
  crit: boolean;
  bpOverride: number | null;
}

export interface StatSpread {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface BoostSpread {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface PokemonState {
  species: string;
  level: number;
  nature: string;
  ability: string;
  item: string;
  teraType: string | null;
  isTera: boolean;
  status: string;
  evs: StatSpread;
  ivs: StatSpread;
  boosts: BoostSpread;
  curHP: number;
  moves: MoveState[];
  boostedStat: 'atk' | 'def' | 'spa' | 'spd' | 'spe' | null;
}

export interface SideState {
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;
  isHelpingHand: boolean;
  isTailwind: boolean;
  isFriendGuard: boolean;
  isSteelySpiritAlly: boolean;
  isPowerSpot: boolean;
  isBattery: boolean;
  steelsurge: number;
  spikes: number;
  isSR: boolean;
}

export interface FieldState {
  gameType: string;
  terrain: string;
  weather: string;
  isGravity: boolean;
  isNeutralizingGas: boolean;
  attackerSide: SideState;
  defenderSide: SideState;
  isTabletsOfRuin: boolean;
  isVesselOfRuin: boolean;
  isSwordOfRuin: boolean;
  isBeadsOfRuin: boolean;
}

export interface PokemonData {
  name: string;
  sprite: string;
  types: string[];
  abilities: string[];
  stats: StatSpread;
}
