import { mine, readAddress } from "@/lib/server/actions";
import { jsonError } from "@/lib/server/http";

export async function GET(request: Request) {
  const address = readAddress(new URL(request.url).searchParams.get("address"));
  if (!address) return Response.json({ error: "unauthorized" }, { status: 401 });
  const deviceId = request.headers.get("x-device-id") ?? "";
  try {
    return Response.json(await mine(address, deviceId));
  } catch (error) {
    return jsonError(error);
  }
}
