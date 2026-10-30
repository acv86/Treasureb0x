/**
 * Proposed limits for this draft. Not a committee decision.
 * See docs/DESIGN-DECISIONS.md.
 *
 * Micro-ETH is 1e-6 ETH. Integers avoid floating-point drift.
 * 40 micro-ETH = 0.00004 ETH, about one sponsored action.
 */

export const CHAIN = {
  id: 421614,
  name: "Arbitrum Sepolia",
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
} as const;

/** One address for every b0x app. Standard Ethereum account path. */
export const IDENTITY_PATH = "m/44'/60'/0'/0/0";

export const LIMITS = {
  /** Live private hunts a creator may have at once. */
  privateLiveHunts: 3,
  /** Players who may join one hunt. */
  playersPerHunt: 40,
  /** House pool Mr. A would fund. 0.05 ETH. */
  poolMicroEth: 50_000,
  /** Per device. 0.002 ETH. */
  deviceMicroEth: 2_000,
  /** Per hunt. 0.01 ETH. */
  huntMicroEth: 10_000,
  /** One sponsored action. 0.00004 ETH. */
  actionMicroEth: 40,
  maxCodeAttempts: 8,
  lockoutMs: 10 * 60 * 1000,
  signatureWindowMs: 5 * 60 * 1000,
} as const;

export function microToEth(micro: number): string {
  const fixed = (micro / 1_000_000).toFixed(5);
  return fixed.replace(/0+$/, "").replace(/\.$/, "") || "0";
}
