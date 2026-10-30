"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Term } from "@/components/term";
import { useApp, useT } from "@/components/providers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientError, getJson, signedPost, type HomePayload } from "@/lib/client-api";
import { isStepCode, randomJoinCode } from "@/lib/codes";
import type { Structure } from "@/lib/domain";
import { LIMITS } from "@/lib/limits";
import { errorText, formatDateTime, type CopyKey } from "@/lib/i18n";

type DraftTask = { key: string; title: string; instruction: string; code: string; hint: string };
type DraftStage = {
  key: string;
  title: string;
  ruleKind: "all" | "atLeast";
  atLeast: number;
  tasks: DraftTask[];
};

type Draft = {
  structure: Structure | null;
  name: string;
  description: string;
  timed: boolean;
  startsAt: string;
  endsAt: string;
  prizeTitle: string;
  prizeAbout: string;
  joinCode: string;
  stages: DraftStage[];
};

function task(key: string): DraftTask {
  return { key, title: "", instruction: "", code: "", hint: "" };
}

function stage(key: string, title: string, count: number): DraftStage {
  return {
    key,
    title,
    ruleKind: "all",
    atLeast: 1,
    tasks: Array.from({ length: count }, (_, index) => task(`${key}-task-${index}`)),
  };
}

function emptyDraft(): Draft {
  return {
    structure: null,
    name: "",
    description: "",
    timed: false,
    startsAt: "",
    endsAt: "",
    prizeTitle: "",
    prizeAbout: "",
    joinCode: "",
    stages: [stage("stage-1", "", 2)],
  };
}

const structures: Structure[] = ["serial", "parallel", "hybrid"];
const structureName: Record<Structure, CopyKey> = {
  serial: "serialName",
  parallel: "parallelName",
  hybrid: "hybridName",
};
const structureLine: Record<Structure, CopyKey> = {
  serial: "serialLine",
  parallel: "parallelLine",
  hybrid: "hybridLine",
};

