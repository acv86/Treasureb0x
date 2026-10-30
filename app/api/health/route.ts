import { CHAIN } from "@/lib/limits";

export function GET() {
  return Response.json({ ok: true, chain: CHAIN.name, chainId: CHAIN.id, mode: "mock" });
}
