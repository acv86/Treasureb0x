import "server-only";

import { ActionError } from "./store";

export function jsonError(error: unknown): Response {
  if (error instanceof ActionError) {
    const status =
      error.code === "unauthorized"
        ? 401
        : error.code === "not_found"
          ? 404
          : error.code === "forbidden"
            ? 403
            : error.code.startsWith("relayer_")
              ? 409
              : 400;
    return Response.json({ error: error.code }, { status });
  }
  console.error(error);
  return Response.json({ error: "invalid" }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ActionError("invalid");
  }
}
