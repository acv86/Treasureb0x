/**
 * Proposed sponsored-action ledger. A later paymaster would replace this.
 * See docs/DESIGN-DECISIONS.md.
 */

import { LIMITS } from "./limits";

export type Ledger = {
  spentMicroEth: number;
  byDevice: Record<string, number>;
  byHunt: Record<string, number>;
};

export type SponsorResult =
  | { ok: true; ledger: Ledger }
  | { ok: false; reason: "pool" | "device" | "hunt" };

export function emptyLedger(): Ledger {
  return { spentMicroEth: 0, byDevice: {}, byHunt: {} };
}

export function sponsor(ledger: Ledger, deviceId: string, huntId: string): SponsorResult {
  const cost = LIMITS.actionMicroEth;
  const deviceSpent = ledger.byDevice[deviceId] ?? 0;
  const huntSpent = ledger.byHunt[huntId] ?? 0;
  if (ledger.spentMicroEth + cost > LIMITS.poolMicroEth) return { ok: false, reason: "pool" };
  if (deviceSpent + cost > LIMITS.deviceMicroEth) return { ok: false, reason: "device" };
  if (huntSpent + cost > LIMITS.huntMicroEth) return { ok: false, reason: "hunt" };
  return {
    ok: true,
    ledger: {
      spentMicroEth: ledger.spentMicroEth + cost,
      byDevice: { ...ledger.byDevice, [deviceId]: deviceSpent + cost },
      byHunt: { ...ledger.byHunt, [huntId]: huntSpent + cost },
    },
  };
}
