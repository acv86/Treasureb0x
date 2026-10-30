import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyLedger } from "../relayer";
import { sampleHunts } from "./seed";
import type { Db } from "./types";

const file = path.join(process.cwd(), "data", "store.json");

let chain: Promise<void> = Promise.resolve();

async function load(): Promise<Db> {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Db;
    if (!parsed?.hunts || !parsed.progresses || !parsed.credentials || !parsed.relayer) {
      throw new Error("bad store");
    }
    return parsed;
  } catch (error) {
    const code =
      error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
    const reseed =
      code === "ENOENT" ||
      error instanceof SyntaxError ||
      (error instanceof Error && error.message === "bad store");
    if (!reseed) throw error;
    const db: Db = {
      hunts: await sampleHunts(),
      progresses: [],
      credentials: [],
      relayer: emptyLedger(),
    };
    await save(db);
    return db;
  }
}

async function save(db: Db): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(db, null, 2));
}

export class ActionError extends Error {
  constructor(
    public code: string,
    public persist = false,
  ) {
    super(code);
  }
}

export function withStore<T>(fn: (db: Db) => Promise<T> | T, write = true): Promise<T> {
  const run = chain.then(async () => {
    const db = await load();
    try {
      const result = await fn(db);
      if (write) await save(db);
      return result;
    } catch (error) {
      if (error instanceof ActionError && error.persist) await save(db);
      throw error;
    }
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
