"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp, useT } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { getJson, type CollectionItem } from "@/lib/client-api";
import { localizeSample } from "@/lib/sample-text";

export function PrizesView() {
  const { session, prefs } = useApp();
  const tr = useT();
  const [items, setItems] = useState<CollectionItem[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    if (!session) return;
    void getJson<{ items: CollectionItem[] }>(`/api/collection?address=${session.address}`).then(
      (payload) => {
        setItems(payload.items);
        setError(false);
      },
      () => setError(true),
    );
  }

  useEffect(() => {
    if (!session) return;
    let live = true;
    void getJson<{ items: CollectionItem[] }>(`/api/collection?address=${session.address}`).then(
      (payload) => {
        if (!live) return;
        setItems(payload.items);
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

  const prizes = items?.filter((item) => item.kind === "prize") ?? [];
  const marks = items?.filter((item) => item.kind === "mark") ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-4xl">{tr("prizes")}</h1>
        <p className="mt-2 text-muted-foreground">{tr("marksHelp")}</p>
      </header>
      {error && (
        <div>
          <p>{tr("loadError")}</p>
          <Button variant="outline" className="mt-3 rounded-full" onClick={() => void load()}>{tr("retry")}</Button>
        </div>
      )}
      {!error && !items && <p className="text-muted-foreground">{tr("loading")}</p>}
      {items && items.length === 0 && <p className="text-muted-foreground">{tr("noPrizesYet")}</p>}
      {prizes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-xl">{tr("prizes")}</h2>
          {prizes.map((item) => {
            const shown = localizeSample(prefs.lang, item);
            return (
            <Link key={item.id} href={`/hunts/${item.joinCode}`} className="block rounded-3xl bg-primary p-4 text-primary-foreground">
              <p className="text-xs uppercase tracking-wide opacity-80">{tr("kept")}</p>
              <h3 className="font-heading text-2xl">{shown.title}</h3>
              <p className="mt-1">{shown.description}</p>
              <p className="mt-2 text-sm opacity-80">{tr("fromHunt", { name: shown.huntName })}</p>
            </Link>
            );
          })}
        </section>
      )}
      {marks.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-xl">{tr("marks")}</h2>
          <div className="hunt-cards space-y-3">
          {marks.map((item) => {
            const shown = localizeSample(prefs.lang, item);
            return (
            <Link key={item.id} href={`/hunts/${item.joinCode}`} className="tint-card block rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
              <h3 className="font-heading text-lg">{shown.title}</h3>
              <p className="text-sm text-muted-foreground">{tr("fromHunt", { name: shown.huntName })}</p>
            </Link>
            );
          })}
          </div>
        </section>
      )}
    </div>
  );
}
