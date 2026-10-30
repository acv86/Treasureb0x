import type { StageRule, Structure } from "../domain";
import type { OcpCredential } from "../ocp/types";
import type { Ledger } from "../relayer";

export type StoredTask = {
  id: string;
  title: string;
  instruction: string;
  hint: string | null;
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
