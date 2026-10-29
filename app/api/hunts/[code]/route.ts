import { getHunt, readAddress } from "@/lib/server/actions";
import { jsonError } from "@/lib/server/http";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const address = readAddress(new URL(request.url).searchParams.get("address"));
  try {
    return Response.json(await getHunt(code, address));
  } catch (error) {
    return jsonError(error);
  }
}
