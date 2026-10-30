import { createHunt, listHome, readAddress, requireSignature, type CreateBody } from "@/lib/server/actions";
import { jsonError, readJson } from "@/lib/server/http";

export async function GET(request: Request) {
  const address = readAddress(new URL(request.url).searchParams.get("address"));
  try {
    return Response.json(await listHome(address));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateBody>(request);
    const actor = await requireSignature(request, { action: "create", hunt: body.joinCode ?? "" });
    return Response.json(await createHunt(actor, body), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
