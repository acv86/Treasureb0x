"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp, useT } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ClientError, getJson, signedPost, type HomePayload, type HuntCard, type SampleCard } from "@/lib/client-api";
import { errorText } from "@/lib/i18n";
import type { Structure } from "@/lib/domain";
import type { CopyKey } from "@/lib/i18n";
import { localizeSample } from "@/lib/sample-text";

const structureKey: Record<Structure, CopyKey> = {
  serial: "serialName",
  parallel: "parallelName",
  hybrid: "hybridName",
};

function statusKey(card: HuntCard): CopyKey {
  if (card.prizeClaimed) return "completed";
  if (card.prizeReady) return "ready";
  if (card.phase === "upcoming") return "upcoming";
  if (card.phase === "ended") return "ended";
  return "inProgress";
}

export function HuntList() {
  const { session, prefs } = useApp();
  const tr = useT();
  const router = useRouter();
  const [data, setData] = useState<HomePayload | null>(null);
  const [error, setError] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    if (!session) return;
    const address = session.address;
    void getJson<HomePayload>(`/api/hunts?address=${address}`).then(
      (payload) => {
        setData(payload);
        setError(false);
      },
      () => setError(true),
    );
  }

  useEffect(() => {
    if (!session) return;
    let live = true;
    void getJson<HomePayload>(`/api/hunts?address=${session.address}`).then(
      (payload) => {
        if (!live) return;
        setData(payload);
        setError(false);
      },
      () => {
        if (live) setError(true);
      },
    );
    return () => {
      live = false;
    };
  }, [session]);

  async function join(joinCode: string) {
    if (!session) return;
    setBusy(true);
    try {
      await signedPost(`/api/hunts/${encodeURIComponent(joinCode)}/join`, { displayName: session.displayName }, {
        action: "join",
        hunt: joinCode,
      });
      router.push(`/hunts/${encodeURIComponent(joinCode)}`);
    } catch (cause) {
      const message = cause instanceof ClientError ? errorText(prefs.lang, cause.code) : tr("couldNotSave");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{tr("hello", { name: session?.displayName ?? "" })}</p>
        <h1 className="font-heading text-4xl">{tr("hunts")}</h1>
      </header>

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim()) void join(code);
        }}
      >
        <label className="text-sm text-muted-foreground" htmlFor="join-code">
          {tr("gotACode")}
        </label>
        <div className="flex gap-2">
          <Input
            id="join-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder={tr("huntCode")}
            autoCapitalize="characters"
            className="h-12 rounded-2xl px-3 text-base tracking-wider"
          />
          <Button type="submit" className="h-12 rounded-full px-5" disabled={busy || code.trim().length < 4}>
            {tr("join")}
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="font-heading text-xl">{tr("active")}</h2>
        {error && (
          <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <p>{tr("loadError")}</p>
            <Button variant="outline" className="mt-3 rounded-full" onClick={() => void load()}>
              {tr("retry")}
            </Button>
          </div>
        )}
        {!error && !data && <p className="text-muted-foreground">{tr("loading")}</p>}
        {data && data.hunts.length === 0 && <p className="text-muted-foreground">{tr("emptyHunts")}</p>}
        <div className="hunt-cards space-y-3">
          {data?.hunts.map((card) => {
            const shown = localizeSample(prefs.lang, card);
            return (
              <Link key={card.joinCode} href={`/hunts/${card.joinCode}`} className="tint-card block rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-xl">{shown.name}</h3>
                    <p className="text-sm text-muted-foreground">{tr(structureKey[card.structure])}</p>
                  </div>
                  <Badge variant="secondary">{tr(statusKey(card))}</Badge>
                </div>
                <p className="mt-3 text-sm">{tr("ofSteps", { done: card.completedCount, total: card.totalCount })}</p>
                <Progress value={card.completedCount} max={Math.max(card.totalCount, 1)} className="mt-2" />
              </Link>
            );
          })}
        </div>
      </section>

      {data && data.samples.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-xl">{tr("trySample")}</h2>
          <div className="hunt-cards space-y-3">
            {data.samples.map((sample) => (
              <SampleRow key={sample.joinCode} sample={sample} busy={busy} onJoin={() => void join(sample.joinCode)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SampleRow({ sample, onJoin, busy }: { sample: SampleCard; onJoin: () => void; busy: boolean }) {
  const tr = useT();
  const { prefs } = useApp();
  const shown = localizeSample(prefs.lang, sample);
  return (
    <button
      type="button"
      onClick={onJoin}
      disabled={busy}
      className="tint-card block w-full rounded-3xl bg-accent/60 p-4 text-start ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-lg">{shown.name}</h3>
        <Badge>{tr("sample")}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{shown.description}</p>
      <p className="mt-2 text-sm">{tr(structureKey[sample.structure])}</p>
    </button>
  );
}
