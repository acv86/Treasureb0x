/**
 * Ready-made story hunts. English and Danish live side by side so a creator
 * can pick the language of the hunt, separate from the app language.
 * Locations are always empty: the creator names every spot.
 */

import type { StageRule, Structure } from "./domain";
import {
  STRUCTURE_TYPE_LABEL,
  type HuntDraft,
  type HuntTaskDraft,
  type SolutionMethod,
} from "./hunt-schema";

export const TEMPLATE_LANGS = ["en", "da"] as const;
export type TemplateLang = (typeof TEMPLATE_LANGS)[number];
export type AgeBand = "little" | "big";

export type LocalText = { en: string; da: string };

type Spot = {
  id: string;
  title: LocalText;
  story: LocalText;
  clue: LocalText;
  little?: LocalText;
  spot: LocalText;
  prompt?: LocalText;
  exampleCode: string;
  method: Extract<SolutionMethod, "code">;
};

type TemplateStage = {
  id: string;
  title: LocalText;
  rule: StageRule;
  spots: Spot[];
};

export type HuntTemplate = {
  id: string;
  structure: Structure;
  title: LocalText;
  blurb: LocalText;
  intro: LocalText;
  ending: LocalText;
  prizeTitle: LocalText;
  kids: boolean;
  personalise: ("name" | "age" | "dog")[];
  note?: LocalText;
  stages: TemplateStage[];
};

function t(en: string, da: string): LocalText {
  return { en, da };
}

function spot(
  id: string,
  title: LocalText,
  story: LocalText,
  clue: LocalText,
  exampleCode: string,
  place: LocalText,
  extra: { little?: LocalText; prompt?: LocalText } = {},
): Spot {
  return {
    id,
    title,
    story,
    clue,
    little: extra.little,
    spot: place,
    prompt: extra.prompt,
    exampleCode,
    method: "code",
  };
}

export const KIDS_SAFETY: LocalText = t(
  "Place every spot inside a garden or park a grown-up controls, away from roads, water, steep drops and strangers. A grown-up walks with the group.",
  "Læg hvert sted i en have eller park, som en voksen passer, væk fra veje, vand, bratte fald og fremmede. En voksen går med gruppen.",
);

const dragonEgg: HuntTemplate = {
  id: "dragon-egg",
  structure: "serial",
  kids: true,
  personalise: ["name", "age"],
  title: t("The Dragon Egg", "Dragens æg"),
  blurb: t("Warm an egg until it hatches.", "Varm et æg, til det klækker."),
  intro: t(
    "A baby dragon's egg is going cold, and only the birthday crew can warm it up in time. The mother dragon left warm words around town.",
    "Et lille drageæg er ved at blive koldt, og kun fødselsdagsholdet kan varme det op i tide. Dragemor har lagt varme ord rundt omkring.",
  ),
  ending: t(
    "The egg hatches, and the dragon says: Happy birthday, {name}! You are {age}!",
    "Ægget klækker, og dragen siger: Tillykke med fødselsdagen, {name}! Du er {age}!",
  ),
  prizeTitle: t("What the dragon brought", "Det dragen havde med"),
  stages: [
    {
      id: "path",
      title: t("The Dragon Egg", "Dragens æg"),
      rule: { kind: "all" },
      spots: [
        spot(
          "bark",
          t("Scaly bark", "Skællet bark"),
          t("Dragons love rough bark.", "Drager elsker ru bark."),
          t(
            "I'm tall, I'm green, my skin is rough. Under my branches is warm enough.",
            "Jeg er høj og grøn, og min hud er ru. Under mine grene er der varmt nok.",
          ),
          "SCALE",
          t("A big tree", "Et stort træ"),
          { little: t("Find the tree with skin like scales.", "Find træet med hud som skæl.") },
        ),
        spot(
          "nest",
          t("A nest up high", "En rede højt oppe"),
          t("The egg needs a nest, high and safe.", "Ægget har brug for en rede, højt og sikkert."),
          t(
            "Not in the grass, not on the ground, a place to sit where nests are found.",
            "Ikke i græsset, ikke på jorden. Et sted at sidde, hvor reder findes.",
          ),
          "NEST",
          t("A bench or a low wall", "En bænk eller en lav mur"),
          { little: t("Find a bench.", "Find en bænk.") },
        ),
        spot(
          "fire",
          t("Fire colour", "Ildens farve"),
          t("Dragon fire is red.", "Drageild er rød."),
          t("Find something red.", "Find noget rødt."),
          "FLAME",
          t("Something red", "Noget rødt"),
          { little: t("Find the red shape.", "Find den røde form.") },
        ),
        spot(
          "door",
          t("The dragon's door", "Dragens dør"),
          t("Knock on the dragon's door.", "Bank på dragens dør."),
          t("A number tells you where I am. Count the digits.", "Et tal viser, hvor jeg er. Tæl cifrene."),
          "EMBER",
          t("A door with a number", "En dør med et nummer"),
          { little: t("Find a door with a number on it.", "Find en dør med et tal på.") },
        ),
        spot(
          "home",
          t("Home", "Hjem"),
          t("The egg is glowing. Say the magic word together.", "Ægget lyser. Sig trylleordet sammen."),
          t("Find the card at the party place, and say the word together.", "Find kortet på feststedet, og sig ordet sammen."),
          "HATCH",
          t("The party place", "Feststedet"),
        ),
      ],
    },
  ],
};