export function Wizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session, prefs } = useApp();
  const tr = useT();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [allowance, setAllowance] = useState({ used: 0, cap: 3 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [made, setMade] = useState("");

  useEffect(() => {
    if (!open || !session) return;
    void getJson<HomePayload>(`/api/hunts?address=${session.address}`)
      .then((home) => setAllowance(home.allowance))
      .catch(() => undefined);
  }, [open, session]);

  const dirty = Boolean(draft.name || draft.description || draft.structure || draft.prizeTitle);
  const left = Math.max(allowance.cap - allowance.used, 0);

  function close() {
    setConfirmClose(false);
    setStep(0);
    setDraft(emptyDraft());
    setError("");
    setMade("");
    onOpenChange(false);
  }

  function requestClose(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (dirty && !made) {
      setConfirmClose(true);
      return;
    }
    close();
  }

  function choose(structure: Structure) {
    setDraft((current) => ({
      ...current,
      structure,
      stages:
        structure === "hybrid"
          ? [stage("s1", "", 1), stage("s2", "", 1)]
          : [stage("s1", "", structure === "serial" ? 2 : 1)],
    }));
    setError("");
  }

  function updateTask(stageKey: string, taskKey: string, patch: Partial<DraftTask>) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((item) =>
        item.key === stageKey
          ? { ...item, tasks: item.tasks.map((entry) => (entry.key === taskKey ? { ...entry, ...patch } : entry)) }
          : item,
      ),
    }));
  }

  function validateSteps() {
    if (!draft.structure) return tr("couldNotSave");
    const taskCount = draft.stages.reduce((sum, item) => sum + item.tasks.length, 0);
    if (draft.structure === "serial" && taskCount < 2) return tr("needSteps");
    if (draft.structure === "parallel" && taskCount < 1) return tr("needOne");
    if (draft.structure === "hybrid" && draft.stages.length < 2) return tr("needStages");
    for (const item of draft.stages) {
      if (item.tasks.length < 1) return tr("needOne");
      if (item.ruleKind === "atLeast" && (item.atLeast < 1 || item.atLeast > item.tasks.length)) return tr("rulesNeed");
      for (const entry of item.tasks) {
        if (!entry.title.trim() || !entry.instruction.trim() || !isStepCode(entry.code)) return tr("eachCode");
      }
    }
    return "";
  }

  function goNext() {
    if (step === 0 && !draft.structure) return;
    if (step === 1) {
      if (!draft.name.trim() || !draft.description.trim()) return setError(tr("nameTheHunt"));
      if (draft.timed && draft.startsAt && draft.endsAt && draft.endsAt <= draft.startsAt) return setError(tr("windowBad"));
    }
    if (step === 2) {
      const problem = validateSteps();
      if (problem) return setError(problem);
    }
    if (step === 3 && (!draft.prizeTitle.trim() || !draft.prizeAbout.trim())) return setError(tr("prizeNeeded"));
    if (step === 3 && !draft.joinCode) {
      setDraft((current) => ({ ...current, joinCode: randomJoinCode() }));
    }
    setError("");
    setStep((value) => value + 1);
  }

  async function create() {
    if (!session || !draft.structure) return;
    if (left < 1) return setError(tr("allowanceFull"));
    setBusy(true);
    setError("");
    try {
      const result = await signedPost<{ joinCode: string }>(
        "/api/hunts",
        {
          joinCode: draft.joinCode,
          name: draft.name,
          description: draft.description,
          structure: draft.structure,
          startsAt: draft.timed && draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
          endsAt: draft.timed && draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
          displayName: session.displayName,
          prize: { title: draft.prizeTitle, description: draft.prizeAbout },
          stages: draft.stages.map((item) => ({
            title: item.title || tr("stageLabel", { n: 1 }),
            rule: item.ruleKind === "atLeast" ? { kind: "atLeast", n: item.atLeast } : { kind: "all" },
            tasks: item.tasks.map((entry) => ({
              title: entry.title,
              instruction: entry.instruction,
              code: entry.code,
              hint: entry.hint,
            })),
          })),
        },
        { action: "create", hunt: draft.joinCode },
      );
      setMade(result.joinCode);
      setStep(5);
      setAllowance((current) => ({ ...current, used: current.used + 1 }));
    } catch (cause) {
      const message = cause instanceof ClientError ? errorText(prefs.lang, cause.code) : tr("couldNotSave");
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const titles = [tr("stepStructure"), tr("stepBasics"), tr("stepSteps"), tr("stepPrize"), tr("stepReview"), tr("stepDone")];

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="flex h-[min(100dvh,860px)] w-[min(440px,calc(100%-1rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none" showCloseButton={!confirmClose}>
        <DialogHeader className="border-b px-4 py-4 pe-12">
          <DialogTitle className="font-heading text-2xl">{made ? tr("stepDone") : tr("newHunt")}</DialogTitle>
          <DialogDescription>{titles[step]}</DialogDescription>
          <p className="text-xs text-muted-foreground">{tr("countOf", { step: step + 1, total: 6 })}</p>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {confirmClose && (
            <div className="space-y-3 rounded-2xl bg-accent p-4">
              <p>{tr("discardAsk")}</p>
              <Button variant="destructive" className="h-11 w-full rounded-full" onClick={close}>{tr("discardYes")}</Button>
              <Button variant="outline" className="h-11 w-full rounded-full" onClick={() => setConfirmClose(false)}>{tr("keepEditing")}</Button>
            </div>
          )}

          {!confirmClose && step === 0 && (
            <div className="space-y-3">
              {structures.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10 has-[:checked]:ring-2 has-[:checked]:ring-primary"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="structure"
                      className="mt-1"
                      checked={draft.structure === item}
                      onChange={() => choose(item)}
                    />
                    <span>
                      <span className="font-heading text-lg">{tr(structureName[item])}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{tr(structureLine[item])}</span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {!confirmClose && step === 1 && (
            <div className="space-y-3">
              <Label htmlFor="hunt-name">{tr("huntName")}</Label>
              <Input id="hunt-name" value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-12 rounded-2xl px-3 text-base" />
              <Label htmlFor="hunt-about">{tr("shortDescription")}</Label>
              <Textarea id="hunt-about" value={draft.description} maxLength={280} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="rounded-2xl text-base" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.timed} onChange={(event) => setDraft({ ...draft, timed: event.target.checked })} />
                {draft.timed ? tr("window") : tr("noLimit")}
              </label>
              {draft.timed && (
                <div className="grid gap-3">
                  <Label htmlFor="starts">{tr("starts")}</Label>
                  <Input id="starts" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} className="h-12 rounded-2xl px-3" />
                  <Label htmlFor="ends">{tr("ends")}</Label>
                  <Input id="ends" type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} className="h-12 rounded-2xl px-3" />
                </div>
              )}
            </div>
          )}

          {!confirmClose && step === 2 && (
            <div className="space-y-4">
              {draft.stages.map((item, stageIndex) => (
                <div key={item.key} className="space-y-3 rounded-3xl bg-card p-3 ring-1 ring-foreground/10">
                  {draft.structure === "hybrid" && (
                    <>
                      <Label htmlFor={`stage-${item.key}`}>{tr("stageLabel", { n: stageIndex + 1 })}</Label>
                      <Input id={`stage-${item.key}`} value={item.title} placeholder={tr("stageName")} onChange={(event) => setDraft({ ...draft, stages: draft.stages.map((entry) => entry.key === item.key ? { ...entry, title: event.target.value } : entry) })} className="h-11 rounded-2xl px-3" />
                    </>
                  )}
                  {draft.structure !== "serial" && (
                    <div className="space-y-2">
                      <p className="text-sm">{tr("rule")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant={item.ruleKind === "all" ? "default" : "outline"} className="rounded-full" onClick={() => setDraft({ ...draft, stages: draft.stages.map((entry) => entry.key === item.key ? { ...entry, ruleKind: "all" } : entry) })}>{tr("allSteps")}</Button>
                        <Button type="button" variant={item.ruleKind === "atLeast" ? "default" : "outline"} className="rounded-full" onClick={() => setDraft({ ...draft, stages: draft.stages.map((entry) => entry.key === item.key ? { ...entry, ruleKind: "atLeast" } : entry) })}>{tr("atLeast", { n: item.atLeast })}</Button>
                      </div>
                      {item.ruleKind === "atLeast" && (
                        <Input type="number" min={1} max={item.tasks.length} value={item.atLeast} onChange={(event) => setDraft({ ...draft, stages: draft.stages.map((entry) => entry.key === item.key ? { ...entry, atLeast: Number(event.target.value) } : entry) })} className="h-11 rounded-2xl px-3" />
                      )}
                    </div>
                  )}
                  {item.tasks.map((entry, taskIndex) => (
                    <div key={entry.key} className="space-y-2 border-t border-border pt-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{tr("countOf", { step: taskIndex + 1, total: item.tasks.length })}</p>
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => moveTask(item.key, taskIndex, -1)}>{tr("up")}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => moveTask(item.key, taskIndex, 1)}>{tr("down")}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeTask(item.key, entry.key)}>{tr("remove")}</Button>
                        </div>
                      </div>
                      <Input value={entry.title} placeholder={tr("stepTitle")} onChange={(event) => updateTask(item.key, entry.key, { title: event.target.value })} className="h-11 rounded-2xl px-3" />
                      <Textarea value={entry.instruction} placeholder={tr("whatToDo")} onChange={(event) => updateTask(item.key, entry.key, { instruction: event.target.value })} className="rounded-2xl" />
                      <Label>
                        <Term tip={tr("foundCodeHelp")}>{tr("foundCode")}</Term>
                      </Label>
                      <Input value={entry.code} onChange={(event) => updateTask(item.key, entry.key, { code: event.target.value.toUpperCase() })} className="h-11 rounded-2xl px-3 tracking-wider" autoCapitalize="characters" />
                      <Input value={entry.hint} placeholder={tr("hintOptional")} onChange={(event) => updateTask(item.key, entry.key, { hint: event.target.value })} className="h-11 rounded-2xl px-3" />
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => addTask(item.key)}>{tr("addStep")}</Button>
                </div>
              ))}
              {draft.structure === "hybrid" && (
                <Button type="button" variant="outline" className="w-full rounded-full" onClick={addStage}>{tr("addStage")}</Button>
              )}
            </div>
          )}

          {!confirmClose && step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground"><Term tip={tr("prizeHelp")}>{tr("stepPrize")}</Term></p>
              <Label htmlFor="prize-name">{tr("prizeName")}</Label>
              <Input id="prize-name" value={draft.prizeTitle} onChange={(event) => setDraft({ ...draft, prizeTitle: event.target.value })} className="h-12 rounded-2xl px-3 text-base" />
              <Label htmlFor="prize-about">{tr("prizeAbout")}</Label>
              <Textarea id="prize-about" value={draft.prizeAbout} onChange={(event) => setDraft({ ...draft, prizeAbout: event.target.value })} className="rounded-2xl text-base" />
            </div>
          )}

          {!confirmClose && step === 4 && (
            <div className="space-y-3">
              <p className="font-heading text-2xl">{draft.name}</p>
              <p>{draft.description}</p>
              {draft.structure && <p>{tr(structureLine[draft.structure])}</p>}
              <p>{tr("stepPrize")}: {draft.prizeTitle}</p>
              <p>{draft.timed ? `${formatDateTime(prefs.lang, draft.startsAt)} → ${formatDateTime(prefs.lang, draft.endsAt)}` : tr("noLimit")}</p>
              <Label htmlFor="join-edit"><Term tip={tr("huntCodeHelp")}>{tr("huntCode")}</Term></Label>
              <Input id="join-edit" value={draft.joinCode} onChange={(event) => setDraft({ ...draft, joinCode: event.target.value.toUpperCase() })} className="h-12 rounded-2xl px-3 text-base tracking-widest" />
              <p>{tr("playersNeverPay")}</p>
              <p>{tr("allowanceLine", { left, cap: allowance.cap })}</p>
              <p>{tr("coveredPlayers", { n: LIMITS.playersPerHunt })}</p>
              <p className="text-sm text-muted-foreground">{tr("freeNote")}</p>
              {left < 1 && (
                <p>
                  {tr("allowanceFull")}{" "}
                  <button type="button" className="text-primary underline" onClick={() => { close(); router.push("/organise"); }}>{tr("publicEvent")}</button>
                </p>
              )}
            </div>
          )}

          {!confirmClose && step === 5 && (
            <div className="space-y-4 text-center">
              <p>{tr("shareThis")}</p>
              <p className="font-heading text-4xl tracking-[0.2em]">{made}</p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(made);
                    toast.success(tr("copied"));
                  } catch {
                    toast.error(tr("couldNotSave"));
                  }
                }}
              >
                {tr("copy")}
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {!confirmClose && (
          <div className="grid grid-cols-2 gap-2 border-t p-4">
            {step < 5 && (
              <Button variant="outline" className="h-12 rounded-full" onClick={() => { setError(""); setStep((value) => Math.max(0, value - 1)); }} disabled={step === 0}>
                {tr("back")}
              </Button>
            )}
            {step < 4 && (
              <Button className="h-12 rounded-full" onClick={goNext} disabled={step === 0 && !draft.structure}>{tr("next")}</Button>
            )}
            {step === 4 && (
              <Button className="h-12 rounded-full" onClick={() => void create()} disabled={busy || left < 1}>{busy ? tr("working") : tr("createHunt")}</Button>
            )}
            {step === 5 && (
              <>
                <Button variant="outline" className="h-12 rounded-full" onClick={() => { setMade(""); setDraft(emptyDraft()); setStep(0); }}>{tr("another")}</Button>
                <Button className="h-12 rounded-full" onClick={() => { const code = made; close(); router.push(`/hunts/${code}`); }}>{tr("viewHunt")}</Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function moveTask(stageKey: string, index: number, direction: number) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((item) => {
        if (item.key !== stageKey) return item;
        const next = index + direction;
        if (next < 0 || next >= item.tasks.length) return item;
        const tasks = item.tasks.slice();
        const [picked] = tasks.splice(index, 1);
        tasks.splice(next, 0, picked);
        return { ...item, tasks };
      }),
    }));
  }

  function removeTask(stageKey: string, taskKey: string) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((item) =>
        item.key === stageKey ? { ...item, tasks: item.tasks.filter((entry) => entry.key !== taskKey) } : item,
      ),
    }));
  }

  function addTask(stageKey: string) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((item) =>
        item.key === stageKey ? { ...item, tasks: [...item.tasks, task(crypto.randomUUID())] } : item,
      ),
    }));
  }

  function addStage() {
    setDraft((current) => ({
      ...current,
      stages: [...current.stages, stage(crypto.randomUUID(), "", 1)],
    }));
  }
}
