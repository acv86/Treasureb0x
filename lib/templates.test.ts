import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStepCode } from "./codes";
import {
  canPublish,
  huntSchema,
  missingLocations,
  sentenceCount,
  validateHunt,
  type HuntDraft,
  type SpotLocation,
} from "./hunt-schema";
import {
  HUNT_TEMPLATES,
  fillTokens,
  templateOptionLabel,
  templateOptionLabels,
  toHuntDraft,
  type TemplateLang,
} from "./templates";

const ENGLISH_LABELS = [
  "Serial, The Dragon Egg",
  "Serial, The Last Letter",
  "Parallel, The Sneezing Wizard",
  "Parallel, The Six Locks",
  "Hybrid, Captain Birthday's Two Maps",
  "Hybrid, Who Took the Mayor's Hat?",
];

const DANISH_TITLES = [
  "Dragens æg",
  "Det sidste brev",
  "Den nysende troldmand",
  "De seks låse",
  "Kaptajn Fødselsdags to kort",
  "Hvem tog borgmesterens hat?",
];

function pinAll(draft: HuntDraft, label = "The old oak"): HuntDraft {
  const location: SpotLocation = { label, lat: null, lng: null };
  return {
    ...draft,
    stages: draft.stages.map((stage) => ({
      ...stage,
      tasks: stage.tasks.map((task) => ({ ...task, location })),
    })),
  };
}

