import { claimPrize, requireSignature } from "@/lib/server/actions";
import { jsonError } from "@/lib/server/http";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  try {
    const actor = await requireSignature(request, { action: "claim", hunt: code });
    return Response.json(await claimPrize(actor, code));
  } catch (error) {
    return jsonError(error);
  }
}
