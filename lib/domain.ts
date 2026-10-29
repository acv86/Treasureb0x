/**
 * Hunt shapes and the rules for what a player is allowed to see and do.
 * Pure functions. The product backend applies them; nothing here talks to a chain.
 */

export type Structure = "serial" | "parallel" | "hybrid";

export type StageRule = { kind: "all" } | { kind: "atLeast"; n: number };

export type Task = {
  id: string;
  title: string;
  instruction: string;
  hint: string | null;
};

export type Stage = {
  id: string;
  title: string;
  rule: StageRule;
  tasks: Task[];
};

export type HuntShape = {
  structure: Structure;
  status: "live" | "ended";
  startsAt: string | null;
  endsAt: string | null;
  stages: Stage[];
};

export type Phase = "upcoming" | "open" | "ended";

export type TaskState = "done" | "open" | "locked" | "skipped";

export type PublicTask = {
  id: string;
  title: string | null;
  instruction: string | null;
  hint: string | null;
  state: TaskState;
};

export type PublicStage = {
  id: string;
  title: string | null;
  state: "done" | "open" | "locked";
  rule: StageRule | null;
  tasks: PublicTask[];
};

export type PlayerView = {
  phase: Phase;
  completedCount: number;
  totalCount: number;
  prizeReady: boolean;
  hiddenStepCount: number;
  stages: PublicStage[];
};

export function allTasks(hunt: HuntShape): Task[] {
  return hunt.stages.flatMap((stage) => stage.tasks);
}

export function phaseAt(hunt: HuntShape, now: number): Phase {
  if (hunt.status === "ended") return "ended";
  if (hunt.startsAt && now < Date.parse(hunt.startsAt)) return "upcoming";
  if (hunt.endsAt && now > Date.parse(hunt.endsAt)) return "ended";
  return "open";
}

export function stageSatisfied(stage: Stage, completed: ReadonlySet<string>): boolean {
  const done = stage.tasks.filter((task) => completed.has(task.id)).length;
  if (stage.tasks.length === 0) return false;
  if (stage.rule.kind === "all") return done === stage.tasks.length;
  return done >= stage.rule.n;
}

/** Index of the first stage whose rule is not met, or stages.length when all are met. */
export function currentStageIndex(hunt: HuntShape, completed: ReadonlySet<string>): number {
  if (hunt.structure !== "hybrid") return 0;
  for (let i = 0; i < hunt.stages.length; i++) {
    if (!stageSatisfied(hunt.stages[i], completed)) return i;
  }
  return hunt.stages.length;
}

export function prizeReady(hunt: HuntShape, completed: ReadonlySet<string>): boolean {
  const tasks = allTasks(hunt);
  if (tasks.length === 0) return false;
  if (hunt.structure === "serial") return tasks.every((task) => completed.has(task.id));
  if (hunt.structure === "parallel") {
    const stage = hunt.stages[0];
    return Boolean(stage && stageSatisfied(stage, completed));
  }
  return hunt.stages.length > 0 && hunt.stages.every((stage) => stageSatisfied(stage, completed));
}

/** Step ids that currently accept a code. Optional steps close once a rule is met. */
export function openTaskIds(hunt: HuntShape, completed: ReadonlySet<string>): string[] {
  if (hunt.structure === "serial") {
    const next = (hunt.stages[0]?.tasks ?? []).find((task) => !completed.has(task.id));
    return next ? [next.id] : [];
  }
  if (hunt.structure === "parallel") {
    const stage = hunt.stages[0];
    if (!stage || stageSatisfied(stage, completed)) return [];
    return stage.tasks.filter((task) => !completed.has(task.id)).map((task) => task.id);
  }
  const index = currentStageIndex(hunt, completed);
  const stage = hunt.stages[index];
  if (!stage) return [];
  return stage.tasks.filter((task) => !completed.has(task.id)).map((task) => task.id);
}

function visibleTask(task: Task, state: TaskState): PublicTask {
  if (state === "locked") {
    return { id: task.id, title: null, instruction: null, hint: null, state };
  }
  return {
    id: task.id,
    title: task.title,
    instruction: task.instruction,
    hint: task.hint,
    state,
  };
}

export function playerView(hunt: HuntShape, completedIds: readonly string[], now: number): PlayerView {
  const completed = new Set(completedIds);
  const tasks = allTasks(hunt);
  const open = new Set(openTaskIds(hunt, completed));
  const ready = prizeReady(hunt, completed);
  let hiddenStepCount = 0;

  const stages: PublicStage[] = hunt.stages.map((stage, index) => {
    if (hunt.structure === "serial") {
      const visible: PublicTask[] = [];
      let hiding = false;
      for (const task of stage.tasks) {
        if (hiding) {
          hiddenStepCount += 1;
          continue;
        }
        if (completed.has(task.id)) visible.push(visibleTask(task, "done"));
        else if (open.has(task.id)) {
          visible.push(visibleTask(task, "open"));
          hiding = true;
        } else {
          hiddenStepCount += 1;
          hiding = true;
        }
      }
      return {
        id: stage.id,
        title: stage.title,
        state: ready ? "done" : "open",
        rule: stage.rule,
        tasks: visible,
      };
    }

    if (hunt.structure === "hybrid") {
      const current = currentStageIndex(hunt, completed);
      const state: PublicStage["state"] =
        index < current ? "done" : index === current ? "open" : "locked";
      if (state === "locked") {
        hiddenStepCount += stage.tasks.length;
        return { id: stage.id, title: null, state, rule: null, tasks: [] };
      }
      return {
        id: stage.id,
        title: stage.title,
        state,
        rule: stage.rule,
        tasks: stage.tasks.map((task) =>
          visibleTask(
            task,
            completed.has(task.id) ? "done" : open.has(task.id) ? "open" : "skipped",
          ),
        ),
      };
    }

    return {
      id: stage.id,
      title: stage.title,
      state: ready ? "done" : "open",
      rule: stage.rule,
      tasks: stage.tasks.map((task) =>
        visibleTask(
          task,
          completed.has(task.id) ? "done" : open.has(task.id) ? "open" : "skipped",
        ),
      ),
    };
  });

  return {
    phase: phaseAt(hunt, now),
    completedCount: tasks.filter((task) => completed.has(task.id)).length,
    totalCount: tasks.length,
    prizeReady: ready,
    hiddenStepCount,
    stages,
  };
}

export function ruleHolds(rule: StageRule, taskCount: number): boolean {
  if (taskCount < 1) return false;
  if (rule.kind === "all") return true;
  return Number.isInteger(rule.n) && rule.n >= 1 && rule.n <= taskCount;
}