const lastLetter: HuntTemplate = {
  id: "last-letter",
  structure: "serial",
  kids: false,
  personalise: [],
  title: t("The Last Letter", "Det sidste brev"),
  blurb: t("A letter that remembers, one spot at a time.", "Et brev der husker, ét sted ad gangen."),
  intro: t(
    "A letter addressed to whoever finds this is waiting at the first spot. The writer is not named.",
    "Et brev til den, der finder det, venter på det første sted. Afsenderen er ikke nævnt.",
  ),
  ending: t(
    "The writer was me. The real gift is handed over in person.",
    "Afsenderen var mig. Den rigtige gave gives personligt.",
  ),
  prizeTitle: t("A keepsake of the day", "Et minde fra dagen"),
  stages: [
    {
      id: "letters",
      title: t("The Last Letter", "Det sidste brev"),
      rule: { kind: "all" },
      spots: [
        spot(
          "meeting",
          t("The first meeting", "Det første møde"),
          t("This letter remembers the first time we talked.", "Dette brev husker første gang, vi talte sammen."),
          t("Find the card where you first talked, or on a bench nearby.", "Find kortet der, hvor I først talte sammen, eller på en bænk i nærheden."),
          "HELLO",
          t("Where you met, or a bench nearby", "Hvor I mødtes, eller en bænk i nærheden"),
          {
            prompt: t(
              "Where did we first talk, and what did you say that I still remember?",
              "Hvor talte vi først sammen, og hvad sagde du, som jeg stadig husker?",
            ),
          },
        ),
        spot(
          "laugh",
          t("A laugh", "Et grin"),
          t("This letter remembers a laugh we could not stop.", "Dette brev husker en latter, vi ikke kunne stoppe."),
          t("Find the card at the place of that laugh.", "Find kortet på stedet for den latter."),
          "LAUGH",
          t("The place you laughed", "Stedet hvor I grinede"),
          {
            prompt: t(
              "The moment we couldn't stop laughing. Where, and why?",
              "Øjeblikket hvor vi ikke kunne holde op med at grine. Hvor, og hvorfor?",
            ),
          },
        ),
        spot(
          "quarrel",
          t("A quarrel", "Et skænderi"),
          t("This letter remembers a small fight we are glad about now.", "Dette brev husker et lille skænderi, vi er glade for nu."),
          t("Find the card in a quiet corner.", "Find kortet i et stille hjørne."),
          "SORRY",
          t("A quiet corner", "Et stille hjørne"),
          {
            prompt: t(
              "A small fight we're glad about now. What did it teach me about you?",
              "Et lille skænderi vi er glade for nu. Hvad lærte det mig om dig?",
            ),
          },
        ),
        spot(
          "promise",
          t("A promise", "Et løfte"),
          t("This letter remembers a promise.", "Dette brev husker et løfte."),
          t("Find the card by a view or a door.", "Find kortet ved en udsigt eller en dør."),
          "FOREVER",
          t("A view or a door", "En udsigt eller en dør"),
          {
            prompt: t("A promise I made. Where did I say it?", "Et løfte jeg gav. Hvor sagde jeg det?"),
          },
        ),
        spot(
          "final",
          t("The final letter", "Det sidste brev"),
          t("This is the last letter. The word on the card is one only you would know.", "Dette er det sidste brev. Ordet på kortet er et, kun du kender."),
          t("Find the last card where someone is waiting, or beside the gift.", "Find det sidste kort, hvor nogen venter, eller ved gaven."),
          "YOURS",
          t("Where you will be waiting, or the gift", "Hvor du venter, eller gaven"),
          {
            prompt: t(
              "The word only you would know: a nickname or an inside joke.",
              "Ordet kun du kender: et kælenavn eller en intern spøg.",
            ),
          },
        ),
      ],
    },
  ],
};

