import { collection, readAddress } from "@/lib/server/actions";
import { jsonError } from "@/lib/server/http";

export async function GET(request: Request) {
  const address = readAddress(new URL(request.url).searchParams.get("address"));
  if (!address) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    return Response.json(await collection(address));
  } catch (error) {
    return jsonError(error);
  }
}
