import type { TemplateLang } from "./templates";

/** Place and map wording. The hunt language picks the side, separate from the app language. */
export const placeCopy = {
  mapBased: { en: "Map based", da: "Kortbaseret" },
  mapBasedHelp: {
    en: "Off: you write a clue or a place name for each stage. On: you pin every stage on a map.",
    da: "Fra: du skriver et spor eller et stednavn til hvert trin. Til: du sætter en nål for hvert trin på et kort.",
  },
  wherePrompt: {
    en: "Where is this stage? Write a clue or place name.",
    da: "Hvor er dette trin? Skriv et spor eller et stednavn.",
  },
  whereMissing: { en: "Place missing", da: "Stedet mangler" },
  wherePlaceholder: { en: "Under the old bench", da: "Under den gamle bænk" },
  pinPrompt: { en: "Pin this stage on the map.", da: "Sæt en nål på kortet for dette trin." },
  pinMissing: { en: "Pin missing", da: "Nålen mangler" },
  tapMap: { en: "Tap the map to drop the pin.", da: "Tryk på kortet for at sætte nålen." },
  noteLabel: { en: "Note", da: "Note" },
  noteHelp: {
    en: "The written clue stays as a note.",
    da: "Det skrevne spor bliver stående som en note.",
  },
  proximity: { en: "100 m rule", da: "100 m-reglen" },
  proximityHelp: {
    en: "Only for map-based hunts. A code counts when the player is within 100 metres of the pin.",
    da: "Kun for kortbaserede jagter. En kode tæller, når spilleren er inden for 100 meter af nålen.",
  },
  textNeeded: {
    en: "Write where every stage is before you publish.",
    da: "Skriv hvor hvert trin er, før du udgiver.",
  },
  pinNeeded: {
    en: "Pin every stage on the map before you publish.",
    da: "Sæt en nål for hvert trin, før du udgiver.",
  },
  placeLabel: { en: "Place", da: "Sted" },
  googlePending: {
    en: "A Google Maps key is set. This is the drop-in point for that map. Until it is connected, enter latitude and longitude.",
    da: "En Google Maps-nøgle er sat. Her kan det kort sættes ind. Indtil da kan du skrive bredde- og længdegrad.",
  },
  latitude: { en: "Latitude", da: "Breddegrad" },
  longitude: { en: "Longitude", da: "Længdegrad" },
} as const;

export type PlaceCopyKey = keyof typeof placeCopy;

export function placeText(lang: TemplateLang, key: PlaceCopyKey): string {
  return placeCopy[key][lang] || placeCopy[key].en;
}
