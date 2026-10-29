import { hashCode, normalizeCode } from "./codes";
import { deviceId, loadSession, accountFromWords } from "./identity";
import { canonicalMessage } from "./message";
import type { PublicStage, Structure } from "./domain";

export class ClientError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export type HuntCard = {
  joinCode: string;
  name: string;
  description: string;
  structure: Structure;
  creatorName: string;
  sample: boolean;
  phase: "upcoming" | "open" | "ended";
  completedCount: number;
  totalCount: number;
  prizeReady: boolean;
  prizeClaimed: boolean;
};

export type SampleCard = {
  joinCode: string;
  name: string;
  description: string;
  structure: Structure;
};

export type HomePayload = {
  hunts: HuntCard[];
  samples: SampleCard[];
  allowance: { used: number; cap: number };
};

export type HuntDetail = {
  joinCode: string;
  name: string;
  description: string;
  structure: Structure;
  creatorName: string;
  sample: boolean;
  playerCount: number;
  playerCap: number;
  prize: { title: string; description: string };
  joined: boolean;
  prizeClaimed: boolean;
  phase: "upcoming" | "open" | "ended";
  completedCount: number;
  totalCount: number;
  prizeReady: boolean;
  hiddenStepCount: number;
  stages: PublicStage[];
};

export type CollectionItem = {
  id: string;
  kind: "mark" | "prize";
  title: string;
  description: string;
  huntName: string;
  joinCode: string;
  issuedAt: string;
};

export type MineHunt = {
  joinCode: string;
  name: string;
  status: "live" | "ended";
  structure: Structure;
  playerCount: number;
  playerCap: number;
  stages: { title: string; tasks: { title: string; code: string }[] }[];
};

export type ReviewNotes = {
  chain: string;
  chainId: number;
  mode: "mock";
  poolEth: string;
  spentEth: string;
  deviceSpentEth: string;
  deviceCapEth: string;
  huntCapEth: string;
  identityPath: string;
};

async function parse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ClientError(data.error || "invalid");
  return data as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    headers: { "x-device-id": deviceId() },
  });
  return parse<T>(response);
}

export async function signedPost<T>(
  path: string,
  body: unknown,
  sign: { action: string; hunt: string; task?: string; code?: string },
): Promise<T> {
  const session = loadSession();
  if (!session) throw new ClientError("unauthorized");
  const at = new Date().toISOString();
  const codeHash = sign.code ? await hashCode(sign.code) : "";
  const message = canonicalMessage({
    action: sign.action,
    hunt: normalizeCode(sign.hunt),
    task: sign.task ?? "",
    codeHash,
    at,
  });
  const signature = await accountFromWords(session.words).signMessage({ message });
  const response = await fetch(path, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-tb0x-address": session.address,
      "x-tb0x-signature": signature,
      "x-tb0x-at": at,
      "x-device-id": deviceId(),
    },
    body: JSON.stringify(body ?? {}),
  });
  return parse<T>(response);
}