describe("hunt templates", () => {
  it("loads all six, two of each shape", () => {
    assert.equal(HUNT_TEMPLATES.length, 6);
    assert.equal(new Set(HUNT_TEMPLATES.map((template) => template.id)).size, 6);
    assert.equal(HUNT_TEMPLATES.filter((template) => template.structure === "serial").length, 2);
    assert.equal(HUNT_TEMPLATES.filter((template) => template.structure === "parallel").length, 2);
    assert.equal(HUNT_TEMPLATES.filter((template) => template.structure === "hybrid").length, 2);
  });

  it("names each menu option as type, name", () => {
    assert.deepEqual(templateOptionLabels("en"), ENGLISH_LABELS);
    for (const label of templateOptionLabels("en")) {
      assert.match(label, /^(Serial|Parallel|Hybrid), .+/);
    }
    HUNT_TEMPLATES.forEach((template, index) => {
      assert.equal(template.title.da, DANISH_TITLES[index]);
      assert.equal(templateOptionLabel(template, "da"), `Serial, ${DANISH_TITLES[index]}`.replace(/^Serial/, labelType(template.structure)));
      assert.match(templateOptionLabel(template, "da"), /^(Serial|Parallel|Hybrid), .+/);
    });
  });

  it("is valid against the hunt schema in English and Danish", () => {
    assert.deepEqual(huntSchema.methods, ["code", "choice", "qr"]);
    for (const template of HUNT_TEMPLATES) {
      for (const lang of ["en", "da"] as TemplateLang[]) {
        for (const band of template.kids ? (["big", "little"] as const) : (["big"] as const)) {
          const draft = toHuntDraft(template, lang, band);
          assert.deepEqual(validateHunt(draft), [], `${template.id} ${lang} ${band}`);
          for (const task of draft.stages.flatMap((stage) => stage.tasks)) {
            assert.equal(task.method, "code");
            assert.equal(isStepCode(task.code), true, task.code);
            assert.ok(sentenceCount(task.story) <= 2, task.story);
            assert.ok(task.story.trim().length > 0);
          }
        }
      }
    }
  });

  it("starts with empty stage locations and refuses to publish until they are set", () => {
    for (const template of HUNT_TEMPLATES) {
      const draft = toHuntDraft(template, "en");
      const spots = draft.stages.flatMap((stage) => stage.tasks);
      assert.ok(spots.length >= 3, template.id);
      assert.equal(spots.every((task) => task.location === null), true, template.id);
      assert.ok(missingLocations(draft) === spots.length);
      assert.equal(canPublish(draft), false);

      const placed = pinAll(draft);
      assert.equal(missingLocations(placed), 0);
      assert.equal(canPublish(placed), true);

      placed.stages[0].tasks[0].location = null;
      assert.equal(canPublish(placed), false);
    }
  });

  it("keeps the Dragon Egg in order, the locks at five of six, and both forks", () => {
    const dragon = toHuntDraft(HUNT_TEMPLATES[0], "en");
    assert.deepEqual(
      dragon.stages[0].tasks.map((task) => task.title),
      ["Scaly bark", "A nest up high", "Fire colour", "The dragon's door", "Home"],
    );
    assert.equal(dragon.structure, "serial");
    assert.equal(dragon.stages.length, 1);

    const locks = toHuntDraft(HUNT_TEMPLATES[3], "en");
    assert.equal(locks.structure, "parallel");
    assert.deepEqual(locks.stages[0].rule, { kind: "atLeast", n: 5 });
    assert.equal(locks.stages[0].tasks.length, 6);

    const captain = toHuntDraft(HUNT_TEMPLATES[4], "en");
    assert.equal(captain.structure, "hybrid");
    assert.equal(captain.stages.length, 3);
    assert.deepEqual(captain.stages[0].rule, { kind: "all" });
    assert.equal(captain.stages[0].tasks.length, 3);
    assert.deepEqual(captain.stages[1].rule, { kind: "atLeast", n: 1 });
    assert.equal(captain.stages[1].tasks.length, 2);
    assert.equal(captain.stages[2].tasks.length, 1);

    const mayor = toHuntDraft(HUNT_TEMPLATES[5], "da");
    assert.equal(mayor.name, "Hvem tog borgmesterens hat?");
    assert.deepEqual(mayor.stages[1].rule, { kind: "atLeast", n: 1 });
    assert.equal(mayor.stages[1].tasks.length, 2);
  });

  it("lets little explorers hear a different clue without a new code", () => {
    const big = toHuntDraft(HUNT_TEMPLATES[0], "en", "big");
    const little = toHuntDraft(HUNT_TEMPLATES[0], "en", "little");
    assert.notEqual(big.stages[0].tasks[0].instruction, little.stages[0].tasks[0].instruction);
    assert.equal(big.stages[0].tasks[0].code, little.stages[0].tasks[0].code);
  });

  it("leaves choice and photo methods in the schema, unpublished for now", () => {
    const draft = pinAll(toHuntDraft(HUNT_TEMPLATES[0], "en"));
    assert.equal(canPublish(draft), true);
    draft.stages[0].tasks[0].method = "qr";
    assert.deepEqual(validateHunt(draft), []);
    assert.equal(canPublish(draft), false);
    draft.stages[0].tasks[0].method = "choice";
    draft.stages[0].tasks[0].code = "";
    assert.deepEqual(validateHunt(draft), []);
    assert.equal(canPublish(draft), false);
  });

  it("fills a birthday name and drops an empty age", () => {
    const ending = toHuntDraft(HUNT_TEMPLATES[0], "en").prizeAbout;
    assert.match(fillTokens(ending, { name: "Sam", age: "7" }, "en"), /Happy birthday, Sam! You are 7!/);
    assert.match(fillTokens(ending, { name: "Sam" }, "en"), /Happy birthday, Sam!/);
    assert.doesNotMatch(fillTokens(ending, { name: "Sam" }, "en"), /\{age\}|You are/);
    const danish = toHuntDraft(HUNT_TEMPLATES[4], "da").prizeAbout;
    assert.match(fillTokens(danish, { name: "Ida" }, "da"), /kaptajn Ida overtager/);
    assert.doesNotMatch(fillTokens(danish, { name: "Ida" }, "da"), /år/);
  });
});

function labelType(structure: "serial" | "parallel" | "hybrid"): string {
  if (structure === "serial") return "Serial";
  if (structure === "parallel") return "Parallel";
  return "Hybrid";
}
