import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  credentialStatus,
  credentialTxHref,
  overviewCredentials,
  type HeldCredential,
} from "./credentials";

const NOW = Date.parse("2026-10-30T12:00:00.000Z");

function cred(partial: Partial<HeldCredential> & Pick<HeldCredential, "id">): HeldCredential {
  return {
    kind: "mark",
    title: "Green lantern",
    description: "A step on the quay",
    huntId: "hunt_lantern",
    huntName: "Harbour lanterns",
    joinCode: "LANTERN",
    stageTitle: "The quay",
    issuer: "Sample hunts",
    issuedAt: "2026-10-29T00:00:00.000Z",
    expiresAt: null,
    revokedAt: null,
    ephemeral: false,
    txHash: null,
    chainName: "Arbitrum Sepolia",
    chainId: 421614,
    chainMode: "mock",
    ...partial,
  };
}

describe("credential status", () => {
  it("treats a normal record as active", () => {
    assert.equal(credentialStatus(cred({ id: "a" }), NOW), "active");
  });

  it("expires a record whose end is in the past", () => {
    assert.equal(
      credentialStatus(cred({ id: "a", expiresAt: "2026-10-30T11:00:00.000Z" }), NOW),
      "expired",
    );
  });

  it("keeps a future expiry active", () => {
    assert.equal(
      credentialStatus(cred({ id: "a", expiresAt: "2026-10-30T13:00:00.000Z" }), NOW),
      "active",
    );
  });

  it("ignores an unreadable expiry", () => {
    assert.equal(credentialStatus(cred({ id: "a", expiresAt: "soon" }), NOW), "active");
  });

  it("marks a short-lived record as ephemeral until it ends", () => {
    assert.equal(
      credentialStatus(cred({ id: "a", ephemeral: true, expiresAt: "2026-10-30T13:00:00.000Z" }), NOW),
      "ephemeral",
    );
    assert.equal(
      credentialStatus(cred({ id: "a", ephemeral: true, expiresAt: "2026-10-30T11:00:00.000Z" }), NOW),
      "expired",
    );
  });

  it("treats revocation as revoked, including when it is also short-lived", () => {
    assert.equal(
      credentialStatus(cred({ id: "a", revokedAt: "2026-10-01T00:00:00.000Z", ephemeral: true }), NOW),
      "revoked",
    );
  });

  it("does not revoke before the revocation time", () => {
    assert.equal(
      credentialStatus(cred({ id: "a", revokedAt: "2026-10-30T13:00:00.000Z" }), NOW),
      "active",
    );
  });
});