const sneezingWizard: HuntTemplate = {
  id: "sneezing-wizard",
  structure: "parallel",
  kids: true,
  personalise: ["name"],
  title: t("The Sneezing Wizard", "Den nysende troldmand"),
  blurb: t("Find the spell pages in any order.", "Find tryllesiderne i vilkårlig rækkefølge."),
  intro: t(
    "A wizard sneezed, and his birthday spellbook blew all over town. Find the pages in any order.",
    "En troldmand nøs, og hans tryllebog til fødselsdagen blæste ud over byen. Find siderne i vilkårlig rækkefølge.",
  ),
  ending: t(
    "Shout the words on the pages, in number order, together. Happy birthday, {name}!",
    "Råb ordene på siderne, i nummerorden, sammen. Tillykke med fødselsdagen, {name}!",
  ),
  prizeTitle: t("The wizard's present", "Troldmandens gave"),
  stages: [
    {
      id: "pages",
      title: t("Spell pages", "Tryllesider"),
      rule: { kind: "all" },
      spots: [
        spot(
          "tree",
          t("A hiding tree", "Et gemmetræ"),
          t("One page caught in a tree.", "En side hang fast i et træ."),
          t("I've many arms but cannot hug.", "Jeg har mange arme, men kan ikke kramme."),
          "ABRA",
          t("A tree", "Et træ"),
          { little: t("A picture of a tree. Find that tree.", "Et billede af et træ. Find det træ.") },
        ),
        spot(
          "wet",
          t("A wet place", "Et vådt sted"),
          t("One page landed somewhere wet. The wizard says the cake spell is wearing off.", "En side landede et vådt sted. Troldmanden siger, at kagebesværgelsen er ved at gå af."),
          t("Find a tap, a puddle or a fountain. Never deep water.", "Find en hane, en pyt eller et springvand. Aldrig dybt vand."),
          "KADA",
          t("A tap, a puddle or a fountain", "En hane, en pyt eller et springvand"),
          { little: t("A picture of a splash. Find a little splash, not deep water.", "Et billede af et plask. Find et lille plask, ikke dybt vand.") },
        ),
        spot(
          "round",
          t("Something round", "Noget rundt"),
          t("One page blew onto something round.", "En side blæste hen på noget rundt."),
          t("Find a ball, a wheel or a pot.", "Find en bold, et hjul eller en gryde."),
          "BIRTH",
          t("A ball, a wheel or a pot", "En bold, et hjul eller en gryde"),
          { little: t("A picture of a circle. Find something round.", "Et billede af en cirkel. Find noget rundt.") },
        ),
        spot(
          "sign",
          t("A sign", "Et skilt"),
          t("One page stuck to a sign.", "En side klæbede til et skilt."),
          t("Find a sign with letters.", "Find et skilt med bogstaver."),
          "DAYS",
          t("Any sign with letters", "Et skilt med bogstaver"),
          { little: t("A picture of a sign. Find a sign.", "Et billede af et skilt. Find et skilt.") },
        ),
        spot(
          "gate",
          t("A gate", "En låge"),
          t("One page caught on a gate.", "En side hang fast i en låge."),
          t("Find a gate or a fence.", "Find en låge eller et hegn."),
          "CAKE",
          t("A gate or a fence", "En låge eller et hegn"),
          { little: t("A picture of a gate. Find a gate.", "Et billede af en låge. Find en låge.") },
        ),
        spot(
          "seat",
          t("A seat", "Et sæde"),
          t("The last page waits on a seat.", "Den sidste side venter på et sæde."),
          t("Find a bench or a step.", "Find en bænk eller et trin."),
          "POOF",
          t("A bench or a step", "En bænk eller et trin"),
          { little: t("A picture of a bench. Find a place to sit.", "Et billede af en bænk. Find et sted at sidde.") },
        ),
      ],
    },
  ],
};

