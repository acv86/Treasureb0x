"use client";

import { LANGUAGES, isLang } from "@/lib/i18n";
import { useApp, useT } from "@/components/providers";
import type { FontSize, ThemeName } from "@/lib/identity";

export function Appearance() {
  const { prefs, setPrefs } = useApp();
  const tr = useT();

  const theme = (value: ThemeName) => setPrefs({ ...prefs, theme: value });
  const font = (value: FontSize) => setPrefs({ ...prefs, font: value });

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg">{tr("appearance")}</h2>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted-foreground">{tr("language")}</span>
        <select
          className="h-12 w-full rounded-2xl border border-input bg-card px-3 text-base"
          value={isLang(prefs.lang) ? prefs.lang : "en"}
          onChange={(event) => setPrefs({ ...prefs, lang: event.target.value })}
        >
          {LANGUAGES.map((language) => (
            <option key={language.id} value={language.id}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{tr("theme")}</p>
        <div className="grid grid-cols-3 gap-2">
          {(["light", "dark", "colorful"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => theme(item)}
              aria-pressed={prefs.theme === item}
              className="h-11 rounded-full border border-border bg-card text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {tr(item)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{tr("textSize")}</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["s", "small"],
              ["m", "medium"],
              ["l", "large"],
            ] as const
          ).map(([value, key]) => (
            <button
              key={value}
              type="button"
              onClick={() => font(value)}
              aria-pressed={prefs.font === value}
              className="h-11 rounded-full border border-border bg-card text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {tr(key)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
