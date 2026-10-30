import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  openTaskIds,
  playerView,
  prizeReady,
  type HuntShape,
  type Stage,
} from "./domain";

function task(id: string) {
  return { id, title: id, instruction: `do ${id}`, hint: null };
}

function stage(id: string, tasks: string[], rule: Stage["rule"]): Stage {
  return { id, title: id, rule, tasks: tasks.map(task) };
}

function hunt(
  structure: HuntShape["structure"],
  stages: Stage[],
  extra: Partial<HuntShape> = {},
): HuntShape {
  return { structure, status: "live", startsAt: null, endsAt: null, stages, ...extra };
}

describe("serial hunts", () => {
  const shape = hunt("serial", [stage("only", ["a", "b", "c"], { kind: "all" })]);

  it("reveals only the first step", () => {
    const view = playerView(shape, [], 0);
    assert.deepEqual(
      view.stages[0].tasks.map((t) => t.id),
      ["a"],
    );
    assert.equal(view.stages[0].tasks[0].instruction, "do a");
    assert.equal(view.hiddenStepCount, 2);
    assert.equal(view.prizeReady, false);
  });

  it("reveals the next step only after the previous one", () => {
    const view = playerView(shape, ["a"], 0);
    assert.deepEqual(
      view.stages[0].tasks.map((t) => [t.id, t.state]),
      [
        ["a", "done"],
        ["b", "open"],
      ],
    );
    assert.equal(view.hiddenStepCount, 1);
    assert.deepEqual(openTaskIds(shape, new Set(["a"])), ["b"]);
  });

  it("is ready for the prize when every step is done", () => {
    assert.equal(prizeReady(shape, new Set(["a", "b", "c"])), true);
    const view = playerView(shape, ["a", "b", "c"], 0);
    assert.equal(view.prizeReady, true);
    assert.equal(view.hiddenStepCount, 0);
  });
});

describe("parallel hunts", () => {
  const shape = hunt("parallel", [stage("only", ["a", "b", "c"], { kind: "atLeast", n: 2 })]);

  it("shows every step at once", () => {
    const view = playerView(shape, [], 0);
    assert.equal(view.stages[0].tasks.length, 3);
    assert.equal(view.hiddenStepCount, 0);
    assert.deepEqual(openTaskIds(shape, new Set()), ["a", "b", "c"]);
  });

  it("is ready at the chosen number and closes the rest", () => {
    assert.equal(prizeReady(shape, new Set(["a", "c"])), true);
    const view = playerView(shape, ["a", "c"], 0);
    const skipped = view.stages[0].tasks.find((t) => t.id === "b");
    assert.equal(skipped?.state, "skipped");
    assert.equal(skipped?.title, "b");
    assert.deepEqual(openTaskIds(shape, new Set(["a", "c"])), []);
  });
});

describe("hybrid hunts", () => {
  const shape = hunt("hybrid", [
    stage("yard", ["a", "b"], { kind: "all" }),
    stage("inside", ["c", "d"], { kind: "atLeast", n: 1 }),
  ]);

  it("hides later stages", () => {
    const view = playerView(shape, [], 0);
    assert.equal(view.stages[0].state, "open");
    assert.equal(view.stages[1].state, "locked");
    assert.equal(view.stages[1].title, null);
    assert.equal(view.stages[1].tasks.length, 0);
    assert.equal(view.hiddenStepCount, 2);
  });

  it("opens the next stage when the rule is met", () => {
    const view = playerView(shape, ["a", "b"], 0);
    assert.equal(view.stages[0].state, "done");
    assert.equal(view.stages[1].state, "open");
    assert.equal(view.stages[1].title, "inside");
    assert.equal(prizeReady(shape, new Set(["a", "b"])), false);
    assert.equal(prizeReady(shape, new Set(["a", "b", "d"])), true);
  });
});

describe("time window", () => {
  it("marks a hunt ended after the window", () => {
    const shape = hunt("serial", [stage("only", ["a"], { kind: "all" })], {
      endsAt: "2020-01-01T00:00:00.000Z",
    });
    const view = playerView(shape, [], Date.parse("2026-01-01T00:00:00.000Z"));
    assert.equal(view.phase, "ended");
  });
});
