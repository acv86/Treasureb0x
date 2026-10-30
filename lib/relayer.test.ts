import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LIMITS } from "./limits";
import { emptyLedger, sponsor } from "./relayer";

describe("sponsored actions", () => {
  it("draws from the pool and both caps", () => {
    const first = sponsor(emptyLedger(), "phone", "hunt");
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.ledger.spentMicroEth, LIMITS.actionMicroEth);
    assert.equal(first.ledger.byDevice.phone, LIMITS.actionMicroEth);
    assert.equal(first.ledger.byHunt.hunt, LIMITS.actionMicroEth);
  });

  it("stops at the device cap", () => {
    let ledger = emptyLedger();
    const room = LIMITS.deviceMicroEth / LIMITS.actionMicroEth;
    for (let i = 0; i < room; i++) {
      const next = sponsor(ledger, "phone", `hunt-${i}`);
      assert.equal(next.ok, true);
      if (next.ok) ledger = next.ledger;
    }
    const blocked = sponsor(ledger, "phone", "extra");
    assert.deepEqual(blocked, { ok: false, reason: "device" });
  });

  it("stops at the hunt cap without blocking another hunt", () => {
    let ledger = emptyLedger();
    const room = LIMITS.huntMicroEth / LIMITS.actionMicroEth;
    for (let i = 0; i < room; i++) {
      const next = sponsor(ledger, `phone-${i}`, "same");
      assert.equal(next.ok, true);
      if (next.ok) ledger = next.ledger;
    }
    assert.deepEqual(sponsor(ledger, "someone", "same"), { ok: false, reason: "hunt" });
    const other = sponsor(ledger, "someone", "other");
    assert.equal(other.ok, true);
  });

  it("stops when the pool is empty", () => {
    const ledger = emptyLedger();
    ledger.spentMicroEth = LIMITS.poolMicroEth;
    assert.deepEqual(sponsor(ledger, "phone", "hunt"), { ok: false, reason: "pool" });
  });
});
