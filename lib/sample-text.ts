import type { Lang } from "./i18n";

/**
 * Sample hunts are authored in English in the store.
 * A language gets its own wording here when we have one.
 * Codes stay as written, because players type them.
 */

type TaskText = {
  title: string;
  instruction: string;
  hint: string;
};

type StageText = {
  title: string;
  tasks: Record<string, TaskText>;
};

type HuntText = {
  name: string;
  description: string;
  creatorName: string;
  prizeTitle: string;
  prizeDescription: string;
  stages: Record<string, StageText>;
};

function hint(lang: "en" | "da", code: string): string {
  if (lang === "da") return `Eksempeljagt: koden, du ville finde her, er ${code}.`;
  return `Sample hunt: the code you would find here is ${code}.`;
}

function hunt(
  lang: "en" | "da",
  text: Omit<HuntText, "stages"> & {
    stages: Record<string, { title: string; tasks: Record<string, { title: string; instruction: string; code: string }> }>;
  },
): HuntText {
  const stages: Record<string, StageText> = {};
  for (const [stageId, stage] of Object.entries(text.stages)) {
    const tasks: Record<string, TaskText> = {};
    for (const [taskId, task] of Object.entries(stage.tasks)) {
      tasks[taskId] = {
        title: task.title,
        instruction: task.instruction,
        hint: hint(lang, task.code),
      };
    }
    stages[stageId] = { title: stage.title, tasks };
  }
  return {
    name: text.name,
    description: text.description,
    creatorName: text.creatorName,
    prizeTitle: text.prizeTitle,
    prizeDescription: text.prizeDescription,
    stages,
  };
}

const english: Record<string, HuntText> = {
  LANTERN: hunt("en", {
    name: "Harbour lanterns",
    description: "A dusk walk along the quay. Three codes, one after another.",
    creatorName: "Sample hunts",
    prizeTitle: "Harbour light",
    prizeDescription: "You walked the whole quay.",
    stages: {
      lantern_stage: {
        title: "The quay",
        tasks: {
          lantern_green: {
            title: "The green lantern",
            instruction: "Walk the quay until you find the lantern with green glass, by the fish stall.",
            code: "GREENGLASS",
          },
          lantern_bench: {
            title: "The third bench",
            instruction: "Count the benches that face the water. Read the plaque on the third.",
            code: "THIRD",
          },
          lantern_bell: {
            title: "The ferry bell",
            instruction: "Look under the rim of the bell by the ferry steps.",
            code: "FERRY",
          },
        },
      },
    },
  }),
  MARKET: hunt("en", {
    name: "Saturday market",
    description: "Three stalls, in any order. Finish all three.",
    creatorName: "Sample hunts",
    prizeTitle: "Market morning",
    prizeDescription: "You made the whole round of the square.",
    stages: {
      market_stage: {
        title: "The square",
        tasks: {
          market_baker: {
            title: "Baker's stamp",
            instruction: "The round loaf is wrapped in paper with a stamp.",
            code: "CRUST",
          },
          market_flower: {
            title: "White flowers",
            instruction: "The bucket of white flowers has a tag tied to the handle.",
            code: "STEM",
          },
          market_clock: {
            title: "The stopped clock",
            instruction: "The clock over the square has stopped. Read the card beneath it.",
            code: "NOON",
          },
        },
      },
    },
  }),
  MILL: hunt("en", {
    name: "Old mill",
    description: "The yard first. Then one room inside.",
    creatorName: "Sample hunts",
    prizeTitle: "Miller's key",
    prizeDescription: "The mill let you through.",
    stages: {
      mill_yard: {
        title: "The yard",
        tasks: {
          mill_wheel: {
            title: "The wheel",
            instruction: "The wheel's hub has a word cut into the wood.",
            code: "WHEEL",
          },
          mill_board: {
            title: "The notice",
            instruction: "A notice is pinned where the path meets the creek.",
            code: "CREEK",
          },
        },
      },
      mill_inside: {
        title: "Inside",
        tasks: {
          mill_loft: {
            title: "The loft",
            instruction: "Dust on the loft stair hides a word.",
            code: "DUST",
          },
          mill_cellar: {
            title: "The cellar",
            instruction: "A sack in the cellar still has its label.",
            code: "BARLEY",
          },
        },
      },
    },
  }),
};