const sixLocks: HuntTemplate = {
  id: "six-locks",
  structure: "parallel",
  kids: false,
  personalise: [],
  title: t("The Six Locks", "De seks låse"),
  blurb: t("Six locks, and any five open the vault.", "Seks låse, og fem af dem åbner boksen."),
  intro: t(
    "You have one afternoon to crack the vault. Six locks are scattered around town, and you can find them in any order.",
    "I har en eftermiddag til at knække boksen. Seks låse ligger spredt i byen, og I må finde dem i vilkårlig rækkefølge.",
  ),
  ending: t(
    "The vault opens. The loot is a small treat, and nobody has to buy anything.",
    "Boksen åbner. Byttet er en lille gave, og ingen skal købe noget.",
  ),
  prizeTitle: t("The loot", "Byttet"),
  note: t(
    "Any five codes open the prize in the app. Fix a real box to the five digits without the insider's sign. The sign is a clue, not a penalty.",
    "Fem koder åbner præmien i appen. Sæt en rigtig kasse til de fem cifre uden insiderens tegn. Tegnet er et spor, ikke en straf.",
  ),
  stages: [
    {
      id: "vault",
      title: t("The vault", "Boksen"),
      rule: { kind: "atLeast", n: 5 },
      spots: [
        spot(
          "camera",
          t("The camera", "Kameraet"),
          t("The first lock watches the street.", "Den første lås holder øje med gaden."),
          t("Find a sign with a camera, or a window.", "Find et skilt med et kamera, eller et vindue."),
          "LENS",
          t("A sign with a camera, or a window", "Et skilt med et kamera, eller et vindue"),
        ),
        spot(
          "guard",
          t("The guard post", "Vagtposten"),
          t("A guard would sit here.", "En vagt ville sidde her."),
          t("Find a bench.", "Find en bænk."),
          "GUARD",
          t("A bench", "En bænk"),
        ),
        spot(
          "back",
          t("The back door", "Bagdøren"),
          t("There is a way around the front door.", "Der er en vej uden om hoveddøren."),
          t("Find a side door.", "Find en sidedør."),
          "LATCH",
          t("A side door", "En sidedør"),
        ),
        spot(
          "alarm",
          t("The alarm", "Alarmen"),
          t("Something here ticks or rings.", "Noget her tikker eller ringer."),
          t("Find the thing that ticks or rings.", "Find det, der tikker eller ringer."),
          "BELL",
          t("Something that ticks or rings", "Noget der tikker eller ringer"),
        ),
        spot(
          "safe",
          t("The safe", "Pengeskabet"),
          t("The loot sits in a box.", "Byttet ligger i en kasse."),
          t("Find a box or a post box.", "Find en kasse eller en postkasse."),
          "SAFE",
          t("A box or a post box", "En kasse eller en postkasse"),
        ),
        spot(
          "inside",
          t("The inside job", "Insideren"),
          t("Trust the lock without the sign. The sign is a clue, not a trap.", "Stol på låsen uden tegnet. Tegnet er et spor, ikke en fælde."),
          t("Find the planted lock. It still takes its code.", "Find den plantede lås. Den tager stadig sin kode."),
          "PLANT",
          t("The planted lock, with a small sign beside the digit", "Den plantede lås, med et lille tegn ved cifret"),
        ),
      ],
    },
  ],
};

