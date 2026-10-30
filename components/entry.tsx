"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Appearance } from "@/components/appearance";
import { Logo } from "@/components/logo";
import { useApp, useT } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  accountFromWords,
  clearSession,
  createWords,
  loadVault,
  normalizeWords,
  saveSession,
  saveVault,
  seal,
  unseal,
  type Vault,
} from "@/lib/identity";

type Mode = "choose" | "login" | "first" | "restore";

export function EntryScreen() {
  const { session, setSession, booted } = useApp();
  const tr = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [vault, setVault] = useState<Vault | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [again, setAgain] = useState("");
  const [words, setWords] = useState("");
  const [phrase, setPhrase] = useState("");
  const [firstStep, setFirstStep] = useState(0);
  const [checks, setChecks] = useState<number[]>([]);
  const [checkIndex, setCheckIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (booted && session) router.replace("/hunts");
  }, [booted, session, router]);

  useEffect(() => {
    const stored = loadVault();
    const id = window.setTimeout(() => setVault(stored), 0);
    return () => window.clearTimeout(id);
  }, []);

  const wordItems = useMemo(() => normalizeWords(words).split(" ").filter(Boolean), [words]);

  function resetError() {
    setError("");
  }

  function validCode(value: string) {
    return /^\d{4,6}$/.test(value);
  }

  async function finish(nextWords: string, displayName: string, deviceCode: string) {
    setBusy(true);
    try {
      const normalized = normalizeWords(nextWords);
      const account = accountFromWords(normalized);
      const sealed = await seal(normalized, deviceCode, displayName);
      saveVault(sealed);
      const next = { address: account.address, displayName, words: normalized };
      saveSession(next);
      setSession(next);
      router.replace("/hunts");
    } catch {
      setError(tr("wordsInvalid"));
    } finally {
      setBusy(false);
    }
  }

  function startFirst() {
    const fresh = createWords();
    setWords(fresh);
    setName("");
    setCode("");
    setAgain("");
    setFirstStep(0);
    setError("");
    const indexes = [2, 6, 10];
    setChecks(indexes);
    setCheckIndex(0);
    setMode("first");
  }

  function prepareChoices(list: string[], index: number) {
    const correct = list[index];
    const pool = list.filter((word) => word !== correct);
    const decoys = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    setChoices([correct, ...decoys].sort(() => Math.random() - 0.5));
  }

  async function onLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!vault) return;
    setBusy(true);
    setError("");
    try {
      const opened = await unseal(vault, code);
      const account = accountFromWords(opened);
      const next = { address: account.address, displayName: vault.displayName, words: opened };
      saveSession(next);
      setSession(next);
      router.replace("/hunts");
    } catch {
      setError(tr("wrongDeviceCode"));
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError(tr("nameRequired"));
    if (!validCode(code)) return setError(tr("codeTooShort"));
    if (code !== again) return setError(tr("codesDiffer"));
    const list = normalizeWords(phrase).split(" ");
    if (list.length !== 12) return setError(tr("wordsInvalid"));
    try {
      accountFromWords(phrase);
    } catch {
      return setError(tr("wordsInvalid"));
    }
    await finish(phrase, name.trim(), code);
  }

  if (!booted || session) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Logo />
      </div>
    );
  }

  return (
    <main className="app-shell mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background px-5 py-8 md:my-4 md:min-h-[calc(100dvh-2rem)] md:rounded-[2rem] md:px-6 md:shadow-2xl md:ring-1 md:ring-foreground/10">
      <header className="mb-8 flex items-start justify-between gap-3">
        <Logo />
        <span className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">{tr("preview")}</span>
      </header>

      {mode === "choose" && (
        <div className="flex flex-1 flex-col">
          <p className="page-title font-heading text-3xl leading-tight text-balance">{tr("tagline")}</p>
          <div className="mt-8 space-y-3">
            <Button className="h-auto min-h-16 w-full justify-start rounded-2xl px-4 py-3 whitespace-normal text-left" onClick={() => { clearSession(); setCode(""); setError(""); setMode("login"); }}>
              <span className="block">
                <span className="block text-base">{tr("login")}</span>
                <span className="block text-sm font-normal opacity-80">{tr("loginHint")}</span>
              </span>
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto min-h-24 rounded-2xl px-3 py-3 whitespace-normal text-left" onClick={() => { setPhrase(""); setName(vault?.displayName ?? ""); setCode(""); setAgain(""); setError(""); setMode("restore"); }}>
                <span className="block">
                  <span className="block text-base">{tr("restore")}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{tr("restoreHint")}</span>
                </span>
              </Button>
              <Button variant="outline" className="h-auto min-h-24 rounded-2xl px-3 py-3 whitespace-normal text-left" onClick={startFirst}>
                <span className="block">
                  <span className="block text-base">{tr("firstUse")}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{tr("firstUseHint")}</span>
                </span>
              </Button>
            </div>
          </div>
          <div className="mt-auto pt-10">
            <Appearance />
          </div>
        </div>
      )}

      {mode === "login" && (
        <form className="space-y-4" onSubmit={onLogin}>
          <button type="button" className="text-sm text-primary" onClick={() => setMode("choose")}>{tr("back")}</button>
          {vault ? (
            <>
              <h1 className="font-heading text-3xl">{tr("hello", { name: vault.displayName })}</h1>
              <Label htmlFor="device-code">{tr("deviceCode")}</Label>
              <Input id="device-code" inputMode="numeric" autoComplete="off" maxLength={6} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); resetError(); }} className="h-12 rounded-2xl px-3 text-base tracking-[0.3em]" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={busy}>{busy ? tr("opening") : tr("open")}</Button>
            </>
          ) : (
            <>
              <h1 className="font-heading text-3xl">{tr("login")}</h1>
              <p className="text-muted-foreground">{tr("nothingSaved")}</p>
              <Button type="button" className="h-12 w-full rounded-full" onClick={startFirst}>{tr("firstUse")}</Button>
              <Button type="button" variant="outline" className="h-12 w-full rounded-full" onClick={() => setMode("restore")}>{tr("restore")}</Button>
            </>
          )}
        </form>
      )}

      {mode === "first" && firstStep === 0 && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return setError(tr("nameRequired"));
            if (!validCode(code)) return setError(tr("codeTooShort"));
            if (code !== again) return setError(tr("codesDiffer"));
            setError("");
            setFirstStep(1);
          }}
        >
          <button type="button" className="text-sm text-primary" onClick={() => setMode("choose")}>{tr("back")}</button>
          <h1 className="font-heading text-3xl">{tr("firstUse")}</h1>
          <p className="text-muted-foreground">{tr("firstUseHint")}</p>
          <Label htmlFor="name">{tr("yourName")}</Label>
          <Input id="name" value={name} maxLength={24} onChange={(event) => setName(event.target.value)} className="h-12 rounded-2xl px-3 text-base" />
          <Label htmlFor="new-code">{tr("deviceCode")}</Label>
          <p className="text-sm text-muted-foreground">{tr("deviceCodeHelp")}</p>
          <Input id="new-code" inputMode="numeric" autoComplete="off" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="h-12 rounded-2xl px-3 text-base tracking-[0.3em]" />
          <Label htmlFor="new-code-2">{tr("deviceCodeAgain")}</Label>
          <Input id="new-code-2" inputMode="numeric" autoComplete="off" maxLength={6} value={again} onChange={(event) => setAgain(event.target.value.replace(/\D/g, ""))} className="h-12 rounded-2xl px-3 text-base tracking-[0.3em]" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full rounded-full text-base">{tr("next")}</Button>
        </form>
      )}

      {mode === "first" && firstStep === 1 && (
        <div className="space-y-4">
          <button type="button" className="text-sm text-primary" onClick={() => setFirstStep(0)}>{tr("back")}</button>
          <h1 className="font-heading text-3xl">{tr("writeThese")}</h1>
          <p>{tr("wordsHelp")}</p>
          <p className="text-sm text-muted-foreground">{tr("wordsEnglish")}</p>
          <ol className="grid grid-cols-2 gap-2">
            {wordItems.map((word, index) => (
              <li key={`${word}-${index}`} className="rounded-2xl bg-card px-3 py-2 ring-1 ring-foreground/10">
                <span className="mr-2 text-xs text-muted-foreground">{index + 1}</span>
                {word}
              </li>
            ))}
          </ol>
          <p className="text-sm">{tr("wordsWarning")}</p>
          <Button
            className="h-12 w-full rounded-full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(wordItems.join(" "));
                toast(tr("copied"));
              } catch {
                toast(tr("couldNotSave"));
              }
            }}
            variant="outline"
          >
            {tr("copy")}
          </Button>
          <Button
            className="h-12 w-full rounded-full text-base"
            onClick={() => {
              prepareChoices(wordItems, checks[0]);
              setCheckIndex(0);
              setFirstStep(2);
            }}
          >
            {tr("writtenDown")}
          </Button>
        </div>
      )}

      {mode === "first" && firstStep === 2 && (
        <div className="space-y-4">
          <h1 className="font-heading text-3xl">{tr("whichWord", { n: checks[checkIndex] + 1 })}</h1>
          <div className="grid grid-cols-2 gap-2">
            {choices.map((choice) => (
              <Button
                key={choice}
                variant="outline"
                className="h-12 rounded-2xl"
                disabled={busy}
                onClick={() => {
                  if (choice !== wordItems[checks[checkIndex]]) {
                    setError(tr("wordWrong"));
                    return;
                  }
                  setError("");
                  if (checkIndex + 1 >= checks.length) {
                    void finish(words, name.trim(), code);
                    return;
                  }
                  const next = checkIndex + 1;
                  setCheckIndex(next);
                  prepareChoices(wordItems, checks[next]);
                }}
              >
                {choice}
              </Button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {busy && <p className="text-sm text-muted-foreground">{tr("opening")}</p>}
        </div>
      )}

      {mode === "restore" && (
        <form className="space-y-4" onSubmit={onRestore}>
          <button type="button" className="text-sm text-primary" onClick={() => setMode("choose")}>{tr("back")}</button>
          <h1 className="font-heading text-3xl">{tr("restore")}</h1>
          <p className="text-muted-foreground">{tr("restoreHint")}</p>
          <Label htmlFor="phrase">{tr("backup")}</Label>
          <Textarea id="phrase" value={phrase} onChange={(event) => setPhrase(event.target.value)} className="min-h-28 rounded-2xl text-base" autoComplete="off" />
          <p className="text-sm text-muted-foreground">{tr("wordsEnglish")}</p>
          <Label htmlFor="restore-name">{tr("yourName")}</Label>
          <Input id="restore-name" value={name} maxLength={24} onChange={(event) => setName(event.target.value)} className="h-12 rounded-2xl px-3 text-base" />
          <Label htmlFor="restore-code">{tr("deviceCode")}</Label>
          <p className="text-sm text-muted-foreground">{tr("deviceCodeHelp")}</p>
          <Input id="restore-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="h-12 rounded-2xl px-3 text-base tracking-[0.3em]" />
          <Label htmlFor="restore-code-2">{tr("deviceCodeAgain")}</Label>
          <Input id="restore-code-2" inputMode="numeric" maxLength={6} value={again} onChange={(event) => setAgain(event.target.value.replace(/\D/g, ""))} className="h-12 rounded-2xl px-3 text-base tracking-[0.3em]" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={busy}>{busy ? tr("opening") : tr("open")}</Button>
        </form>
      )}
    </main>
  );
}
