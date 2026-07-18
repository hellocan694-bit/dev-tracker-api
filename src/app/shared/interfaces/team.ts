/**
 * team.ts — Strict TypeScript interfaces matching the optimised
 * backend JSON structure for GET /api/teams/my-teams.
 *
 * Only the fields the API actually returns are declared here —
 * no password, no subscription details, no internal flags.
 */

/** Minimal populated user object returned by the API. */
export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  sharedProjects?: any[];
}

/** A single team document as returned by the my-teams endpoint. */
export interface Team {
  _id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  owner: TeamMember;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

/** Top-level API response envelope for GET /api/teams/my-teams. */
export interface MyTeamsResponse {
  status: 'success';
  results: number;
  data: {
    ownedTeams: Team[];
    memberTeams: Team[];
  };
}

/** Role a user holds in a given team — used for UI differentiation. */
export type TeamRole = 'owner' | 'member';