const captainBirthday: HuntTemplate = {
  id: "captain-birthday",
  structure: "hybrid",
  kids: true,
  personalise: ["name", "age"],
  title: t("Captain Birthday's Two Maps", "Kaptajn Fødselsdags to kort"),
  blurb: t("Two routes, then X marks the spot.", "To ruter, og så markerer X stedet."),
  intro: t(
    "The pirate captain left two halves of a treasure map, and the crew needs a new captain.",
    "Piratkaptajnen efterlod to halvdele af et skattekort. Mandskabet mangler en ny kaptajn.",
  ),
  ending: t(
    "The captain's hat is in the chest, and Captain {name}, age {age}, takes the crew.",
    "Kaptajnens hat ligger i kisten, og kaptajn {name}, {age} år, overtager mandskabet.",
  ),
  prizeTitle: t("The hat and the chest", "Hatten og kisten"),
  stages: [
    {
      id: "ship",
      title: t("The ship's things", "Skibets ting"),
      rule: { kind: "all" },
      spots: [
        spot(
          "rope",
          t("The rope", "Rebet"),
          t("The rope holds the ship.", "Rebet holder skibet."),
          t("Find a post or a railing.", "Find en pæl eller et rækværk."),
          "KNOT",
          t("A post or a railing", "En pæl eller et rækværk"),
          { little: t("A picture of a rope. Find a rope, a post or a railing.", "Et billede af et reb. Find et reb, en pæl eller et rækværk.") },
        ),
        spot(
          "flag",
          t("The flag", "Flaget"),
          t("The flag shows who sails here.", "Flaget viser, hvem der sejler her."),
          t("Find something that waves.", "Find noget, der blafrer."),
          "FLAG",
          t("Something that waves", "Noget der blafrer"),
        ),
        spot(
          "compass",
          t("The compass", "Kompasset"),
          t("The compass points the way.", "Kompasset peger vejen."),
          t("Find a sign or a signpost.", "Find et skilt eller en vejviser."),
          "NORTH",
          t("A sign or a signpost", "Et skilt eller en vejviser"),
        ),
      ],
    },
    {
      id: "fork",
      title: t("The crew chooses", "Mandskabet vælger"),
      rule: { kind: "atLeast", n: 1 },
      spots: [
        spot(
          "shark",
          t("Shark Bay", "Hajbugten"),
          t("Shark Bay is the brave route. The spot must be low, safe, and in view of a grown-up.", "Hajbugten er den modige rute. Stedet skal være lavt, sikkert og inden for en voksens synsvidde."),
          t("Run until your legs are loud.", "Løb, til benene larmer."),
          "FINS",
          t("A low wall or a small hill, in view of a grown-up", "En lav mur eller en lille bakke, hvor en voksen kan se det"),
        ),
        spot(
          "parrot",
          t("Parrot Cliffs", "Papegøjeklipperne"),
          t("Parrot Cliffs is the clever route.", "Papegøjeklipperne er den kloge rute."),
          t("I repeat all that you say.", "Jeg gentager alt, hvad du siger."),
          "POLLY",
          t("A spot for a riddle or an echo", "Et sted til en gåde eller et ekko"),
        ),
      ],
    },
    {
      id: "x",
      title: t("X marks the spot", "X marker stedet"),
      rule: { kind: "all" },
      spots: [
        spot(
          "treasure",
          t("X marks the spot", "X marker stedet"),
          t("Both routes meet at X.", "Begge ruter mødes ved X."),
          t("Find the card where X is.", "Find kortet, hvor X er."),
          "TREASURE",
          t("Where both routes meet", "Hvor begge ruter mødes"),
        ),
      ],
    },
  ],
};

const mayorsHat: HuntTemplate = {
  id: "mayors-hat",
  structure: "hybrid",
  kids: false,
  personalise: ["dog"],
  title: t("Who Took the Mayor's Hat?", "Hvem tog borgmesterens hat?"),
  blurb: t("Three witnesses, then one accusation.", "Tre vidner, og så en anklage."),
  intro: t(
    "The mayor's lucky hat is gone, and three witnesses are waiting around town.",
    "Borgmesterens lykkeshat er væk, og tre vidner venter rundt i byen.",
  ),
  ending: t(
    "It was the mayor's own dog, {dog}. The hat is the prize, and the game is free to play.",
    "Det var borgmesterens egen hund, {dog}. Hatten er præmien, og legen er gratis.",
  ),
  prizeTitle: t("The hat", "Hatten"),
  note: t(
    "A cafe can place the spots in and around the room. The baker can be the staff, with a wink. Nobody has to buy anything.",
    "En cafe kan lægge stederne i og omkring lokalet. Bageren kan være personalet, med et blink. Ingen skal købe noget.",
  ),
  stages: [
    {
      id: "witnesses",
      title: t("Witnesses", "Vidner"),
      rule: { kind: "all" },
      spots: [
        spot(
          "jogger",
          t("The jogger", "Joggeren"),
          t("The jogger saw something muddy.", "Joggeren så noget mudret."),
          t("Find the card by a bench.", "Find kortet ved en bænk."),
          "MUDDY",
          t("A bench", "En bænk"),
        ),
        spot(
          "shop",
          t("The shopkeeper", "Købmanden"),
          t("The shopkeeper saw a tail.", "Købmanden så en hale."),
          t("Find the card by a shop door.", "Find kortet ved en butiksdør."),
          "TAIL",
          t("A shop door", "En butiksdør"),
        ),
        spot(
          "child",
          t("The child", "Barnet"),
          t("The child heard a bark.", "Barnet hørte en gøen."),
          t("Find the card by a swing or a post.", "Find kortet ved en gynge eller en pæl."),
          "BARK",
          t("A swing or a post", "En gynge eller en pæl"),
        ),
      ],
    },
    {
      id: "accusation",
      title: t("The accusation", "Anklagen"),
      rule: { kind: "atLeast", n: 1 },
      spots: [
        spot(
          "baker",
          t("The baker", "Bageren"),
          t("The baker's counter has flour paw-prints.", "Bagerens disk har mel-poteaftryk."),
          t("Find the card at the counter.", "Find kortet ved disken."),
          "FLOUR",
          t("A counter", "En disk"),
        ),
        spot(
          "post",
          t("The postman", "Postbuddet"),
          t("The postman's round has a chewed letter.", "Postbuddets rute har et tygget brev."),
          t("Find the card on the round.", "Find kortet på ruten."),
          "STAMP",
          t("A stop on a round", "Et stop på en rute"),
        ),
      ],
    },
    {
      id: "culprit",
      title: t("The culprit", "Synderen"),
      rule: { kind: "all" },
      spots: [
        spot(
          "dog",
          t("The culprit", "Synderen"),
          t("The clue words point at the mayor's own dog.", "Sporordene peger på borgmesterens egen hund."),
          t("The code is the dog's name.", "Koden er hundens navn."),
          "BISCUIT",
          t("Where the dog would be", "Hvor hunden ville være"),
          {
            prompt: t(
              "Dog's name. Put that name in the code, so the card matches.",
              "Hundens navn. Skriv navnet i koden, så kortet passer.",
            ),
          },
        ),
      ],
    },
  ],
};