describe("overview filtering", () => {
  const items = [
    cred({ id: "mark-lantern", title: "The green lantern", issuedAt: "2026-10-28T00:00:00.000Z" }),
    cred({
      id: "prize-lantern",
      kind: "prize",
      title: "Harbour light",
      description: "You walked the whole quay.",
      stageTitle: "",
      issuedAt: "2026-10-29T08:00:00.000Z",
    }),
    cred({
      id: "mark-market",
      title: "Baker's stamp",
      description: "Crust",
      huntId: "hunt_market",
      huntName: "Saturday market",
      joinCode: "MARKET",
      stageTitle: "The square",
      issuer: "Market desk",
      issuedAt: "2026-10-27T00:00:00.000Z",
    }),
    cred({
      id: "old-pass",
      title: "Yard pass",
      description: "A pass for the yard",
      huntId: "hunt_mill",
      huntName: "Old mill",
      joinCode: "MILL",
      stageTitle: "The yard",
      expiresAt: "2026-10-01T00:00:00.000Z",
      issuedAt: "2026-09-01T00:00:00.000Z",
    }),
    cred({
      id: "day-pass",
      title: "Ferry pass",
      description: "Good until evening",
      huntId: "hunt_ferry",
      huntName: "Ferry day",
      joinCode: "FERRY",
      stageTitle: "The bell",
      ephemeral: true,
      expiresAt: "2026-10-30T18:00:00.000Z",
      issuedAt: "2026-10-30T09:00:00.000Z",
    }),
    cred({
      id: "pulled",
      title: "Revoked mark",
      description: "No longer valid",
      huntId: "hunt_pulled",
      huntName: "Closed hunt",
      joinCode: "CLOSED",
      stageTitle: "Gate",
      revokedAt: "2026-10-15T00:00:00.000Z",
      issuedAt: "2026-10-10T00:00:00.000Z",
    }),
    cred({ id: "foreign-nft", kind: "erc721", title: "Bored something", description: "not b0x" }),
    cred({ id: "balance", kind: "balance", title: "1.2 ETH", huntName: "Wallet" }),
    cred({ id: "token", kind: "erc20", title: "USDC" }),
  ];

  it("drops anything that is not a b0x mark or prize", () => {
    const rows = overviewCredentials(items, { now: NOW });
    assert.deepEqual(
      rows.map((row) => row.id),
      ["day-pass", "prize-lantern", "mark-lantern", "mark-market", "pulled", "old-pass"],
    );
    for (const row of rows) {
      assert.equal(row.kind === "mark" || row.kind === "prize", true);
    }
  });

  it("does not copy unrelated asset fields onto the overview", () => {
    const dirty = cred({ id: "mark-lantern" }) as HeldCredential & { balance: string; token: string };
    dirty.balance = "999";
    dirty.token = "USDC";
    const [row] = overviewCredentials([dirty], { now: NOW });
    assert.equal("balance" in row, false);
    assert.equal("token" in row, false);
  });

  it("filters by type, hunt, and status together", () => {
    assert.deepEqual(
      overviewCredentials(items, { kind: "prize", now: NOW }).map((row) => row.id),
      ["prize-lantern"],
    );
    assert.deepEqual(
      overviewCredentials(items, { huntId: "hunt_market", now: NOW }).map((row) => row.id),
      ["mark-market"],
    );
    assert.deepEqual(
      overviewCredentials(items, { status: "expired", now: NOW }).map((row) => row.id),
      ["old-pass"],
    );
    assert.deepEqual(
      overviewCredentials(items, { status: "ephemeral", now: NOW }).map((row) => row.id),
      ["day-pass"],
    );
    assert.deepEqual(
      overviewCredentials(items, { status: "revoked", now: NOW }).map((row) => row.id),
      ["pulled"],
    );
    assert.deepEqual(
      overviewCredentials(items, { status: "active", kind: "mark", huntId: "hunt_lantern", now: NOW }).map(
        (row) => row.id,
      ),
      ["mark-lantern"],
    );
  });

  it("searches title, description, hunt, stage, issuer, and code", () => {
    const query = { now: NOW };
    assert.deepEqual(overviewCredentials(items, { ...query, search: "  HARBOUR " }).map((row) => row.id), [
      "prize-lantern",
      "mark-lantern",
    ]);
    assert.deepEqual(overviewCredentials(items, { ...query, search: "square" }).map((row) => row.id), [
      "mark-market",
    ]);
    assert.deepEqual(overviewCredentials(items, { ...query, search: "market desk" }).map((row) => row.id), [
      "mark-market",
    ]);
    assert.deepEqual(overviewCredentials(items, { ...query, search: "mill" }).map((row) => row.id), ["old-pass"]);
    assert.deepEqual(overviewCredentials(items, { ...query, search: "quay" }).map((row) => row.id), [
      "prize-lantern",
      "mark-lantern",
    ]);
    assert.deepEqual(overviewCredentials(items, { ...query, search: "usdc" }).map((row) => row.id), []);
  });

  it("sorts newest, oldest, hunt name, and type", () => {
    const subset = items.filter((item) => item.kind === "mark" || item.kind === "prize");
    assert.deepEqual(overviewCredentials(subset, { sort: "newest", now: NOW }).map((row) => row.id), [
      "day-pass",
      "prize-lantern",
      "mark-lantern",
      "mark-market",
      "pulled",
      "old-pass",
    ]);
    assert.deepEqual(overviewCredentials(subset, { sort: "oldest", now: NOW }).map((row) => row.id), [
      "old-pass",
      "pulled",
      "mark-market",
      "mark-lantern",
      "prize-lantern",
      "day-pass",
    ]);
    assert.deepEqual(overviewCredentials(subset, { sort: "hunt", now: NOW }).map((row) => row.id), [
      "pulled",
      "day-pass",
      "prize-lantern",
      "mark-lantern",
      "old-pass",
      "mark-market",
    ]);
    assert.deepEqual(
      overviewCredentials(
        [
          cred({ id: "b", kind: "prize", huntName: "Alpha", issuedAt: "2026-10-02T00:00:00.000Z" }),
          cred({ id: "a", kind: "mark", huntName: "Zulu", issuedAt: "2026-10-03T00:00:00.000Z" }),
          cred({ id: "c", kind: "mark", huntName: "Alpha", issuedAt: "2026-10-01T00:00:00.000Z" }),
        ],
        { sort: "type", now: NOW },
      ).map((row) => row.id),
      ["c", "a", "b"],
    );
  });

  it("breaks ties by id", () => {
    const issuedAt = "2026-10-20T00:00:00.000Z";
    assert.deepEqual(
      overviewCredentials(
        [cred({ id: "b", issuedAt }), cred({ id: "a", issuedAt })],
        { sort: "newest", now: NOW },
      ).map((row) => row.id),
      ["a", "b"],
    );
  });
});

describe("chain links", () => {
  const hash = `0x${"ab".repeat(32)}`;

  it("does not link a mock hash", () => {
    assert.equal(credentialTxHref({ chainMode: "mock", chainId: 421614, txHash: hash }), null);
  });

  it("links a live receipt on the known testnet", () => {
    assert.equal(
      credentialTxHref({ chainMode: "live", chainId: 421614, txHash: hash }),
      `https://sepolia.arbiscan.io/tx/${hash}`,
    );
  });

  it("does not invent a link for an unknown chain or a short hash", () => {
    assert.equal(credentialTxHref({ chainMode: "live", chainId: 1, txHash: hash }), null);
    assert.equal(credentialTxHref({ chainMode: "live", chainId: 421614, txHash: "0xsample" }), null);
    assert.equal(credentialTxHref({ chainMode: "live", chainId: 421614, txHash: null }), null);
  });
});
