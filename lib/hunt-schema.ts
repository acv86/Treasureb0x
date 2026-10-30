/**
 * The hunt a creator can publish.
 * Solution methods include typed codes today. Multiple choice and a photo of a QR
 * stay in the model so a later editor can turn them on without a new shape.
 * Templates ship with no locations. Publishing asks for one place per spot.
 */

import { isStepCode } from "./codes";
import { ruleHolds, type StageRule, type Structure } from "./domain";

export const SOLUTION_METHODS = ["code", "choice", "qr"] as const;
export type SolutionMethod = (typeof SOLUTION_METHODS)[number];

export const HUNT_STRUCTURES = ["serial", "parallel", "hybrid"] as const;

/** English type names used in the template menu: "Serial, The Dragon Egg". */
export const STRUCTURE_TYPE_LABEL: Record<Structure, string> = {
  serial: "Serial",
  parallel: "Parallel",
  hybrid: "Hybrid",
};

export type SpotLocation = {
  label: string;
  lat: number | null;
  lng: number | null;
};

export type HuntTaskDraft = {
  title: string;
  story: string;
  instruction: string;
  hint: string;
  method: SolutionMethod;
  code: string;
  location: SpotLocation | null;
  /** Creator-only prompt. Not shown to players. */
  prompt: string;
  /** Suggested everyday spot. Not a pin. */
  spotNote: string;
};

export type HuntStageDraft = {
  title: string;
  rule: StageRule;
  tasks: HuntTaskDraft[];
};

export type HuntDraft = {
  structure: Structure;
  name: string;
  description: string;
  prizeTitle: string;
  prizeAbout: string;
  stages: HuntStageDraft[];
};

export const huntSchema = {
  structures: HUNT_STRUCTURES,
  methods: SOLUTION_METHODS,
  limits: {
    name: 60,
    description: 280,
    prizeTitle: 60,
    prizeAbout: 280,
    stageTitle: 60,
    taskTitle: 60,
    story: 280,
    instruction: 500,
    hint: 200,
    place: 80,
  },
  code: { min: 4, max: 24 },
  location: { requiredToPublish: true, templateDefault: null },
} as const;

export type HuntIssue =
  | "structure"
  | "name"
  | "description"
  | "prize"
  | "stages"
  | "tasks"
  | "rule"
  | "text"
  | "code"
  | "method"
  | "location";

function tooLong(value: string, max: number): boolean {
  return value.trim().length > max;
}

export function locationIsSet(location: SpotLocation | null | undefined): boolean {
  if (!location) return false;
  if (location.label.trim().length > 0) return true;
  return (
    typeof location.lat === "number" &&
    typeof location.lng === "number" &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng)
  );
}

export function draftTasks(draft: HuntDraft): HuntTaskDraft[] {
  return draft.stages.flatMap((stage) => stage.tasks);
}

/** Shape of the stages, clues and codes. Locations and the prize text are separate. */
export function validateHuntShape(draft: HuntDraft): HuntIssue[] {
  const issues = new Set<HuntIssue>();
  if (!HUNT_STRUCTURES.includes(draft.structure)) issues.add("structure");
  if (!Array.isArray(draft.stages) || draft.stages.length === 0) issues.add("stages");

  const taskCount = draftTasks(draft).length;
  if (draft.structure === "serial" && (draft.stages.length !== 1 || taskCount < 2)) issues.add("stages");
  if (draft.structure === "parallel" && draft.stages.length !== 1) issues.add("stages");
  if (draft.structure === "hybrid" && draft.stages.length < 2) issues.add("stages");

  for (const stage of draft.stages) {
    if (tooLong(stage.title, huntSchema.limits.stageTitle)) issues.add("text");
    if (!Array.isArray(stage.tasks) || stage.tasks.length === 0) {
      issues.add("tasks");
      continue;
    }
    if (!stage.rule || !ruleHolds(stage.rule, stage.tasks.length)) issues.add("rule");
    for (const task of stage.tasks) {
      if (!task.title.trim() || !task.instruction.trim()) issues.add("text");
      if (
        tooLong(task.title, huntSchema.limits.taskTitle) ||
        tooLong(task.story, huntSchema.limits.story) ||
        tooLong(task.instruction, huntSchema.limits.instruction) ||
        tooLong(task.hint, huntSchema.limits.hint) ||
        tooLong(task.prompt, huntSchema.limits.instruction) ||
        tooLong(task.spotNote, huntSchema.limits.hint)
      ) {
        issues.add("text");
      }
      if (!SOLUTION_METHODS.includes(task.method)) issues.add("method");
      if (task.method === "code" && !isStepCode(task.code)) issues.add("code");
      if (task.location && !locationIsSet(task.location)) issues.add("location");
      if (task.location && tooLong(task.location.label, huntSchema.limits.place)) issues.add("text");
    }
  }

  return [...issues];
}

/** A template hunt, including its title, intro and prize. Empty locations are allowed. */
export function validateHunt(draft: HuntDraft): HuntIssue[] {
  const issues = new Set<HuntIssue>(validateHuntShape(draft));
  if (!draft.name.trim() || tooLong(draft.name, huntSchema.limits.name)) issues.add("name");
  if (!draft.description.trim() || tooLong(draft.description, huntSchema.limits.description)) {
    issues.add("description");
  }
  if (!draft.prizeTitle.trim() || tooLong(draft.prizeTitle, huntSchema.limits.prizeTitle)) issues.add("prize");
  if (!draft.prizeAbout.trim() || tooLong(draft.prizeAbout, huntSchema.limits.prizeAbout)) issues.add("prize");
  return [...issues];
}

export function missingLocations(draft: HuntDraft): number {
  return draftTasks(draft).filter((task) => !locationIsSet(task.location)).length;
}

/** Publishing needs a valid hunt, a typed code on every spot, and a place on every spot. */
export function canPublish(draft: HuntDraft): boolean {
  if (validateHunt(draft).length > 0) return false;
  if (missingLocations(draft) > 0) return false;
  return draftTasks(draft).every((task) => task.method === "code");
}

export function sentenceCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed
    .split(/[.!?]+/u)
    .map((part) => part.trim())
    .filter(Boolean).length;
}
