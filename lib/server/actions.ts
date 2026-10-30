import "server-only";

import { verifyMessage } from "viem";
import { hashCode, hashesEqual, isJoinCode, isStepCode, normalizeCode } from "../codes";
import {
  allTasks,
  phaseAt,
  playerView,
  prizeReady,
  ruleHolds,
  type HuntShape,
  type PlayerView,
  type Structure,
} from "../domain";
import { isB0xCredentialKind } from "../credentials";
import { LIMITS, microToEth } from "../limits";
import { canonicalMessage } from "../message";
import { sponsor } from "../relayer";
import { createMockOcp } from "./ocp-mock";
import { ActionError, withStore } from "./store";
import type { Db, Progress, StoredHunt, StoredStage, StoredTask } from "./types";

const ocp = createMockOcp();

export type SignedActor = { address: string; deviceId: string };

function shapeOf(hunt: StoredHunt): HuntShape {
  return {
    structure: hunt.structure,
    status: hunt.status,
    startsAt: hunt.startsAt,
    endsAt: hunt.endsAt,
    stages: hunt.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      rule: stage.rule,
      tasks: stage.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        instruction: task.instruction,
        hint: task.hint,
      })),
    })),
  };
}

function findHunt(db: Db, joinCode: string): StoredHunt {
  const hunt = db.hunts.find((item) => item.joinCode === normalizeCode(joinCode));
  if (!hunt) throw new ActionError("not_found");
  return hunt;
}

function progressFor(db: Db, huntId: string, address: string): Progress | undefined {
  return db.progresses.find((item) => item.huntId === huntId && item.address === address);
}

function playerCount(db: Db, huntId: string): number {
  return db.progresses.filter((item) => item.huntId === huntId).length;
}

function charge(db: Db, deviceId: string, huntId: string) {
  const result = sponsor(db.relayer, deviceId, huntId);
  if (!result.ok) {
    const code =
      result.reason === "pool"
        ? "relayer_pool"
        : result.reason === "device"
          ? "relayer_device"
          : "relayer_hunt";
    throw new ActionError(code);
  }
  db.relayer = result.ledger;
}

function detail(db: Db, hunt: StoredHunt, address: string | null) {
  const progress = address ? progressFor(db, hunt.id, address) : undefined;
  const shape = shapeOf(hunt);
  const view: PlayerView = progress
    ? playerView(shape, progress.completedTaskIds, Date.now())
    : {
        phase: phaseAt(shape, Date.now()),
        completedCount: 0,
        totalCount: allTasks(shape).length,
        prizeReady: false,
        hiddenStepCount: 0,
        stages: [],
      };
  return {
    joinCode: hunt.joinCode,
    name: hunt.name,
    description: hunt.description,
    structure: hunt.structure,
    creatorName: hunt.creatorName,
    sample: hunt.sample,
    playerCount: playerCount(db, hunt.id),
    playerCap: hunt.playerCap,
    prize: hunt.prize,
    joined: Boolean(progress),
    prizeClaimed: Boolean(progress?.prizeClaimedAt),
    ...view,
  };
}

export async function requireSignature(
  request: Request,
  input: { action: string; hunt: string; task?: string; code?: string },
): Promise<SignedActor> {
  const address = request.headers.get("x-tb0x-address") ?? "";
  const signature = request.headers.get("x-tb0x-signature") ?? "";
  const at = request.headers.get("x-tb0x-at") ?? "";
  const deviceId = request.headers.get("x-device-id") ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new ActionError("unauthorized");
  if (!deviceId || deviceId.length > 80) throw new ActionError("unauthorized");
  if (!/^0x[a-fA-F0-9]+$/.test(signature)) throw new ActionError("unauthorized");
  const atMs = Date.parse(at);
  if (!Number.isFinite(atMs) || Math.abs(Date.now() - atMs) > LIMITS.signatureWindowMs) {
    throw new ActionError("unauthorized");
  }
  const codeHash = input.code ? await hashCode(input.code) : "";
  const message = canonicalMessage({
    action: input.action,
    hunt: normalizeCode(input.hunt),
    task: input.task ?? "",
    codeHash,
    at,
  });
  const ok = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  });
  if (!ok) throw new ActionError("unauthorized");
  return { address: address.toLowerCase(), deviceId };
}

