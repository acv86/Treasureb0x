/** Canonical text the device signs. The product backend rebuilds the same string. */

export function canonicalMessage(input: {
  action: string;
  hunt: string;
  task: string;
  codeHash: string;
  at: string;
}): string {
  return [
    "Treasureb0x",
    `action:${input.action}`,
    `hunt:${input.hunt}`,
    `task:${input.task}`,
    `code:${input.codeHash}`,
    `at:${input.at}`,
  ].join("\n");
}
