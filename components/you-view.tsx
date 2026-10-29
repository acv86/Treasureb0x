"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Appearance } from "@/components/appearance";
import { useApp, useT } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientError, getJson, signedPost, type MineHunt, type ReviewNotes } from "@/lib/client-api";
import { clearSession, loadVault, unseal } from "@/lib/identity";
import { errorText } from "@/lib/i18n";

export function YouView() {
  const { session, setSession, prefs } = useApp();
  const tr = useT();
  const router = useRouter();
  const [hunts, setHunts] = useState<MineHunt[] | null>(null);
  const [review, setReview] = useState<ReviewNotes | null>(null);
  const [error, setError] = useState(false);
  const [words, setWords] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [wordError, setWordError] = useState("");
  const [ending, setEnding] = useState<string | null>(null);

  function load() {
    if (!session) return Promise.resolve();
    return getJson<{ hunts: MineHunt[]; review: ReviewNotes }>(`/api/mine?address=${session.address}`).then(
      (payload) => {
        setHunts(payload.hunts);
        setReview(payload.review);
        setError(false);
      },
      () => setError(true),
    );
  }

  useEffect(() => {
    if (!session) return;
    let live = true;
    void getJson<{ hunts: MineHunt[]; review: ReviewNotes }>(`/api/mine?address=${session.address}`).then(
      (payload) => {
        if (!live) return;
        setHunts(payload.hunts);
        setReview(payload.review);
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

  const shortId = session ? `${session.address.slice(0, 6)}…${session.address.slice(-4)}` : "";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">{tr("you")}</p>
        <h1 className="font-heading text-4xl">{session?.displayName}</h1>
      </header>

      <section className="space-y-2 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-xl">{tr("yourId")}</h2>
        <p className="text-sm text-muted-foreground">{tr("yourIdHelp")}</p>
        <p className="font-mono text-sm break-all">{shortId}</p>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={async () => {
            if (!session) return;
            try {
              await navigator.clipboard.writeText(session.address);
              toast.success(tr("copied"));
            } catch {
              toast.error(tr("couldNotSave"));
            }
          }}
        >
          {tr("copy")}
        </Button>
        <p className="text-sm">{tr("lostWords")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl">{tr("backup")}</h2>
        {words ? (
          <>
            <ol className="grid grid-cols-2 gap-2">
              {words.split(" ").map((word, index) => (
                <li key={`${word}-${index}`} className="rounded-2xl bg-card px-3 py-2 ring-1 ring-foreground/10">
                  <span className="me-2 text-xs text-muted-foreground">{index + 1}</span>
                  {word}
                </li>
              ))}
            </ol>
            <Button variant="outline" className="rounded-full" onClick={() => setWords(null)}>{tr("hideBackup")}</Button>
          </>
        ) : (
          <form
            className="space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const vault = loadVault();
              if (!vault) return;
              try {
                setWords(await unseal(vault, code));
                setWordError("");
                setCode("");
              } catch {
                setWordError(tr("wrongDeviceCode"));
              }
            }}
          >
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder={tr("deviceCode")}
              className="h-12 rounded-2xl px-3 tracking-[0.3em]"
              aria-label={tr("deviceCode")}
            />
            {wordError && <p className="text-sm text-destructive">{wordError}</p>}
            <Button type="submit" variant="outline" className="rounded-full">{tr("showBackup")}</Button>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl">{tr("yourHunts")}</h2>
        {error && <Button variant="outline" className="rounded-full" onClick={() => void load()}>{tr("retry")}</Button>}
        {!error && !hunts && <p className="text-muted-foreground">{tr("loading")}</p>}
        {hunts && hunts.length === 0 && <p className="text-muted-foreground">{tr("noCreated")}</p>}
        {hunts?.map((hunt) => (
          <article key={hunt.joinCode} className="space-y-2 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-xl">{hunt.name}</h3>
              <span className="text-sm text-muted-foreground">{hunt.status === "live" ? tr("inProgress") : tr("ended")}</span>
            </div>
            <p className="text-sm">{tr("players", { n: hunt.playerCount })}</p>
            <p className="text-sm text-muted-foreground">{tr("codesToPlace")}</p>
            <ul className="space-y-1 text-sm">
              {hunt.stages.flatMap((stage) => stage.tasks).map((task) => (
                <li key={`${hunt.joinCode}-${task.title}`} className="flex justify-between gap-3">
                  <span>{task.title}</span>
                  <span className="font-mono">{task.code}</span>
                </li>
              ))}
            </ul>
            {hunt.status === "live" && ending !== hunt.joinCode && (
              <Button variant="outline" className="rounded-full" onClick={() => setEnding(hunt.joinCode)}>{tr("endHunt")}</Button>
            )}
            {ending === hunt.joinCode && (
              <div className="space-y-2">
                <p className="text-sm">{tr("confirmEnd")}</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="rounded-full"
                    onClick={async () => {
                      try {
                        await signedPost(`/api/hunts/${hunt.joinCode}/end`, {}, { action: "end", hunt: hunt.joinCode });
                        toast.success(tr("endDone"));
                        setEnding(null);
                        await load();
                      } catch (cause) {
                        const message = cause instanceof ClientError ? errorText(prefs.lang, cause.code) : tr("couldNotSave");
                        toast.error(message);
                      }
                    }}
                  >
                    {tr("yesEnd")}
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setEnding(null)}>{tr("cancel")}</Button>
                </div>
              </div>
            )}
          </article>
        ))}
      </section>

      <Appearance />

      <section>
        <h2 className="font-heading text-xl">{tr("settings")}</h2>
        <Button
          variant="outline"
          className="mt-3 rounded-full"
          onClick={() => {
            clearSession();
            setSession(null);
            router.replace("/");
          }}
        >
          {tr("lock")}
        </Button>
      </section>

      <details className="rounded-3xl bg-muted p-4 text-sm">
        <summary className="cursor-pointer font-medium">{tr("reviewNotes")}</summary>
        {review && (
          <div className="mt-3 space-y-1 text-muted-foreground">
            <p>These notes are in English for the review. They are not part of the player flow.</p>
            <p>Chain target: {review.chain} ({review.chainId}). Calls are mocked. Nothing is sent to a node.</p>
            <p>Sponsored pool: {review.spentEth} / {review.poolEth} ETH.</p>
            <p>This phone: {review.deviceSpentEth} / {review.deviceCapEth} ETH.</p>
            <p>Per hunt cap: {review.huntCapEth} ETH.</p>
            <p>Shared id path: {review.identityPath}</p>
          </div>
        )}
      </details>
    </div>
  );
}