export function readAddress(value: string | null): string | null {
  if (!value) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value.toLowerCase();
}

export async function listHome(address: string | null) {
  return withStore((db) => {
    const joined = address
      ? db.hunts
          .filter((hunt) => progressFor(db, hunt.id, address))
          .map((hunt) => {
            const card = detail(db, hunt, address);
            return {
              joinCode: card.joinCode,
              name: card.name,
              description: card.description,
              structure: card.structure,
              creatorName: card.creatorName,
              sample: card.sample,
              phase: card.phase,
              completedCount: card.completedCount,
              totalCount: card.totalCount,
              prizeReady: card.prizeReady,
              prizeClaimed: card.prizeClaimed,
            };
          })
      : [];
    const samples = db.hunts
      .filter((hunt) => hunt.sample && hunt.status === "live")
      .map((hunt) => ({
        joinCode: hunt.joinCode,
        name: hunt.name,
        description: hunt.description,
        structure: hunt.structure,
      }));
    const used = address
      ? db.hunts.filter(
          (hunt) => hunt.creatorAddress === address && !hunt.sample && hunt.status === "live",
        ).length
      : 0;
    return { hunts: joined, samples, allowance: { used, cap: LIMITS.privateLiveHunts } };
  }, false);
}

export async function getHunt(joinCode: string, address: string | null) {
  return withStore((db) => detail(db, findHunt(db, joinCode), address), false);
}

export async function joinHunt(actor: SignedActor, joinCode: string, displayName: string) {
  const name = displayName.trim().slice(0, 24);
  if (!name) throw new ActionError("invalid");
  return withStore((db) => {
    const hunt = findHunt(db, joinCode);
    const existing = progressFor(db, hunt.id, actor.address);
    if (existing) return detail(db, hunt, actor.address);
    const phase = phaseAt(shapeOf(hunt), Date.now());
    if (phase === "ended") throw new ActionError("ended");
    if (playerCount(db, hunt.id) >= hunt.playerCap) throw new ActionError("full");
    db.progresses.push({
      huntId: hunt.id,
      address: actor.address,
      displayName: name,
      joinedAt: new Date().toISOString(),
      completedTaskIds: [],
      attempts: {},
      lockedUntil: {},
    });
    return detail(db, hunt, actor.address);
  });
}

export async function unlockStep(
  actor: SignedActor,
  joinCode: string,
  taskId: string,
  code: string,
) {
  if (!taskId || !isStepCode(code)) throw new ActionError("bad_code");
  return withStore(async (db) => {
    const hunt = findHunt(db, joinCode);
    const progress = progressFor(db, hunt.id, actor.address);
    if (!progress) throw new ActionError("not_joined");
    const phase = phaseAt(shapeOf(hunt), Date.now());
    if (phase !== "open") throw new ActionError(phase === "upcoming" ? "upcoming" : "ended");
    const shape = shapeOf(hunt);
    const view = playerView(shape, progress.completedTaskIds, Date.now());
    const openIds = view.stages.flatMap((stage) =>
      stage.tasks.filter((task) => task.state === "open").map((task) => task.id),
    );
    if (!openIds.includes(taskId)) throw new ActionError("invalid");
    const until = progress.lockedUntil[taskId];
    if (until && Date.parse(until) > Date.now()) throw new ActionError("too_many");
    const task = hunt.stages.flatMap((stage) => stage.tasks).find((item) => item.id === taskId);
    if (!task) throw new ActionError("invalid");
    const given = await hashCode(code);
    if (!hashesEqual(given, task.codeHash)) {
      const attempts = (progress.attempts[taskId] ?? 0) + 1;
      progress.attempts[taskId] = attempts;
      if (attempts >= LIMITS.maxCodeAttempts) {
        progress.lockedUntil[taskId] = new Date(Date.now() + LIMITS.lockoutMs).toISOString();
      }
      throw new ActionError("bad_code", true);
    }
    charge(db, actor.deviceId, hunt.id);
    const credential = await ocp.mintMark({
      holder: actor.address,
      huntId: hunt.id,
      taskId: task.id,
      title: task.title,
      description: hunt.name,
    });
    db.credentials.push(credential);
    progress.completedTaskIds.push(task.id);
    delete progress.attempts[taskId];
    delete progress.lockedUntil[taskId];
    return detail(db, hunt, actor.address);
  });
}

