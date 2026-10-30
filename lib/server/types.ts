import type { StageRule, Structure } from "../domain";
import type { SolutionMethod, SpotLocation } from "../hunt-schema";
import type { OcpCredential } from "../ocp/types";
import type { Ledger } from "../relayer";

export type StoredTask = {
  id: string;
  title: string;
  instruction: string;
  /** Short flavour. Players can skip it. Null on hunts made before stories. */
  story?: string | null;
  hint: string | null;
  /** Typed code today. Choice and a QR photo are reserved. */
  method?: SolutionMethod;
  /** Empty until the creator names the place. Samples may leave it unset. */
  location?: SpotLocation | null;
  /** Kept so the creator can see what to place in the world. Players never receive it. */
  codePlain: string;
  codeHash: string;
};

export type StoredStage = {
  id: string;
  title: string;
  rule: StageRule;
  tasks: StoredTask[];
};

export type StoredHunt = {
  id: string;
  joinCode: string;
  name: string;
  description: string;
  structure: Structure;
  creatorAddress: string;
  creatorName: string;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  status: "live" | "ended";
  playerCap: number;
  sample: boolean;
  publishTx: string;
  /** Absent on older hunts. Treated as a written-clue hunt. */
  mapBased?: boolean;
  /** 100 when the proximity rule is on. Only set for map-based hunts. */
  proximityMetres?: number | null;
  prize: { title: string; description: string };
  stages: StoredStage[];
};

export type Progress = {
  huntId: string;
  address: string;
  displayName: string;
  joinedAt: string;
  completedTaskIds: string[];
  attempts: Record<string, number>;
  lockedUntil: Record<string, string>;
  prizeClaimedAt?: string;
};

export type Db = {
  hunts: StoredHunt[];
  progresses: Progress[];
  credentials: OcpCredential[];
  relayer: Ledger;
};