export const HUNT_TEMPLATES: readonly HuntTemplate[] = [
  dragonEgg,
  lastLetter,
  sneezingWizard,
  sixLocks,
  captainBirthday,
  mayorsHat,
];

export function templateById(id: string | null | undefined): HuntTemplate | undefined {
  return HUNT_TEMPLATES.find((template) => template.id === id);
}

export function templateOptionLabel(template: HuntTemplate, lang: TemplateLang = "en"): string {
  const name = template.title[lang] || template.title.en;
  return `${STRUCTURE_TYPE_LABEL[template.structure]}, ${name}`;
}

export function templateOptionLabels(lang: TemplateLang = "en"): string[] {
  return HUNT_TEMPLATES.map((template) => templateOptionLabel(template, lang));
}

function text(value: LocalText, lang: TemplateLang): string {
  return value[lang] || value.en;
}

function taskFromSpot(item: Spot, lang: TemplateLang, ageBand: AgeBand): HuntTaskDraft {
  const clue = ageBand === "little" && item.little ? item.little : item.clue;
  return {
    title: text(item.title, lang),
    story: text(item.story, lang),
    instruction: text(clue, lang),
    hint: "",
    method: item.method,
    code: item.exampleCode,
    location: null,
    prompt: item.prompt ? text(item.prompt, lang) : "",
    spotNote: text(item.spot, lang),
  };
}

/** A hunt draft with the story filled in and every location still empty. */
export function toHuntDraft(
  template: HuntTemplate,
  lang: TemplateLang,
  ageBand: AgeBand = "big",
): HuntDraft {
  const stages = template.stages.map((stage) => ({
    title: text(stage.title, lang),
    rule: stage.rule,
    tasks: stage.spots.map((item) => taskFromSpot(item, lang, ageBand)),
  }));

  const huntStages =
    template.structure === "serial"
      ? [
          {
            title: text(template.title, lang),
            rule: { kind: "all" as const },
            tasks: stages.flatMap((stage) => stage.tasks),
          },
        ]
      : stages;

  return {
    structure: template.structure,
    name: text(template.title, lang),
    description: text(template.intro, lang),
    prizeTitle: text(template.prizeTitle, lang),
    prizeAbout: text(template.ending, lang),
    mapBased: false,
    proximity: false,
    stages: huntStages,
  };
}

export type StoryFills = { name?: string; age?: string; dog?: string };

/** Swap {name}, {age} and {dog}. An empty age drops the age phrase. */
export function fillTokens(value: string, fills: StoryFills, lang: TemplateLang): string {
  const name = fills.name?.trim() || (lang === "da" ? "fødselsdagsbarnet" : "the birthday child");
  const dog = fills.dog?.trim() || (lang === "da" ? "hunden" : "the dog");
  const age = fills.age?.trim() ?? "";
  let out = value.replaceAll("{name}", name).replaceAll("{dog}", dog);
  if (age) {
    out = out.replaceAll("{age}", age);
  } else {
    out = out
      .replaceAll(/You are \{age\}!/g, "")
      .replaceAll(/Du er \{age\}!/g, "")
      .replaceAll(/, age \{age\},/g, "")
      .replaceAll(/, \{age\} år,/g, "")
      .replaceAll("{age}", "");
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([!.?])/g, "$1").trim();
}
