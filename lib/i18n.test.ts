import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LANGUAGES, copy, formatDateTime, t, type CopyKey, type Lang } from "./i18n";
import { SAMPLE_JOIN_CODES, localizeSample, sampleHunt } from "./sample-text";

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("languages share one set of strings", () => {
  const ids = LANGUAGES.map((language) => language.id);

  it("includes Danish beside the other languages", () => {
    assert.ok(ids.includes("da"));
    assert.equal(new Set(ids).size, ids.length);
  });

  it("gives every language the same keys and the same placeholders", () => {
    const keys = Object.keys(copy) as CopyKey[];
    assert.ok(keys.length > 0);
    for (const key of keys) {
      const pack = copy[key];
      assert.deepEqual(
        (Object.keys(pack) as Lang[]).sort(),
        [...ids].sort(),
        key,
      );
      for (const id of ids) {
        assert.ok(pack[id].trim().length > 0, `${key} ${id}`);
        assert.deepEqual(placeholders(pack[id]), placeholders(pack.en), `${key} ${id}`);
      }
    }
  });

  it("does not leave Danish as a copy of English", () => {
    assert.notEqual(copy.tagline.da, copy.tagline.en);
    assert.equal(t("da", "hello", { name: "Maja" }), "Hej, Maja");
    assert.equal(t("da", "ofSteps", { done: 1, total: 3 }), "1 af 3");
  });

  it("formats counts and dates in the chosen language", () => {
    assert.equal(t("da", "players", { n: 1000 }), "1.000 spillere");
    assert.equal(t("en", "players", { n: 1000 }), "1,000 players");
    assert.equal(t("da", "players", { n: 3 }), "3 spillere");
    assert.equal(formatDateTime("da", "2026-10-30T15:04"), "30. okt. 2026, 15.04");
    assert.equal(formatDateTime("en", "2026-10-30T15:04"), "Oct 30, 2026, 3:04 PM");
    assert.equal(formatDateTime("da", ""), "…");
    assert.equal(formatDateTime("da", "not-a-date"), "not-a-date");
  });
});

describe("sample hunts", () => {
  it("uses the same steps in English and Danish, and keeps the codes", () => {
    const seed = readFileSync(new URL("./server/seed.ts", import.meta.url), "utf8");
    for (const code of SAMPLE_JOIN_CODES) {
      const english = sampleHunt("en", code);
      const danish = sampleHunt("da", code);
      if (!english || !danish) throw new Error(`missing sample ${code}`);
      assert.notEqual(danish.name, english.name);
      assert.deepEqual(Object.keys(danish.stages), Object.keys(english.stages));
      for (const value of [
        english.name,
        english.description,
        english.creatorName,
        english.prizeTitle,
        english.prizeDescription,
      ]) {
        assert.ok(seed.includes(value), value);
      }
      for (const [stageId, englishStage] of Object.entries(english.stages)) {
        const danishStage: typeof englishStage | undefined = danish.stages[stageId];
        if (!danishStage) throw new Error(stageId);
        assert.ok(seed.includes(englishStage.title));
        assert.deepEqual(Object.keys(danishStage.tasks), Object.keys(englishStage.tasks));
        for (const [taskId, englishTask] of Object.entries(englishStage.tasks)) {
          const danishTask = danishStage.tasks[taskId];
          if (!danishTask) throw new Error(taskId);
          assert.ok(seed.includes(englishTask.title), englishTask.title);
          assert.ok(seed.includes(englishTask.instruction));
          assert.notEqual(danishTask.title, englishTask.title);
          const found = englishTask.hint.match(/is ([A-Z]+)\./);
          assert.ok(found);
          assert.ok(danishTask.hint.includes(found[1]));
          assert.ok(seed.includes(found[1]));
        }
      }
    }
  });

  it("shows Danish sample wording and leaves hidden steps hidden", () => {
    const shown = localizeSample("da", {
      joinCode: "LANTERN",
      sample: true,
      name: "Harbour lanterns",
      description: "A dusk walk along the quay. Three codes, one after another.",
      creatorName: "Sample hunts",
      prize: { title: "Harbour light", description: "You walked the whole quay." },
      stages: [
        {
          id: "lantern_stage",
          title: "The quay",
          tasks: [
            {
              id: "lantern_green",
              title: "The green lantern",
              instruction: "Walk the quay until you find the lantern with green glass, by the fish stall.",
              hint: "Sample hunt: the code you would find here is GREENGLASS.",
            },
            { id: "lantern_bench", title: null, instruction: null, hint: null },
          ],
        },
      ],
    });
    assert.equal(shown.name, "Havnens lanterner");
    assert.equal(shown.creatorName, "Eksempeljagter");
    assert.equal(shown.prize.title, "Havnens lys");
    assert.equal(shown.stages[0].title, "Kajen");
    assert.equal(shown.stages[0].tasks[0].title, "Den grønne lanterne");
    assert.match(shown.stages[0].tasks[0].hint ?? "", /GREENGLASS/);
    assert.equal(shown.stages[0].tasks[1].title, null);
    assert.equal(shown.stages[0].tasks[1].hint, null);
  });

  it("leaves a hunt someone wrote, and languages without a sample translation, as stored", () => {
    const own = localizeSample("da", { joinCode: "LANTERN", sample: false, name: "Harbour lanterns" });
    assert.equal(own.name, "Harbour lanterns");
    const french = localizeSample("fr", { joinCode: "MARKET", sample: true, name: "Saturday market" });
    assert.equal(french.name, "Saturday market");
  });
});
