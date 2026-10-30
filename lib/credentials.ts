/**
 * Account overview for credentials this product issues.
 * Only b0x kinds are kept. Balances, unrelated tokens, and other NFTs are dropped
 * even if a caller hands them in beside real records.
 */

export const B0X_CREDENTIAL_KINDS = ["mark", "prize"] as const;
export type B0xCredentialKind = (typeof B0X_CREDENTIAL_KINDS)[number];

export const CREDENTIAL_STATUSES = ["active", "expired", "ephemeral", "revoked"] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export const CREDENTIAL_SORTS = ["newest", "oldest", "hunt", "type"] as const;
export type CredentialSort = (typeof CREDENTIAL_SORTS)[number];

export type CredentialChainMode = "mock" | "live";

/** A record the product may already hold. `kind` is untrusted. */
export type HeldCredential = {
  id: string;
  kind: string;
  title: string;
  description: string;
  huntId: string;
  huntName: string;
  joinCode: string;
  stageTitle: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  ephemeral?: boolean;
  txHash?: string | null;
  chainName?: string | null;
  chainId?: number | null;
  chainMode?: CredentialChainMode;
};

export type CredentialOverview = {
  id: string;
  kind: B0xCredentialKind;
  title: string;
  description: string;
  huntId: string;
  huntName: string;
  joinCode: string;
  stageTitle: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  ephemeral: boolean;
  txHash: string | null;
  chainName: string | null;
  chainId: number | null;
  chainMode: CredentialChainMode;
  status: CredentialStatus;
};

export type CredentialQuery = {
  kind?: B0xCredentialKind | "all";
  huntId?: string | "all";
  status?: CredentialStatus | "all";
  search?: string;
  sort?: CredentialSort;
  /** Milliseconds since epoch. Defaults to Date.now(). */
  now?: number;
};

const EXPLORERS: Record<number, string> = {
  421614: "https://sepolia.arbiscan.io/tx/",
};

const KIND_ORDER: Record<B0xCredentialKind, number> = { mark: 0, prize: 1 };

export function isB0xCredentialKind(kind: string): kind is B0xCredentialKind {
  return (B0X_CREDENTIAL_KINDS as readonly string[]).includes(kind);
}

function parsedTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function credentialStatus(
  item: Pick<HeldCredential, "expiresAt" | "revokedAt" | "ephemeral">,
  now = Date.now(),
): CredentialStatus {
  const revokedAt = parsedTime(item.revokedAt);
  if (item.revokedAt && (revokedAt === null || revokedAt <= now)) return "revoked";
  const expiresAt = parsedTime(item.expiresAt);
  const expired = expiresAt !== null && expiresAt <= now;
  if (item.ephemeral) return expired ? "expired" : "ephemeral";
  if (expired) return "expired";
  return "active";
}

function issuedMillis(item: CredentialOverview): number {
  return parsedTime(item.issuedAt) ?? 0;
}

function compareIssued(a: CredentialOverview, b: CredentialOverview, direction: 1 | -1): number {
  const delta = (issuedMillis(a) - issuedMillis(b)) * direction;
  return delta || a.id.localeCompare(b.id);
}

function compareOverview(sort: CredentialSort, a: CredentialOverview, b: CredentialOverview): number {
  if (sort === "oldest") return compareIssued(a, b, 1);
  if (sort === "hunt") {
    return (
      a.huntName.localeCompare(b.huntName) ||
      a.joinCode.localeCompare(b.joinCode) ||
      compareIssued(a, b, -1)
    );
  }
  if (sort === "type") {
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.huntName.localeCompare(b.huntName) || compareIssued(a, b, -1);
  }
  return compareIssued(a, b, -1);
}

function project(item: HeldCredential, now: number): CredentialOverview {
  return {
    id: item.id,
    kind: item.kind as B0xCredentialKind,
    title: item.title,
    description: item.description,
    huntId: item.huntId,
    huntName: item.huntName,
    joinCode: item.joinCode,
    stageTitle: item.stageTitle,
    issuer: item.issuer,
    issuedAt: item.issuedAt,
    expiresAt: item.expiresAt ?? null,
    revokedAt: item.revokedAt ?? null,
    ephemeral: Boolean(item.ephemeral),
    txHash: item.txHash ?? null,
    chainName: item.chainName ?? null,
    chainId: item.chainId ?? null,
    chainMode: item.chainMode === "live" ? "live" : "mock",
    status: credentialStatus(item, now),
  };
}

export function overviewCredentials(items: readonly HeldCredential[], query: CredentialQuery = {}): CredentialOverview[] {
  const kind = query.kind ?? "all";
  const huntId = query.huntId ?? "all";
  const status = query.status ?? "all";
  const sort = query.sort ?? "newest";
  const now = query.now ?? Date.now();
  const search = (query.search ?? "").trim().toLowerCase();

  const rows: CredentialOverview[] = [];
  for (const item of items) {
    if (!isB0xCredentialKind(item.kind)) continue;
    const view = project(item, now);
    if (kind !== "all" && view.kind !== kind) continue;
    if (huntId !== "all" && view.huntId !== huntId) continue;
    if (status !== "all" && view.status !== status) continue;
    if (search) {
      const haystack = [view.title, view.description, view.huntName, view.joinCode, view.stageTitle, view.issuer]
        .join("\n")
        .toLowerCase();
      if (!haystack.includes(search)) continue;
    }
    rows.push(view);
  }

  rows.sort((a, b) => compareOverview(sort, a, b));
  return rows;
}

/** A real explorer link only. Mock hashes are not receipts and are not linked. */
export function credentialTxHref(item: Pick<CredentialOverview, "chainMode" | "chainId" | "txHash">): string | null {
  if (item.chainMode !== "live" || item.chainId == null || !item.txHash) return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(item.txHash)) return null;
  const base = EXPLORERS[item.chainId];
  if (!base) return null;
  return `${base}${item.txHash}`;
}
