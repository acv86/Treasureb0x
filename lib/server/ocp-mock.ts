import "server-only";

import { createHash } from "node:crypto";
import { CHAIN } from "../limits";
import { prizeTokenUri } from "../prize-image";
import type {
  MintMarkInput,
  MintPrizeInput,
  OcpClient,
  OcpCredential,
  PublishHuntInput,
} from "../ocp/types";

/**
 * Stand-in for Project OCP. It does not connect to a node.
 * It returns the same kind of records a later client would persist.
 */

function txHash(seed: string): string {
  return `0x${createHash("sha256").update(seed).digest("hex")}`;
}

function credential(
  input: { holder: string; huntId: string; kind: "mark" | "prize"; title: string; description: string },
  seed: string,
): OcpCredential {
  const issuedAt = new Date().toISOString();
  return {
    id: `cred_${createHash("sha256").update(seed).digest("hex").slice(0, 16)}`,
    holder: input.holder.toLowerCase(),
    huntId: input.huntId,
    kind: input.kind,
    title: input.title,
    description: input.description,
    txHash: txHash(seed),
    issuedAt,
  };
}

export function createMockOcp(): OcpClient {
  return {
    target: { chainId: CHAIN.id, name: CHAIN.name, rpcUrl: CHAIN.rpcUrl },
    async publishHunt(input: PublishHuntInput) {
      return { txHash: txHash(`publish:${input.huntId}:${input.creator}:${input.taskCount}`) };
    },
    async mintMark(input: MintMarkInput) {
      return credential(
        { ...input, kind: "mark" },
        `mark:${input.huntId}:${input.taskId}:${input.holder}`,
      );
    },
    async mintPrize(input: MintPrizeInput) {
      return {
        ...credential(
          { holder: input.holder, huntId: input.huntId, kind: "prize", title: input.title, description: input.description },
          `prize:${input.huntId}:${input.holder}:${input.title}`,
        ),
        tokenURI: prizeTokenUri({
          name: input.title,
          description: input.description,
          huntTitle: input.huntTitle,
          customImage: input.customImage,
        }),
      };
    },
  };
}
