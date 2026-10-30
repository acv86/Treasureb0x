"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useApp, useT } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ClientError, getJson, signedPost, type HuntDetail as HuntDetailData } from "@/lib/client-api";
import type { Structure } from "@/lib/domain";
import { errorText, type CopyKey } from "@/lib/i18n";

const structureKey: Record<Structure, CopyKey> = {
  serial: "serialName",
  parallel: "parallelName",
  hybrid: "hybridName",
};

export function HuntDetail({ code }: { code: string }) {
  const { session, prefs } = useApp();
  const tr = useT();
  const [hunt, setHunt] = useState<HuntDetailData | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);

  function load() {
    if (!session) return;
    void getJson<HuntDetailData>(`/api/hunts/${encodeURIComponent(code)}?address=${session.address}`).then(
      (payload) => {
        setHunt(payload);
        setError(false);
        setMissing(false);
      },
      (cause: unknown) => {
        if (cause instanceof ClientError && cause.code === "not_found") setMissing(true);
        else setError(true);
      },
    );
  }

  useEffect(() => {
    if (!session) return;
    let live = true;
    void getJson<HuntDetailData>(`/api/hunts/${encodeURIComponent(code)}?address=${session.address}`).then(
      (payload) => {
        if (!live) return;
        setHunt(payload);
        setError(false);
        setMissing(false);
      },
      (cause: unknown) => {
        if (!live) return;
        if (cause instanceof ClientError && cause.code === "not_found") setMissing(true);
        else setError(true);
      },
    );
    return () => {
      live = false;
    };
  }, [session, code]);

  async function act(path: string, body: unknown, sign: { action: string; task?: string; stepCode?: string }) {
    if (!session || !hunt) return;
    setBusy(true);
    try {
      const next = await signedPost<HuntDetailData>(path, body, {
        action: sign.action,
        hunt: hunt.joinCode,
        task: sign.task,
        code: sign.stepCode,
      });
      setHunt(next);
      if (sign.action === "unlock") toast.success(tr("stepOpen"));
      if (sign.action === "claim") toast.success(tr("prizeYours"));
    } catch (cause) {
      const message = cause instanceof ClientError ? errorText(prefs.lang, cause.code) : tr("couldNotSave");
      toast.error(message);
      if (cause instanceof ClientError && cause.code === "bad_code") setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <div className="space-y-4">
        <Link href="/hunts" className="text-sm text-primary">{tr("allHunts")}</Link>
        <h1 className="font-heading text-3xl">{tr("notFound")}</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p>{tr("loadError")}</p>
        <Button variant="outline" className="rounded-full" onClick={() => void load()}>{tr("retry")}</Button>
      </div>
    );
  }

  if (!hunt) return <p className="text-muted-foreground">{tr("loading")}</p>;

  return (
    <div className="space-y-5 pb-4">
      <Link href="/hunts" className="text-sm text-primary">{tr("allHunts")}</Link>
      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{tr(structureKey[hunt.structure])}</Badge>
          {hunt.sample && <Badge>{tr("sample")}</Badge>}
        </div>
        <h1 className="font-heading text-4xl text-balance">{hunt.name}</h1>
        <p className="text-sm text-muted-foreground">{tr("byName", { name: hunt.creatorName })}</p>
        <p>{hunt.description}</p>
      </header>

      {hunt.joined && (
        <div>
          <p className="text-sm">{tr("ofSteps", { done: hunt.completedCount, total: hunt.totalCount })}</p>
          <Progress value={hunt.completedCount} max={Math.max(hunt.totalCount, 1)} className="mt-2" />
        </div>
      )}

      {!hunt.joined && (
        <Button
          className="h-12 w-full rounded-full text-base"
          disabled={busy || hunt.phase === "ended"}
          onClick={() =>
            void act(`/api/hunts/${hunt.joinCode}/join`, { displayName: session?.displayName }, { action: "join" })
          }
        >
          {tr("joinThis")}
        </Button>
      )}

      {hunt.phase === "upcoming" && <p>{tr("notOpenYet")}</p>}
      {hunt.phase === "ended" && !hunt.prizeReady && <p>{tr("huntEnded")}</p>}

      {hunt.joined &&
        hunt.stages.map((stage, index) => (
          <section key={stage.id} className="space-y-3">
            {hunt.structure === "hybrid" && (
              <h2 className="font-heading text-xl">
                {stage.state === "locked"
                  ? tr("stageHidden", { n: index + 1 })
                  : stage.title || tr("stageLabel", { n: index + 1 })}
              </h2>
            )}
            {stage.tasks.map((task) => (
              <article key={task.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-lg">{task.title}</h3>
                  <Badge variant={task.state === "done" ? "default" : "outline"}>
                    {task.state === "done" ? tr("done") : task.state === "skipped" ? tr("skipped") : tr("open")}
                  </Badge>
                </div>
                {task.instruction && <p className="mt-2">{task.instruction}</p>}
                {task.hint && <p className="mt-2 text-sm text-muted-foreground">{task.hint}</p>}
                {task.state === "open" && hunt.phase === "open" && (
                  <form
                    className={`mt-3 flex gap-2 ${shake ? "shake" : ""}`}
                    key={`${task.id}-${shake}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const stepCode = drafts[task.id] ?? "";
                      void act(
                        `/api/hunts/${hunt.joinCode}/unlock`,
                        { taskId: task.id, code: stepCode },
                        { action: "unlock", task: task.id, stepCode },
                      );
                    }}
                  >
                    <Input
                      aria-label={tr("enterFound")}
                      value={drafts[task.id] ?? ""}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [task.id]: event.target.value.toUpperCase() }))}
                      placeholder={tr("enterFound")}
                      className="h-12 rounded-2xl px-3 text-base tracking-wider"
                      autoCapitalize="characters"
                    />
                    <Button type="submit" className="h-12 rounded-full px-4" disabled={busy}>
                      {tr("unlock")}
                    </Button>
                  </form>
                )}
              </article>
            ))}
          </section>
        ))}

      {hunt.joined && hunt.hiddenStepCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {hunt.hiddenStepCount === 1 ? tr("hiddenOne") : tr("hiddenSteps", { n: hunt.hiddenStepCount })}
        </p>
      )}

      <section className="rounded-3xl bg-accent/70 p-4">
        <p className="text-sm text-muted-foreground">{tr("stepPrize")}</p>
        <h2 className="font-heading text-2xl">{hunt.prize.title}</h2>
        <p className="mt-1">{hunt.prize.description}</p>
        {hunt.prizeClaimed && <p className="mt-3 text-sm">{tr("kept")}</p>}
        {hunt.joined && hunt.prizeReady && !hunt.prizeClaimed && (
          <Button
            className="mt-4 h-12 w-full rounded-full text-base"
            disabled={busy}
            onClick={() => void act(`/api/hunts/${hunt.joinCode}/claim`, {}, { action: "claim" })}
          >
            {tr("claim")}
          </Button>
        )}
        {hunt.prizeClaimed && (
          <Link href="/prizes" className="mt-4 flex h-12 items-center justify-center rounded-full border border-border bg-background">
            {tr("seePrizes")}
          </Link>
        )}
      </section>
    </div>
  );
}
