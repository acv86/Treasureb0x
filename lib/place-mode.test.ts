import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyMapBased, canPublish, proximityFor } from "./hunt-schema";
import { PROXIMITY_METRES, resolveMapProvider, resolveProximity, withinProximity } from "./maps";
import { placeCopy, placeText } from "./place-copy";
import { HUNT_TEMPLATES, toHuntDraft } from "./templates";

function withPlaces(
  draft: ReturnType<typeof toHuntDraft>,
  location: { label: string; lat: number | null; lng: number | null },
) {
  return {
    ...draft,
    stages: draft.stages.map((stage) => ({
      ...stage,
      tasks: stage.tasks.map((task) => ({ ...task, location })),
    })),
  };
}

describe("place modes", () => {
  const dragon = toHuntDraft(HUNT_TEMPLATES[0], "en");

  it("publishes a written clue without a pin, and refuses an empty place", () => {
    assert.equal(dragon.mapBased, false);
    assert.equal(canPublish(dragon), false);
    const written = withPlaces(dragon, { label: "Under the oak by the gate", lat: null, lng: null });
    assert.equal(canPublish(written), true);
    written.stages[0].tasks[0].location = { label: "   ", lat: null, lng: null };
    assert.equal(canPublish(written), false);
  });

  it("keeps the written clue when map based is switched on, and then requires a pin", () => {
    const written = withPlaces(dragon, { label: "Under the oak by the gate", lat: null, lng: null });
    const mapped = applyMapBased(written, true);
    assert.equal(mapped.mapBased, true);
    assert.equal(mapped.proximity, false);
    assert.equal(mapped.stages[0].tasks[0].location?.label, "Under the oak by the gate");
    assert.equal(canPublish(mapped), false);

    const pinned = withPlaces(mapped, { label: "Under the oak by the gate", lat: 55.6761, lng: 12.5683 });
    assert.equal(canPublish(pinned), true);

    const back = applyMapBased(pinned, false);
    assert.equal(back.mapBased, false);
    assert.equal(back.stages[0].tasks[0].location?.label, "Under the oak by the gate");
    assert.equal(back.stages[0].tasks[0].location?.lat, 55.6761);
    assert.equal(canPublish(back), true);
  });

  it("offers the 100 m rule only for map-based hunts", () => {
    assert.deepEqual(resolveProximity(false, true), { enabled: false, metres: null });
    assert.deepEqual(resolveProximity(true, false), { enabled: false, metres: null });
    assert.deepEqual(resolveProximity(true, true), { enabled: true, metres: PROXIMITY_METRES });
    assert.equal(PROXIMITY_METRES, 100);

    const written = withPlaces(dragon, { label: "By the red door", lat: null, lng: null });
    assert.equal(canPublish({ ...written, proximity: true }), false);
    assert.deepEqual(proximityFor({ mapBased: false, proximity: true }), { enabled: false, metres: null });

    const pinned = applyMapBased(
      withPlaces(dragon, { label: "By the red door", lat: 55.6761, lng: 12.5683 }),
      true,
    );
    const withRule = { ...pinned, proximity: true };
    assert.deepEqual(proximityFor(withRule), { enabled: true, metres: 100 });
    assert.equal(canPublish(withRule), true);
    const cleared = applyMapBased(withRule, false);
    assert.equal(cleared.proximity, false);
    assert.deepEqual(proximityFor(cleared), { enabled: false, metres: null });

    const pin = { lat: 55.6761, lng: 12.5683 };
    assert.equal(withinProximity(pin, pin), true);
    assert.equal(withinProximity(pin, { lat: pin.lat + 40 / 111_320, lng: pin.lng }), true);
    assert.equal(withinProximity(pin, { lat: pin.lat + 250 / 111_320, lng: pin.lng }), false);
  });

  it("has the place prompts in English and Danish", () => {
    assert.equal(placeText("en", "wherePrompt"), "Where is this stage? Write a clue or place name.");
    assert.equal(placeText("da", "wherePrompt"), "Hvor er dette trin? Skriv et spor eller et stednavn.");
    assert.equal(placeText("en", "mapBased"), "Map based");
    assert.equal(placeText("da", "mapBased"), "Kortbaseret");
    for (const key of Object.keys(placeCopy) as (keyof typeof placeCopy)[]) {
      assert.ok(placeCopy[key].en.trim().length > 0, key);
      assert.ok(placeCopy[key].da.trim().length > 0, key);
    }
  });

  it("uses OpenStreetMap until a Google Maps key is set", () => {
    assert.equal(resolveMapProvider({}).id, "osm");
    assert.equal(resolveMapProvider({ googleMapsApiKey: "  " }).id, "osm");
    const google = resolveMapProvider({ googleMapsApiKey: "test-key" });
    assert.equal(google.id, "google");
    assert.equal(google.googleMapsApiKey, "test-key");
  });
});