const danish: Record<string, HuntText> = {
  LANTERN: hunt("da", {
    name: "Havnens lanterner",
    description: "En tur langs kajen i skumringen. Tre koder, én efter én.",
    creatorName: "Eksempeljagter",
    prizeTitle: "Havnens lys",
    prizeDescription: "Du gik hele kajen.",
    stages: {
      lantern_stage: {
        title: "Kajen",
        tasks: {
          lantern_green: {
            title: "Den grønne lanterne",
            instruction: "Gå langs kajen, til du finder lanternen med grønt glas ved fiskeboden.",
            code: "GREENGLASS",
          },
          lantern_bench: {
            title: "Den tredje bænk",
            instruction: "Tæl bænkene, der vender ud mod vandet. Læs skiltet på den tredje.",
            code: "THIRD",
          },
          lantern_bell: {
            title: "Færgeklokken",
            instruction: "Kig under kanten på klokken ved færgetrappen.",
            code: "FERRY",
          },
        },
      },
    },
  }),
  MARKET: hunt("da", {
    name: "Lørdagsmarked",
    description: "Tre boder, i vilkårlig rækkefølge. Gør alle tre færdige.",
    creatorName: "Eksempeljagter",
    prizeTitle: "Markedsmorgen",
    prizeDescription: "Du gik hele turen rundt på pladsen.",
    stages: {
      market_stage: {
        title: "Pladsen",
        tasks: {
          market_baker: {
            title: "Bagerens stempel",
            instruction: "Det runde brød er pakket ind i papir med et stempel.",
            code: "CRUST",
          },
          market_flower: {
            title: "Hvide blomster",
            instruction: "Spanden med hvide blomster har en seddel bundet om hanken.",
            code: "STEM",
          },
          market_clock: {
            title: "Uret, der står stille",
            instruction: "Uret over pladsen er gået i stå. Læs kortet under det.",
            code: "NOON",
          },
        },
      },
    },
  }),
  MILL: hunt("da", {
    name: "Den gamle mølle",
    description: "Først gården. Så ét rum indenfor.",
    creatorName: "Eksempeljagter",
    prizeTitle: "Møllerens nøgle",
    prizeDescription: "Møllen lukkede dig ind.",
    stages: {
      mill_yard: {
        title: "Gården",
        tasks: {
          mill_wheel: {
            title: "Hjulet",
            instruction: "I hjulets nav er der skåret et ord i træet.",
            code: "WHEEL",
          },
          mill_board: {
            title: "Opslaget",
            instruction: "Der hænger et opslag, hvor stien møder bækken.",
            code: "CREEK",
          },
        },
      },
      mill_inside: {
        title: "Indenfor",
        tasks: {
          mill_loft: {
            title: "Loftet",
            instruction: "Støvet på trappen op til loftet skjuler et ord.",
            code: "DUST",
          },
          mill_cellar: {
            title: "Kælderen",
            instruction: "En sæk i kælderen har stadig sin seddel.",
            code: "BARLEY",
          },
        },
      },
    },
  }),
};

const byLang: Partial<Record<Lang, Record<string, HuntText>>> = {
  en: english,
  da: danish,
};

export const SAMPLE_JOIN_CODES = Object.keys(english);

export function sampleHunt(lang: string, joinCode: string): HuntText | null {
  const pack = byLang[lang as Lang] ?? byLang.en;
  return pack?.[joinCode] ?? english[joinCode] ?? null;
}

function stringsOf(text: HuntText): string[] {
  const values = [text.name, text.description, text.creatorName, text.prizeTitle, text.prizeDescription];
  for (const stage of Object.values(text.stages)) {
    values.push(stage.title);
    for (const task of Object.values(stage.tasks)) {
      values.push(task.title, task.instruction, task.hint);
    }
  }
  return values;
}

function translatedString(lang: string, joinCode: string, value: string): string {
  if (!value) return value;
  const source = english[joinCode];
  const target = byLang[lang as Lang]?.[joinCode];
  if (!source || !target || target === source) return value;
  const from = stringsOf(source);
  const to = stringsOf(target);
  const index = from.indexOf(value);
  return index === -1 ? value : to[index];
}

type StageLike = {
  id: string;
  title: string | null;
  tasks: {
    id: string;
    title: string | null;
    instruction?: string | null;
    hint?: string | null;
  }[];
};

type SampleSurface = {
  joinCode: string;
  sample?: boolean;
  name?: string;
  description?: string;
  creatorName?: string;
  title?: string;
  huntName?: string;
  prize?: { title: string; description: string };
  stages?: StageLike[];
};

/** Swap in the chosen language for a known sample. Hidden text stays hidden. */
export function localizeSample<T extends SampleSurface>(lang: string, item: T): T {
  if (item.sample === false) return item;
  const target = byLang[lang as Lang]?.[item.joinCode];
  if (!target) return item;
  const next: SampleSurface = { ...item };
  if (typeof item.name === "string") next.name = translatedString(lang, item.joinCode, item.name);
  if (typeof item.description === "string") next.description = translatedString(lang, item.joinCode, item.description);
  if (typeof item.creatorName === "string") next.creatorName = translatedString(lang, item.joinCode, item.creatorName);
  if (typeof item.title === "string") next.title = translatedString(lang, item.joinCode, item.title);
  if (typeof item.huntName === "string") next.huntName = translatedString(lang, item.joinCode, item.huntName);
  if (item.prize) {
    next.prize = {
      title: translatedString(lang, item.joinCode, item.prize.title),
      description: translatedString(lang, item.joinCode, item.prize.description),
    };
  }
  if (item.stages) {
    next.stages = item.stages.map((stage) => {
      const stageText = target.stages[stage.id];
      return {
        ...stage,
        title: stage.title && stageText ? stageText.title : stage.title,
        tasks: stage.tasks.map((task) => {
          const taskText = stageText?.tasks[task.id];
          if (!taskText) return task;
          return {
            ...task,
            title: task.title ? taskText.title : task.title,
            instruction: task.instruction ? taskText.instruction : task.instruction,
            hint: task.hint ? taskText.hint : task.hint,
          };
        }),
      };
    });
  }
  return next as T;
}
