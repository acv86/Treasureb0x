/**
 * Boundary for Project OCP, the credential core drafted in another repo.
 * Treasureb0x talks only to this interface. The draft uses a mock.
 */

import type { CHAIN } from "../limits";
import type { Structure } from "../domain";

export type ChainTarget = {
  chainId: typeof CHAIN.id;
  name: typeof CHAIN.name;
  rpcUrl: string;
};

export type OcpCredential = {
  id: string;
  holder: string;
  huntId: string;
  kind: "mark" | "prize";
  title: string;
  description: string;
  txHash: string;
  issuedAt: string;
  /** JSON data URI for a prize NFT. Its `image` is the prize picture. */
  tokenURI?: string;
};

export type PublishHuntInput = {
  huntId: string;
  creator: string;
  structure: Structure;
  taskCount: number;
};

export type MintMarkInput = {
  holder: string;
  huntId: string;
  taskId: string;
  title: string;
  description: string;
};

export type MintPrizeInput = {
  holder: string;
  huntId: string;
  title: string;
  description: string;
  /** Hunt title, watermarked on the default prize picture. */
  huntTitle: string;
  /** When set, replaces the generated picture in token metadata. */
  customImage?: string | null;
};

export interface OcpClient {
  readonly target: ChainTarget;
  publishHunt(input: PublishHuntInput): Promise<{ txHash: string }>;
  mintMark(input: MintMarkInput): Promise<OcpCredential>;
  mintPrize(input: MintPrizeInput): Promise<OcpCredential>;
}
