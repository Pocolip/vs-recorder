export interface TeamMember {
  id: number;
  teamId: number;
  pokemonName: string;
  slot: number;
  notes: string;
  calcs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberSyncResponse {
  members: TeamMember[];
  kept: string[];
  added: string[];
  removed: string[];
}
