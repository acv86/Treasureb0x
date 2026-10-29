import "server-only";

import { hashCode } from "../codes";
import type { StoredHunt } from "./types";

const SAMPLE_CREATOR = "0x000000000000000000000000000000000000b0c0";

function hint(code: string): string {
  return `Sample hunt: the code you would find here is ${code}.`;
}

async function step(id: string, title: string, instruction: string, code: string) {
  return {
    id,
    title,
    instruction,
    hint: hint(code),
    codePlain: code,
    codeHash: await hashCode(code),
  };
}

export async function sampleHunts(): Promise<StoredHunt[]> {
  const createdAt = "2026-10-29T00:00:00.000Z";
  return [
    {
      id: "hunt_lantern",
      joinCode: "LANTERN",
      name: "Harbour lanterns",
      description: "A dusk walk along the quay. Three codes, one after another.",
      structure: "serial",
      creatorAddress: SAMPLE_CREATOR,
      creatorName: "Sample hunts",
      createdAt,
      startsAt: null,
      endsAt: null,
      status: "live",
      playerCap: 40,
      sample: true,
      publishTx: "0xsamplelantern",
      prize: {
        title: "Harbour light",
        description: "You walked the whole quay.",
      },
      stages: [
        {
          id: "lantern_stage",
          title: "The quay",
          rule: { kind: "all" },
          tasks: [
            await step(
              "lantern_green",
              "The green lantern",
              "Walk the quay until you find the lantern with green glass, by the fish stall.",
              "GREENGLASS",
            ),
            await step(
              "lantern_bench",
              "The third bench",
              "Count the benches that face the water. Read the plaque on the third.",
              "THIRD",
            ),
            await step(
              "lantern_bell",
              "The ferry bell",
              "Look under the rim of the bell by the ferry steps.",
              "FERRY",
            ),
          ],
        },
      ],
    },
    {
      id: "hunt_market",
      joinCode: "MARKET",
      name: "Saturday market",
      description: "Three stalls, in any order. Finish all three.",
      structure: "parallel",
      creatorAddress: SAMPLE_CREATOR,
      creatorName: "Sample hunts",
      createdAt,
      startsAt: null,
      endsAt: null,
      status: "live",
      playerCap: 40,
      sample: true,
      publishTx: "0xsamplemarket",
      prize: {
        title: "Market morning",
        description: "You made the whole round of the square.",
      },
      stages: [
        {
          id: "market_stage",
          title: "The square",
          rule: { kind: "all" },
          tasks: [
            await step(
              "market_baker",
              "Baker's stamp",
              "The round loaf is wrapped in paper with a stamp.",
              "CRUST",
            ),
            await step(
              "market_flower",
              "White flowers",
              "The bucket of white flowers has a tag tied to the handle.",
              "STEM",
            ),
            await step(
              "market_clock",
              "The stopped clock",
              "The clock over the square has stopped. Read the card beneath it.",
              "NOON",
            ),
          ],
        },
      ],
    },
    {
      id: "hunt_mill",
      joinCode: "MILL",
      name: "Old mill",
      description: "The yard first. Then one room inside.",
      structure: "hybrid",
      creatorAddress: SAMPLE_CREATOR,
      creatorName: "Sample hunts",
      createdAt,
      startsAt: null,
      endsAt: null,
      status: "live",
      playerCap: 40,
      sample: true,
      publishTx: "0xsamplemill",
      prize: {
        title: "Miller's key",
        description: "The mill let you through.",
      },
      stages: [
        {
          id: "mill_yard",
          title: "The yard",
          rule: { kind: "all" },
          tasks: [
            await step(
              "mill_wheel",
              "The wheel",
              "The wheel's hub has a word cut into the wood.",
              "WHEEL",
            ),
            await step(
              "mill_board",
              "The notice",
              "A notice is pinned where the path meets the creek.",
              "CREEK",
            ),
          ],
        },
        {
          id: "mill_inside",
          title: "Inside",
          rule: { kind: "atLeast", n: 1 },
          tasks: [
            await step("mill_loft", "The loft", "Dust on the loft stair hides a word.", "DUST"),
            await step(
              "mill_cellar",
              "The cellar",
              "A sack in the cellar still has its label.",
              "BARLEY",
            ),
          ],
        },
      ],
    },
  ];
}

export { SAMPLE_CREATOR };
