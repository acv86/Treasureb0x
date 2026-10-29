import { joinHunt, requireSignature } from "@/lib/server/actions";
import { jsonError, readJson } from "@/lib/server/http";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  try {
    const body = await readJson<{ displayName?: string }>(request);
    const actor = await requireSignature(request, { action: "join", hunt: code });
    return Response.json(await joinHunt(actor, code, body.displayName ?? ""));
  } catch (error) {
    return jsonError(error);
  }
}