export async function claimPrize(actor: SignedActor, joinCode: string) {
  return withStore(async (db) => {
    const hunt = findHunt(db, joinCode);
    const progress = progressFor(db, hunt.id, actor.address);
    if (!progress) throw new ActionError("not_joined");
    if (progress.prizeClaimedAt) return detail(db, hunt, actor.address);
    if (!prizeReady(shapeOf(hunt), new Set(progress.completedTaskIds))) {
      throw new ActionError("not_ready");
    }
    charge(db, actor.deviceId, hunt.id);
    const credential = await ocp.mintPrize({
      holder: actor.address,
      huntId: hunt.id,
      title: hunt.prize.title,
      description: hunt.prize.description,
    });
    db.credentials.push(credential);
    progress.prizeClaimedAt = credential.issuedAt;
    return detail(db, hunt, actor.address);
  });
}

export type CreateBody = {
  joinCode: string;
  name: string;
  description: string;
  structure: Structure;
  startsAt: string | null;
  endsAt: string | null;
  displayName: string;
  prize: { title: string; description: string };
  stages: {
    title: string;
    rule: { kind: "all" } | { kind: "atLeast"; n: number };
    tasks: { title: string; instruction: string; code: string; hint?: string }[];
  }[];
};

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export async function createHunt(actor: SignedActor, body: CreateBody) {
  const name = cleanText(body.name, 60);
  const description = cleanText(body.description, 280);
  const displayName = cleanText(body.displayName, 24);
  const prizeTitle = cleanText(body.prize?.title, 60);
  const prizeAbout = cleanText(body.prize?.description, 280);
  const joinCode = normalizeCode(typeof body.joinCode === "string" ? body.joinCode : "");
  if (!name || !description || !displayName || !prizeTitle || !prizeAbout || !isJoinCode(joinCode)) {
    throw new ActionError("invalid");
  }
  if (body.structure !== "serial" && body.structure !== "parallel" && body.structure !== "hybrid") {
    throw new ActionError("invalid");
  }
  const startsAt = body.startsAt ? Date.parse(body.startsAt) : null;
  const endsAt = body.endsAt ? Date.parse(body.endsAt) : null;
  if (body.startsAt && !Number.isFinite(startsAt)) throw new ActionError("invalid");
  if (body.endsAt && !Number.isFinite(endsAt)) throw new ActionError("invalid");
  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) throw new ActionError("invalid");
  if (!Array.isArray(body.stages) || body.stages.length === 0) throw new ActionError("invalid");

  const stages: StoredStage[] = [];
  for (const stage of body.stages) {
    const title = cleanText(stage.title, 60) || "Stage";
    const rule = stage.rule?.kind === "atLeast" ? { kind: "atLeast" as const, n: Number(stage.rule.n) } : { kind: "all" as const };
    if (!Array.isArray(stage.tasks) || stage.tasks.length === 0) throw new ActionError("invalid");
    const tasks: StoredTask[] = [];
    for (const task of stage.tasks) {
      const taskTitle = cleanText(task.title, 60);
      const instruction = cleanText(task.instruction, 500);
      const code = normalizeCode(task.code ?? "");
      const hint = cleanText(task.hint, 200);
      if (!taskTitle || !instruction || !isStepCode(code)) throw new ActionError("invalid");
      tasks.push({
        id: newId("step"),
        title: taskTitle,
        instruction,
        hint: hint || null,
        codePlain: code,
        codeHash: await hashCode(code),
      });
    }
    if (!ruleHolds(rule, tasks.length)) throw new ActionError("invalid");
    stages.push({ id: newId("stage"), title, rule, tasks });
  }

  const taskCount = stages.reduce((sum, stage) => sum + stage.tasks.length, 0);
  if (body.structure === "serial" && (stages.length !== 1 || taskCount < 2)) throw new ActionError("invalid");
  if (body.structure === "parallel" && stages.length !== 1) throw new ActionError("invalid");
  if (body.structure === "hybrid" && stages.length < 2) throw new ActionError("invalid");
  if (body.structure === "serial") stages[0].rule = { kind: "all" };

  return withStore(async (db) => {
    if (db.hunts.some((hunt) => hunt.joinCode === joinCode)) throw new ActionError("code_taken");
    const used = db.hunts.filter(
      (hunt) => hunt.creatorAddress === actor.address && !hunt.sample && hunt.status === "live",
    ).length;
    if (used >= LIMITS.privateLiveHunts) throw new ActionError("allowance");
    const hunt: StoredHunt = {
      id: newId("hunt"),
      joinCode,
      name,
      description,
      structure: body.structure,
      creatorAddress: actor.address,
      creatorName: displayName,
      createdAt: new Date().toISOString(),
      startsAt: startsAt === null ? null : new Date(startsAt).toISOString(),
      endsAt: endsAt === null ? null : new Date(endsAt).toISOString(),
      status: "live",
      playerCap: LIMITS.playersPerHunt,
      sample: false,
      publishTx: "",
      prize: { title: prizeTitle, description: prizeAbout },
      stages,
    };
    charge(db, actor.deviceId, hunt.id);
    const published = await ocp.publishHunt({
      huntId: hunt.id,
      creator: actor.address,
      structure: hunt.structure,
      taskCount,
    });
    hunt.publishTx = published.txHash;
    db.hunts.push(hunt);
    db.progresses.push({
      huntId: hunt.id,
      address: actor.address,
      displayName,
      joinedAt: hunt.createdAt,
      completedTaskIds: [],
      attempts: {},
      lockedUntil: {},
    });
    return { joinCode: hunt.joinCode };
  });
}

