"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useApp, useT } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CollectionItem } from "@/lib/client-api";
import {
  credentialTxHref,
  overviewCredentials,
  type B0xCredentialKind,
  type CredentialOverview,
  type CredentialSort,
  type CredentialStatus,
} from "@/lib/credentials";
import type { CopyKey } from "@/lib/i18n";

const KIND_KEY: Record<B0xCredentialKind, CopyKey> = {
  mark: "kindMark",
  prize: "kindPrize",
};

const STATUS_KEY: Record<CredentialStatus, CopyKey> = {
  active: "statusActive",
  expired: "statusExpired",
  ephemeral: "statusEphemeral",
  revoked: "statusRevoked",
};

function formatIssued(iso: string, lang: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-card-foreground">{children}</dd>
    </>
  );
}

function CredentialCard({ item, lang }: { item: CredentialOverview; lang: string }) {
  const tr = useT();
  const href = credentialTxHref(item);
  const huntLabel = item.huntName || item.joinCode;

  return (
    <article className="space-y-3 rounded-3xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.kind === "prize" ? "default" : "outline"}>{tr(KIND_KEY[item.kind])}</Badge>
        <Badge
          variant={item.status === "revoked" ? "destructive" : item.status === "active" ? "secondary" : "outline"}
          className={item.status === "ephemeral" ? "border-transparent bg-accent text-accent-foreground" : undefined}
        >
          {tr(STATUS_KEY[item.status])}
        </Badge>
      </div>
      <div>
        <h3 className="font-heading text-xl text-balance">{item.title}</h3>
        {item.description && item.description !== item.huntName && (
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {huntLabel && (
          <Field label={tr("filterHunt")}>
            {item.joinCode ? (
              <Link href={`/hunts/${item.joinCode}`} className="text-primary underline-offset-2 hover:underline">
                {huntLabel}
              </Link>
            ) : (
              huntLabel
            )}
          </Field>
        )}
        {item.stageTitle && <Field label={tr("stageOf")}>{item.stageTitle}</Field>}
      </dl>
      <p className="text-sm text-muted-foreground">{tr("issuedAt", { time: formatIssued(item.issuedAt, lang) })}</p>
      {item.issuer && <p className="text-sm">{tr("issuedBy", { name: item.issuer })}</p>}
      <p className="text-sm">
        <span className="text-muted-foreground">{tr("networkLabel")}</span>
        {item.chainName ? ` · ${item.chainName}` : ""}
      </p>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-2 hover:underline">
          {tr("chainLink")}
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">{tr("mockChainNote")}</p>
      )}
    </article>
  );
}

export function CredentialsOverview({
  items,
  error,
  onRetry,
}: {
  items: CollectionItem[] | null;
  error: boolean;
  onRetry: () => void;
}) {
  const { prefs } = useApp();
  const tr = useT();
  const [kind, setKind] = useState<B0xCredentialKind | "all">("all");
  const [huntId, setHuntId] = useState("all");
  const [status, setStatus] = useState<CredentialStatus | "all">("all");
  const [sort, setSort] = useState<CredentialSort>("newest");
  const [search, setSearch] = useState("");

  const owned = useMemo(() => overviewCredentials(items ?? []), [items]);
  const shown = useMemo(
    () => overviewCredentials(items ?? [], { kind, huntId, status, sort, search }),
    [items, kind, huntId, status, sort, search],
  );
  const hunts = useMemo(() => {
    const names = new Map<string, string>();
    for (const item of owned) {
      if (!names.has(item.huntId)) names.set(item.huntId, item.huntName || item.joinCode || item.huntId);
    }
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [owned]);
  const filtering = kind !== "all" || huntId !== "all" || status !== "all" || search.trim() !== "";

  function clearFilters() {
    setKind("all");
    setHuntId("all");
    setStatus("all");
    setSearch("");
  }

  const selectClass =
    "h-11 w-full min-w-0 rounded-2xl border border-input bg-background px-3 text-sm text-foreground";

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-xl">{tr("credentials")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tr("credentialsHelp")}</p>
      </div>

      {error && (
        <div className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <p>{tr("loadError")}</p>
          <Button variant="outline" className="mt-3 rounded-full" onClick={onRetry}>
            {tr("retry")}
          </Button>
        </div>
      )}

      {!error && !items && <p className="text-muted-foreground">{tr("loading")}</p>}

      {items && owned.length === 0 && (
        <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
          <h3 className="font-heading text-2xl">{tr("noCredentials")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{tr("noCredentialsHelp")}</p>
          <Link
            href="/hunts"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground"
          >
            {tr("hunts")}
          </Link>
        </div>
      )}

      {owned.length > 0 && (
        <>
          <div className="space-y-3 rounded-3xl bg-card p-3 ring-1 ring-foreground/10">
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tr("credentialSearch")}
              aria-label={tr("credentialSearch")}
              className="h-12 rounded-2xl bg-background px-3 text-base"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="block min-w-0 space-y-1">
                <span className="text-xs text-muted-foreground">{tr("filterType")}</span>
                <select className={selectClass} value={kind} onChange={(event) => setKind(event.target.value as B0xCredentialKind | "all")}>
                  <option value="all">{tr("allTypes")}</option>
                  <option value="mark">{tr("kindMark")}</option>
                  <option value="prize">{tr("kindPrize")}</option>
                </select>
              </label>
              <label className="block min-w-0 space-y-1">
                <span className="text-xs text-muted-foreground">{tr("filterStatus")}</span>
                <select
                  className={selectClass}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as CredentialStatus | "all")}
                >
                  <option value="all">{tr("allStatuses")}</option>
                  <option value="active">{tr("statusActive")}</option>
                  <option value="expired">{tr("statusExpired")}</option>
                  <option value="ephemeral">{tr("statusEphemeral")}</option>
                  <option value="revoked">{tr("statusRevoked")}</option>
                </select>
              </label>
              <label className="block min-w-0 space-y-1">
                <span className="text-xs text-muted-foreground">{tr("filterHunt")}</span>
                <select className={selectClass} value={huntId} onChange={(event) => setHuntId(event.target.value)}>
                  <option value="all">{tr("allHunts")}</option>
                  {hunts.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 space-y-1">
                <span className="text-xs text-muted-foreground">{tr("sortBy")}</span>
                <select className={selectClass} value={sort} onChange={(event) => setSort(event.target.value as CredentialSort)}>
                  <option value="newest">{tr("sortNewest")}</option>
                  <option value="oldest">{tr("sortOldest")}</option>
                  <option value="hunt">{tr("sortHunt")}</option>
                  <option value="type">{tr("sortType")}</option>
                </select>
              </label>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {shown.length === 1 ? tr("credentialOne") : tr("credentialCount", { n: shown.length })}
          </p>

          {shown.length === 0 && (
            <div className="rounded-3xl bg-muted p-4">
              <p>{tr("noCredentialMatches")}</p>
              {filtering && (
                <Button variant="outline" className="mt-3 rounded-full" onClick={clearFilters}>
                  {tr("clearFilters")}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {shown.map((item) => (
              <CredentialCard key={item.id} item={item} lang={prefs.lang} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
