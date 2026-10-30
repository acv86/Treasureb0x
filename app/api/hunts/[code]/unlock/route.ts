import { requireSignature, unlockStep } from "@/lib/server/actions";
import { jsonError, readJson } from "@/lib/server/http";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  try {
    const body = await readJson<{ taskId?: string; code?: string }>(request);
    const actor = await requireSignature(request, {
      action: "unlock",
      hunt: code,
      task: body.taskId ?? "",
      code: body.code ?? "",
    });
    return Response.json(await unlockStep(actor, code, body.taskId ?? "", body.code ?? ""));
  } catch (error) {
    return jsonError(error);
  }
}