export async function endHunt(actor: SignedActor, joinCode: string) {
  return withStore((db) => {
    const hunt = findHunt(db, joinCode);
    if (hunt.creatorAddress !== actor.address || hunt.sample) throw new ActionError("forbidden");
    hunt.status = "ended";
    return { joinCode: hunt.joinCode, status: hunt.status };
  });
}

/**
 * b0x credentials minted for this id: a mark per opened step, a prize when claimed.
 * Wallet balances, unrelated tokens, and other NFTs are never read.
 */
export async function collection(address: string) {
  return withStore((db) => {
    const items = db.credentials.flatMap((item) => {
      if (item.holder !== address || !isB0xCredentialKind(item.kind)) return [];
      const hunt = db.hunts.find((candidate) => candidate.id === item.huntId);
      const stage = item.taskId
        ? hunt?.stages.find((candidate) => candidate.tasks.some((task) => task.id === item.taskId))
        : undefined;
      return [
        {
          id: item.id,
          kind: item.kind,
          title: item.title,
          description: item.description,
          huntId: item.huntId,
          huntName: hunt?.name ?? "",
          joinCode: hunt?.joinCode ?? "",
          stageTitle: stage?.title ?? "",
          issuer: hunt?.creatorName ?? "",
          issuedAt: item.issuedAt,
          expiresAt: null,
          revokedAt: null,
          ephemeral: false,
          txHash: item.txHash,
          chainName: ocp.target.name,
          chainId: ocp.target.chainId,
          chainMode: "mock" as const,
        },
      ];
    });
    return { items };
  }, false);
}

export async function mine(address: string, deviceId: string) {
  return withStore((db) => {
    const hunts = db.hunts
      .filter((hunt) => hunt.creatorAddress === address && !hunt.sample)
      .map((hunt) => ({
        joinCode: hunt.joinCode,
        name: hunt.name,
        status: hunt.status,
        structure: hunt.structure,
        playerCount: playerCount(db, hunt.id),
        playerCap: hunt.playerCap,
        stages: hunt.stages.map((stage) => ({
          title: stage.title,
          tasks: stage.tasks.map((task) => ({ title: task.title, code: task.codePlain })),
        })),
      }));
    return {
      hunts,
      review: {
        chain: ocp.target.name,
        chainId: ocp.target.chainId,
        mode: "mock" as const,
        poolEth: microToEth(LIMITS.poolMicroEth),
        spentEth: microToEth(db.relayer.spentMicroEth),
        deviceSpentEth: microToEth(db.relayer.byDevice[deviceId] ?? 0),
        deviceCapEth: microToEth(LIMITS.deviceMicroEth),
        huntCapEth: microToEth(LIMITS.huntMicroEth),
        identityPath: "m/44'/60'/0'/0/0",
      },
    };
  }, false);
}

