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
import { randomJoinCode } from "@/lib/codes";
import type { Structure } from "@/lib/domain";
import {
  missingLocations,
  validateHuntShape,
  type HuntDraft,
  type SolutionMethod,
  type SpotLocation,
} from "@/lib/hunt-schema";
import { LIMITS } from "@/lib/limits";
import { errorText, type CopyKey } from "@/lib/i18n";
import {
  fillTokens,
  HUNT_TEMPLATES,
  KIDS_SAFETY,
  templateById,
  templateOptionLabel,
  toHuntDraft,
  type AgeBand,
  type StoryFills,
  type TemplateLang,
} from "@/lib/templates";

type DraftTask = {
  key: string;
  title: string;
  story: string;
  instruction: string;
  code: string;
  hint: string;
  method: SolutionMethod;
  location: SpotLocation | null;
  prompt: string;
  spotNote: string;
};
type DraftStage = {
  key: string;
  title: string;
  ruleKind: "all" | "atLeast";
  atLeast: number;
  tasks: DraftTask[];
};

type Draft = {
  templateId: string | null;
  templateLang: TemplateLang;
  ageBand: AgeBand;
  birthdayName: string;
  birthdayAge: string;
  dogName: string;
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
  return {
    key,
    title: "",
    story: "",
    instruction: "",
    code: "",
    hint: "",
    method: "code",
    location: null,
    prompt: "",
    spotNote: "",
  };
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
    templateId: null,
    templateLang: "en",
    ageBand: "big",
    birthdayName: "",
    birthdayAge: "",
    dogName: "",
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

function fillsOf(draft: Draft): StoryFills {
  return { name: draft.birthdayName, age: draft.birthdayAge, dog: draft.dogName };
}

function applyTemplateOnto(current: Draft, id: string, lang: TemplateLang, ageBand: AgeBand): Draft {
  const template = templateById(id);
  if (!template) return { ...current, templateId: null, templateLang: lang, ageBand };
  const hunt = toHuntDraft(template, lang, ageBand);
  const same = current.templateId === id;
  return {
    ...current,
    templateId: id,
    templateLang: lang,
    ageBand,
    structure: hunt.structure,
    name: hunt.name,
    description: hunt.description,
    prizeTitle: hunt.prizeTitle,
    prizeAbout: hunt.prizeAbout,
    stages: hunt.stages.map((item, stageIndex) => ({
      key: `${id}-stage-${stageIndex}`,
      title: item.title,
      ruleKind: item.rule.kind === "atLeast" ? "atLeast" : "all",
      atLeast: item.rule.kind === "atLeast" ? item.rule.n : 1,
      tasks: item.tasks.map((entry, taskIndex) => {
        const previous = same ? current.stages[stageIndex]?.tasks[taskIndex] : undefined;
        return {
          key: `${id}-${stageIndex}-${taskIndex}`,
          title: entry.title,
          story: entry.story,
          instruction: entry.instruction,
          code: previous?.code || entry.code,
          hint: previous?.hint ?? "",
          method: "code",
          location: previous?.location ?? null,
          prompt: entry.prompt,
          spotNote: entry.spotNote,
        };
      }),
    })),
  };
}

function toSchema(draft: Draft): HuntDraft {
  const fills = fillsOf(draft);
  const lang = draft.templateLang;
  return {
    structure: draft.structure ?? "serial",
    name: fillTokens(draft.name, fills, lang),
    description: fillTokens(draft.description, fills, lang),
    prizeTitle: fillTokens(draft.prizeTitle, fills, lang),
    prizeAbout: fillTokens(draft.prizeAbout, fills, lang),
    stages: draft.stages.map((item) => ({
      title: fillTokens(item.title, fills, lang),
      rule: item.ruleKind === "atLeast" ? { kind: "atLeast" as const, n: item.atLeast } : { kind: "all" as const },
      tasks: item.tasks.map((entry) => ({
        title: fillTokens(entry.title, fills, lang),
        story: fillTokens(entry.story, fills, lang),
        instruction: fillTokens(entry.instruction, fills, lang),
        hint: entry.hint,
        method: entry.method,
        code: entry.code,
        location: entry.location?.label.trim()
          ? { label: entry.location.label.trim(), lat: entry.location.lat, lng: entry.location.lng }
          : null,
        prompt: entry.prompt,
        spotNote: entry.spotNote,
      })),
    })),
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
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (!open || !session) return;
    void getJson<HomePayload>(`/api/hunts?address=${session.address}`)
      .then((home) => setAllowance(home.allowance))
      .catch(() => undefined);
  }, [open, session]);

  const dirty = Boolean(draft.name || draft.description || draft.structure || draft.prizeTitle || draft.templateId);
  const left = Math.max(allowance.cap - allowance.used, 0);

  function close() {
    setConfirmClose(false);
    setStep(0);
    setDraft(emptyDraft());
    setTemplatesOpen(false);
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
    setTemplatesOpen(false);
    setDraft((current) => ({
      ...current,
      templateId: null,
      structure,
      stages:
        structure === "hybrid"
          ? [stage("s1", "", 1), stage("s2", "", 1)]
          : [stage("s1", "", structure === "serial" ? 2 : 1)],
    }));
    setError("");
  }

  function chooseTemplate(id: string) {
    setTemplatesOpen(false);
    setError("");
    setDraft((current) => applyTemplateOnto(current, id, current.templateLang, current.ageBand));
  }

  function chooseScratch() {
    setTemplatesOpen(false);
    setError("");
    setDraft((current) => ({ ...emptyDraft(), templateLang: current.templateLang }));
  }

  function chooseStoryLang(lang: TemplateLang) {
    setError("");
    setDraft((current) =>
      current.templateId ? applyTemplateOnto(current, current.templateId, lang, current.ageBand) : { ...current, templateLang: lang },
    );
  }

  function chooseAgeBand(ageBand: AgeBand) {
    setError("");
    setDraft((current) =>
      current.templateId ? applyTemplateOnto(current, current.templateId, current.templateLang, ageBand) : { ...current, ageBand },
    );
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
    const hunt = toSchema(draft);
    const issues = validateHuntShape(hunt);
    if (issues.includes("stages")) {
      if (draft.structure === "serial") return tr("needSteps");
      if (draft.structure === "hybrid") return tr("needStages");
      return tr("needOne");
    }
    if (issues.includes("tasks")) return tr("needOne");
    if (issues.includes("rule")) return tr("rulesNeed");
    if (issues.includes("text") || issues.includes("code") || issues.includes("method")) return tr("eachCode");
    if (missingLocations(hunt) > 0) return tr("locationNeeded");
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
    const problem = validateSteps();
    if (problem) return setError(problem);
    const schema = toSchema(draft);
    setBusy(true);
    setError("");
    try {
      const result = await signedPost<{ joinCode: string }>(
        "/api/hunts",
        {
          joinCode: draft.joinCode,
          name: schema.name,
          description: schema.description,
          structure: draft.structure,
          startsAt: draft.timed && draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
          endsAt: draft.timed && draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
          displayName: session.displayName,
          prize: { title: schema.prizeTitle, description: schema.prizeAbout },
          stages: schema.stages.map((item) => ({
            title: item.title || tr("stageLabel", { n: 1 }),
            rule: item.rule,
            tasks: item.tasks.map((entry) => ({
              title: entry.title,
              story: entry.story,
              instruction: entry.instruction,
              code: entry.code,
              hint: entry.hint,
              method: entry.method,
              location: entry.location,
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

  const selectedTemplate = templateById(draft.templateId);
  const titles = [tr("stepStructure"), tr("stepBasics"), tr("stepSteps"), tr("stepPrize"), tr("stepReview"), tr("stepDone")];

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="flex h-[min(100dvh,860px)] w-[min(440px,calc(100%-1rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none" showCloseButton={!confirmClose}>
        <DialogHeader className="border-b px-4 py-4 pe-12">
          <DialogTitle className="font-heading text-2xl">{made ? tr("stepDone") : tr("createHunt")}</DialogTitle>
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
            <div className="space-y-4">
              <section className="space-y-3 rounded-3xl bg-accent/50 p-4" data-testid="templates-section">
                <h2 className="font-heading text-xl">{tr("templatesSection")}</h2>
                <p className="text-sm text-muted-foreground">{tr("templatesHelp")}</p>
                <div className="space-y-2">
                  <p className="text-sm">{tr("templateLanguage")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={draft.templateLang === "en" ? "default" : "outline"} className="rounded-full" onClick={() => chooseStoryLang("en")}>English</Button>
                    <Button type="button" variant={draft.templateLang === "da" ? "default" : "outline"} className="rounded-full" onClick={() => chooseStoryLang("da")}>Dansk</Button>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    data-testid="templates-dropdown"
                    aria-haspopup="listbox"
                    aria-expanded={templatesOpen}
                    aria-controls="template-options"
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-card px-3 py-2 text-start ring-1 ring-foreground/10"
                    onClick={() => setTemplatesOpen((open) => !open)}
                  >
                    <span>{selectedTemplate ? templateOptionLabel(selectedTemplate, draft.templateLang) : tr("startFromScratch")}</span>
                    <span aria-hidden="true">▾</span>
                  </button>
                  {templatesOpen && (
                    <ul id="template-options" role="listbox" aria-label={tr("templatesSection")} className="mt-2 space-y-1 rounded-2xl bg-card p-2 ring-1 ring-foreground/10">
                      <li>
                        <button
                          type="button"
                          role="option"
                          aria-selected={!draft.templateId}
                          data-testid="template-option-scratch"
                          className={`w-full rounded-xl px-3 py-2 text-start ${draft.templateId ? "hover:bg-muted" : "bg-primary/15"}`}
                          onClick={chooseScratch}
                        >
                          {tr("startFromScratch")}
                        </button>
                      </li>
                      {HUNT_TEMPLATES.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={draft.templateId === item.id}
                            data-testid={`template-option-${item.id}`}
                            className={`w-full rounded-xl px-3 py-2 text-start whitespace-normal ${draft.templateId === item.id ? "bg-primary/15" : "hover:bg-muted"}`}
                            onClick={() => chooseTemplate(item.id)}
                          >
                            {templateOptionLabel(item, draft.templateLang)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {selectedTemplate && (
                  <p className="text-sm">
                    {tr("templateReady")} {selectedTemplate.blurb[draft.templateLang]}
                  </p>
                )}
              </section>
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
            </div>
          )}

          {!confirmClose && step === 1 && (
            <div className="space-y-3">
              <Label htmlFor="hunt-name">{tr("huntName")}</Label>
              <Input id="hunt-name" value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-12 rounded-2xl px-3 text-base" />
              <Label htmlFor="hunt-about">{tr("shortDescription")}</Label>
              <Textarea id="hunt-about" value={draft.description} maxLength={280} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="rounded-2xl text-base" />
              {selectedTemplate?.personalise.includes("name") && (
                <>
                  <Label htmlFor="birthday-name">{tr("birthdayName")}</Label>
                  <Input id="birthday-name" value={draft.birthdayName} maxLength={40} onChange={(event) => setDraft({ ...draft, birthdayName: event.target.value })} className="h-12 rounded-2xl px-3 text-base" />
                </>
              )}
              {selectedTemplate?.personalise.includes("age") && (
                <>
                  <Label htmlFor="birthday-age">{tr("birthdayAge")}</Label>
                  <Input id="birthday-age" value={draft.birthdayAge} maxLength={8} onChange={(event) => setDraft({ ...draft, birthdayAge: event.target.value })} className="h-12 rounded-2xl px-3 text-base" />
                </>
              )}
              {selectedTemplate?.personalise.includes("dog") && (
                <>
                  <Label htmlFor="dog-name">{tr("dogName")}</Label>
                  <Input id="dog-name" value={draft.dogName} maxLength={40} onChange={(event) => setDraft({ ...draft, dogName: event.target.value })} className="h-12 rounded-2xl px-3 text-base" />
                </>
              )}
              {selectedTemplate && selectedTemplate.personalise.length > 0 && (
                <p className="rounded-2xl bg-accent/60 p-3 text-sm">{fillTokens(draft.prizeAbout, fillsOf(draft), draft.templateLang)}</p>
              )}
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
            <div className="space-y-4" data-testid="stage-editor">
              {selectedTemplate?.kids && (
                <div className="space-y-2">
                  <p className="text-sm">{tr("ageBand")}</p>
                  <div className="grid gap-2">
                    <Button type="button" variant={draft.ageBand === "little" ? "default" : "outline"} className="h-11 rounded-full whitespace-normal" onClick={() => chooseAgeBand("little")}>{tr("littleExplorers")}</Button>
                    <Button type="button" variant={draft.ageBand === "big" ? "default" : "outline"} className="h-11 rounded-full whitespace-normal" onClick={() => chooseAgeBand("big")}>{tr("bigExplorers")}</Button>
                  </div>
                  {draft.ageBand === "little" && <p className="text-sm text-muted-foreground">{tr("readAloud")}</p>}
                  <p className="text-sm">{KIDS_SAFETY[draft.templateLang]}</p>
                </div>
              )}
              {selectedTemplate?.note && <p className="text-sm text-muted-foreground">{selectedTemplate.note[draft.templateLang]}</p>}
              {draft.structure === "parallel" && draft.stages[0] && (
                <div className="space-y-2 rounded-3xl bg-card p-3 ring-1 ring-foreground/10">
                  <p className="text-sm">{tr("rule")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={draft.stages[0].ruleKind === "all" ? "default" : "outline"} className="rounded-full" onClick={() => setDraft({ ...draft, stages: draft.stages.map((entry, index) => index === 0 ? { ...entry, ruleKind: "all" } : entry) })}>{tr("allSteps")}</Button>
                    <Button type="button" variant={draft.stages[0].ruleKind === "atLeast" ? "default" : "outline"} className="rounded-full" onClick={() => setDraft({ ...draft, stages: draft.stages.map((entry, index) => index === 0 ? { ...entry, ruleKind: "atLeast" } : entry) })}>{tr("atLeast", { n: draft.stages[0].atLeast })}</Button>
                  </div>
                  {draft.stages[0].ruleKind === "atLeast" && (
                    <Input type="number" min={1} max={draft.stages[0].tasks.length} value={draft.stages[0].atLeast} onChange={(event) => setDraft({ ...draft, stages: draft.stages.map((entry, index) => index === 0 ? { ...entry, atLeast: Number(event.target.value) } : entry) })} className="h-11 rounded-2xl px-3" />
                  )}
                </div>
              )}
              {draft.structure !== "hybrid" && draft.stages[0] && draft.stages[0].tasks.map((entry, taskIndex) => (
                <div key={entry.key} className="space-y-3 rounded-3xl bg-card p-3 ring-1 ring-foreground/10" data-testid="stage-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-heading text-lg">{tr("stageLabel", { n: taskIndex + 1 })}</p>
                    {!entry.location?.label.trim() && <p className="text-sm font-medium text-destructive">{tr("locationMissing")}</p>}
                  </div>
                  <SpotCard
                    entry={entry}
                    index={taskIndex}
                    total={draft.stages[0].tasks.length}
                    tr={tr}
                    onChange={(patch) => updateTask(draft.stages[0].key, entry.key, patch)}
                    onMove={(direction) => moveTask(draft.stages[0].key, taskIndex, direction)}
                    onRemove={() => removeTask(draft.stages[0].key, entry.key)}
                  />
                </div>
              ))}
              {draft.structure !== "hybrid" && draft.stages[0] && (
                <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => addTask(draft.stages[0].key)}>{tr("addStep")}</Button>
              )}
              {draft.structure === "hybrid" && draft.stages.map((item, stageIndex) => {
                const stageMissing = item.tasks.some((entry) => !entry.location?.label.trim());
                return (
                  <div key={item.key} className="space-y-3 rounded-3xl bg-card p-3 ring-1 ring-foreground/10" data-testid="stage-card">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-heading text-lg">{tr("stageLabel", { n: stageIndex + 1 })}</p>
                      {stageMissing && <p className="text-sm font-medium text-destructive">{tr("locationMissing")}</p>}
                    </div>
                    {draft.structure === "hybrid" && (
                      <>
                        <Label htmlFor={`stage-${item.key}`}>{tr("stageName")}</Label>
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
                      <SpotCard
                        key={entry.key}
                        entry={entry}
                        index={taskIndex}
                        total={item.tasks.length}
                        tr={tr}
                        onChange={(patch) => updateTask(item.key, entry.key, patch)}
                        onMove={(direction) => moveTask(item.key, taskIndex, direction)}
                        onRemove={() => removeTask(item.key, entry.key)}
                      />
                    ))}
                    <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => addTask(item.key)}>{tr("addStep")}</Button>
                  </div>
                );
              })}
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
              <p className="font-heading text-2xl">{fillTokens(draft.name, fillsOf(draft), draft.templateLang)}</p>
              <p>{fillTokens(draft.description, fillsOf(draft), draft.templateLang)}</p>
              {draft.structure && <p>{tr(structureLine[draft.structure])}</p>}
              <p>{tr("stepPrize")}: {fillTokens(draft.prizeTitle, fillsOf(draft), draft.templateLang)}</p>
              <p>{fillTokens(draft.prizeAbout, fillsOf(draft), draft.templateLang)}</p>
              <p>{draft.timed ? `${draft.startsAt || "…"} → ${draft.endsAt || "…"}` : tr("noLimit")}</p>
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

function SpotCard({
  entry,
  index,
  total,
  tr,
  onChange,
  onMove,
  onRemove,
}: {
  entry: DraftTask;
  index: number;
  total: number;
  tr: (key: CopyKey, vars?: Record<string, string | number>) => string;
  onChange: (patch: Partial<DraftTask>) => void;
  onMove: (direction: number) => void;
  onRemove: () => void;
}) {
  const placed = Boolean(entry.location?.label.trim());
  return (
    <div className="space-y-2 border-t border-border pt-3" data-testid="spot-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{tr("countOf", { step: index + 1, total })}</p>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => onMove(-1)}>{tr("up")}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onMove(1)}>{tr("down")}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>{tr("remove")}</Button>
        </div>
      </div>
      <Input value={entry.title} placeholder={tr("stepTitle")} onChange={(event) => onChange({ title: event.target.value })} className="h-11 rounded-2xl px-3" />
      <div
        data-testid={placed ? "location-set" : "location-missing"}
        className={placed ? "space-y-2 rounded-2xl bg-accent/70 p-3" : "space-y-2 rounded-2xl border border-dashed border-destructive/70 bg-destructive/5 p-3"}
      >
        <div className="grid h-16 place-items-center rounded-xl bg-muted text-sm text-muted-foreground">{tr("mapPlaceholder")}</div>
        {!placed && <p className="font-medium text-destructive">{tr("locationMissing")}</p>}
        {!placed && <p className="text-sm text-muted-foreground">{tr("locationPrompt")}</p>}
        {entry.spotNote && <p className="text-sm">{tr("suggestedSpot", { spot: entry.spotNote })}</p>}
        <Label htmlFor={`place-${entry.key}`}>{tr("locationLabel")}</Label>
        <Input
          id={`place-${entry.key}`}
          value={entry.location?.label ?? ""}
          placeholder={tr("locationPlaceholder")}
          onChange={(event) => {
            const label = event.target.value;
            onChange({
              location: label.trim() ? { label, lat: entry.location?.lat ?? null, lng: entry.location?.lng ?? null } : null,
            });
          }}
          className="h-11 rounded-2xl px-3"
        />
      </div>
      <Label htmlFor={`story-${entry.key}`}>{tr("storyOptional")}</Label>
      <Textarea id={`story-${entry.key}`} value={entry.story} maxLength={280} onChange={(event) => onChange({ story: event.target.value })} className="rounded-2xl" />
      <p className="text-xs text-muted-foreground">{tr("storyLimit")}</p>
      {entry.prompt && <p className="text-sm text-muted-foreground">{entry.prompt}</p>}
      <Textarea value={entry.instruction} placeholder={tr("whatToDo")} onChange={(event) => onChange({ instruction: event.target.value })} className="rounded-2xl" />
      <Label>
        <Term tip={tr("foundCodeHelp")}>{tr("foundCode")}</Term>
      </Label>
      <Input value={entry.code} onChange={(event) => onChange({ code: event.target.value.toUpperCase() })} className="h-11 rounded-2xl px-3 tracking-wider" autoCapitalize="characters" />
      {(entry.spotNote || entry.prompt) && <p className="text-xs text-muted-foreground">{tr("exampleCodeNote")}</p>}
      <Input value={entry.hint} placeholder={entry.spotNote ? tr("yourPlaceHint") : tr("hintOptional")} onChange={(event) => onChange({ hint: event.target.value })} className="h-11 rounded-2xl px-3" />
      <div className="grid gap-2">
        <Button type="button" variant={entry.method === "code" ? "default" : "outline"} className="rounded-full" onClick={() => onChange({ method: "code" })}>{tr("typedCode")}</Button>
        <button type="button" disabled className="h-11 rounded-full border border-border px-3 text-sm opacity-50">{tr("multipleChoice")} · {tr("comingSoon")}</button>
        <button type="button" disabled className="h-11 rounded-full border border-border px-3 text-sm opacity-50">{tr("photoQr")} · {tr("comingSoon")}</button>
      </div>
    </div>
  );
}
