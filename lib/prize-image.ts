/**
 * Default prize NFT art.
 *
 * Every prize uses one square SVG until a hunt stores its own image.
 * The picture is a data URI, so token metadata can carry it without a host.
 * Pass `customImage` (an https URL or data:image URI) to replace the default.
 */

const SIZE = 1000;
const BOX = 780;
const MIN_FONT = 36;
const MAX_FONT = 108;
const MAX_LINES = 3;

const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFE\uFFFF]/g;

export type PrizeNftMetadata = {
  name: string;
  description: string;
  image: string;
};

export type PrizeImageInput = {
  /** Drawn across the default picture. This is the hunt title, not the prize name. */
  huntTitle: string;
  /** When set, this replaces the generated picture. */
  customImage?: string | null;
};

export function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sanitizeTitle(title: string): string {
  return title.replace(/[\u0000-\u001F\u007F\uFFFE\uFFFF]/g, " ").replace(/\s+/g, " ").trim();
}

function charUnits(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code === 0x20) return 0.34;
  if (code > 0xffff || (code >= 0x1f000 && code <= 0x1faff)) return 1.2;
  if (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xff00 && code <= 0xff60)
  ) {
    return 1.05;
  }
  if (code === 0x2013 || code === 0x2014) return 0.95;
  if ("ilIjtfr.,:;!'|".includes(char)) return 0.36;
  if ("mwMW@#%&GOQD".includes(char)) return 0.86;
  return 0.62;
}

function textUnits(text: string): number {
  let units = 0;
  for (const char of text) units += charUnits(char);
  return units;
}

function wrapTitle(
  text: string,
  maxUnits: number,
  maxLines: number,
  ellipsis: boolean,
): { lines: string[]; rest: string } {
  const chars = [...text];
  const lines: string[] = [];
  let index = 0;

  while (index < chars.length && lines.length < maxLines) {
    const last = lines.length === maxLines - 1;
    const remaining = chars.slice(index).join("");
    if (!last && textUnits(remaining) <= maxUnits) {
      lines.push(remaining);
      index = chars.length;
      break;
    }

    const overflow = textUnits(remaining) > maxUnits;
    const budget = last && ellipsis && overflow ? Math.max(1, maxUnits - textUnits("…")) : maxUnits;
    let units = 0;
    let take = 0;
    let breakAt = -1;
    while (index + take < chars.length) {
      const char = chars[index + take];
      const next = units + charUnits(char);
      if (next > budget && take > 0) break;
      units = next;
      take += 1;
      if (!last && char === " ") breakAt = take;
    }

    const endedMidWord = index + take < chars.length && chars[index + take - 1] !== " ";
    if (!last && endedMidWord && breakAt > 0) take = breakAt;

    let piece = chars.slice(index, index + take).join("").trim();
    if (!piece) {
      piece = chars[index] ?? "";
      take = Math.max(take, 1);
    }
    index += take;
    while (chars[index] === " ") index += 1;

    if (last && index < chars.length && ellipsis) piece = `${piece}…`;
    if (piece) lines.push(piece);
    if (last) break;
  }

  return { lines, rest: chars.slice(index).join("").trim() };
}

export function layoutPrizeTitle(title: string): { lines: string[]; fontSize: number } {
  const clean = sanitizeTitle(title);
  if (!clean) return { lines: [], fontSize: MAX_FONT };

  for (let fontSize = MAX_FONT; fontSize >= MIN_FONT; fontSize -= 1) {
    const wrapped = wrapTitle(clean, BOX / fontSize, MAX_LINES, false);
    const fits = wrapped.lines.every((line) => textUnits(line) <= BOX / fontSize + 0.05);
    if (!wrapped.rest && wrapped.lines.length > 0 && fits) {
      return { lines: wrapped.lines, fontSize };
    }
  }

  const forced = wrapTitle(clean, BOX / MIN_FONT, MAX_LINES, true);
  return { lines: forced.lines, fontSize: MIN_FONT };
}

type Coin = { x: number; y: number; r: number; turn?: number };

function coins(specs: Coin[]): string {
  return specs
    .map((coin) => {
      const ry = coin.r * (coin.turn ? 0.46 : 0.9);
      const turn = coin.turn ?? 0;
      const star = coin.turn
        ? ""
        : `<path d="M0 ${(-coin.r * 0.28).toFixed(1)} L ${(coin.r * 0.1).toFixed(1)} ${(-coin.r * 0.08).toFixed(1)} L ${(coin.r * 0.3).toFixed(1)} 0 L ${(coin.r * 0.1).toFixed(1)} ${(coin.r * 0.08).toFixed(1)} L 0 ${(coin.r * 0.28).toFixed(1)} L ${(-coin.r * 0.1).toFixed(1)} ${(coin.r * 0.08).toFixed(1)} L ${(-coin.r * 0.3).toFixed(1)} 0 L ${(-coin.r * 0.1).toFixed(1)} ${(-coin.r * 0.08).toFixed(1)} Z" fill="#fff6d4" opacity="0.9"/>`;
      return `<g transform="translate(${coin.x} ${coin.y}) rotate(${turn})">
        <ellipse cx="0" cy="${(coin.r * 0.18).toFixed(1)}" rx="${coin.r}" ry="${ry.toFixed(1)}" fill="#4a280c" opacity="0.28"/>
        <ellipse cx="0" cy="0" rx="${coin.r}" ry="${ry.toFixed(1)}" fill="url(#coinFace)" stroke="#a56b14" stroke-width="3"/>
        <ellipse cx="0" cy="0" rx="${(coin.r * 0.7).toFixed(1)}" ry="${(ry * 0.68).toFixed(1)}" fill="none" stroke="#fff1c2" stroke-width="2.5" opacity="0.92"/>
        <ellipse cx="${(-coin.r * 0.28).toFixed(1)}" cy="${(-ry * 0.32).toFixed(1)}" rx="${(coin.r * 0.26).toFixed(1)}" ry="${(ry * 0.16).toFixed(1)}" fill="#fffaf0" opacity="0.5"/>
        ${star}
      </g>`;
    })
    .join("");
}

function watermark(lines: string[], fontSize: number): string {
  if (lines.length === 0) return "";
  const lineEm = 1.16;
  const firstDy = -((lines.length - 1) * lineEm) / 2;
  const stroke = Math.max(6, Math.round(fontSize * 0.085));
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? firstDy.toFixed(3) : lineEm.toFixed(3);
      return `<tspan x="500" dy="${dy}em">${escapeXml(line)}</tspan>`;
    })
    .join("");
  return `<g transform="rotate(-22 500 530)">
    <text x="500" y="530" text-anchor="middle" font-family="'Noto Sans', 'DejaVu Sans', 'Noto Color Emoji', sans-serif" font-weight="700" font-size="${fontSize}" fill="#fff8e7" fill-opacity="0.55" stroke="#3a1d0b" stroke-opacity="0.84" stroke-width="${stroke}" stroke-linejoin="round" paint-order="stroke fill" text-rendering="geometricPrecision">${tspans}</text>
  </g>`;
}

const BACK_COINS: Coin[] = [
  { x: 168, y: 860, r: 40 },
  { x: 230, y: 900, r: 46 },
  { x: 770, y: 900, r: 46 },
  { x: 832, y: 858, r: 38 },
  { x: 200, y: 820, r: 30 },
  { x: 800, y: 818, r: 30 },
];

const MOUTH_COINS: Coin[] = [
  { x: 372, y: 748, r: 30 },
  { x: 628, y: 748, r: 30 },
  { x: 318, y: 772, r: 24 },
  { x: 682, y: 770, r: 24 },
];

const FRONT_COINS: Coin[] = [
  { x: 150, y: 930, r: 42 },
  { x: 250, y: 955, r: 50 },
  { x: 370, y: 968, r: 54 },
  { x: 500, y: 972, r: 56 },
  { x: 630, y: 966, r: 54 },
  { x: 750, y: 950, r: 48 },
  { x: 860, y: 920, r: 40 },
  { x: 310, y: 915, r: 34 },
  { x: 450, y: 928, r: 36 },
  { x: 590, y: 920, r: 34 },
  { x: 700, y: 908, r: 30 },
  { x: 210, y: 900, r: 28, turn: -32 },
  { x: 800, y: 890, r: 28, turn: 30 },
];

function scene(): string {
  return `
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
  <ellipse cx="500" cy="930" rx="340" ry="70" fill="#3a1c0c" opacity="0.28"/>
  ${coins(BACK_COINS)}
  <g>
    <path d="M235 748 A265 268 0 0 1 765 748 L724 748 A220 214 0 0 0 276 748 Z" fill="url(#woodLid)"/>
    <path d="M235 748 A265 268 0 0 1 765 748" fill="none" stroke="url(#goldMetal)" stroke-width="22" stroke-linecap="round"/>
    <path d="M286 748 A214 206 0 0 1 714 748" fill="none" stroke="#fff1c4" stroke-width="4" opacity="0.75"/>
    <circle cx="268" cy="690" r="9" fill="url(#goldMetal)" stroke="#6a4010" stroke-width="2"/>
    <circle cx="332" cy="548" r="9" fill="url(#goldMetal)" stroke="#6a4010" stroke-width="2"/>
    <circle cx="430" cy="458" r="9" fill="url(#goldMetal)" stroke="#6a4010" stroke-width="2"/>
    <circle cx="500" cy="428" r="9" fill="url(#goldMetal)" stroke="#6a4010" stroke-width="2"/>
    <circle cx="570" cy="458" r="9" fill="url(#goldMetal)" stroke="#6a4010" stroke-width="2"/>
    <circle cx="668" cy="548" r="9" fill="url(#goldMetal)" stroke="#6a4010" stroke-width="2"/>
    <circle cx="732" cy="690" r="9" fill="url(#goldMetal)" stroke="#6a4010" stroke-width="2"/>
  </g>
  <ellipse cx="500" cy="760" rx="214" ry="48" fill="#2c160c"/>
  <ellipse cx="500" cy="752" rx="176" ry="32" fill="#8a5418"/>
  <ellipse cx="500" cy="746" rx="140" ry="18" fill="#f6d56a" opacity="0.55"/>
  ${coins(MOUTH_COINS)}
  <g transform="translate(0 96)">
    <path d="M392 338 C330 322 308 410 330 462 C346 500 392 508 418 482 L404 458 C386 474 358 466 348 436 C334 396 352 360 396 362 Z" fill="url(#goldMetal)"/>
    <path d="M608 338 C670 322 692 410 670 462 C654 500 608 508 582 482 L596 458 C614 474 642 466 652 436 C666 396 648 360 604 362 Z" fill="url(#goldMetal)"/>
    <path d="M392 292 C384 292 372 348 384 412 C400 490 448 528 500 534 C552 528 600 490 616 412 C628 348 616 292 608 292 Z" fill="url(#goldCup)"/>
    <path d="M430 330 C422 390 438 460 478 498" fill="none" stroke="#fffaf0" stroke-width="16" stroke-linecap="round" opacity="0.72"/>
    <ellipse cx="500" cy="294" rx="116" ry="28" fill="url(#goldMetal)"/>
    <ellipse cx="500" cy="290" rx="96" ry="16" fill="#6b3e12" opacity="0.45"/>
    <ellipse cx="500" cy="286" rx="96" ry="14" fill="none" stroke="#fff6d8" stroke-width="3"/>
    <path d="M478 524 L522 524 L536 640 L464 640 Z" fill="url(#goldMetal)"/>
    <ellipse cx="500" cy="636" rx="86" ry="18" fill="#c8922a"/>
    <path d="M408 628 H592 C610 628 616 642 616 656 V678 C616 700 560 712 500 712 C440 712 384 700 384 678 V656 C384 642 390 628 408 628 Z" fill="url(#goldMetal)"/>
    <ellipse cx="500" cy="630" rx="100" ry="16" fill="#fff3c8" opacity="0.88"/>
    <path d="M392 668 H608" stroke="#fff6d8" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
  </g>
  <g>
    <path d="M248 760 C236 760 232 784 246 808 L292 910 C330 968 670 968 708 910 L754 808 C768 784 764 760 752 760 Z" fill="url(#wood)"/>
    <path d="M360 790 C358 860 362 900 368 940" fill="none" stroke="#3a1c0e" stroke-width="4" opacity="0.2" stroke-linecap="round"/>
    <path d="M500 778 V948" fill="none" stroke="#3a1c0e" stroke-width="4" opacity="0.16"/>
    <path d="M640 790 C642 860 638 900 632 940" fill="none" stroke="#3a1c0e" stroke-width="4" opacity="0.2" stroke-linecap="round"/>
    <path d="M310 830 H690" stroke="#f0d0a4" stroke-width="3" opacity="0.16" stroke-linecap="round"/>
    <path d="M228 742 H772 C786 742 790 758 784 774 L754 812 H246 L216 774 C210 758 214 742 228 742 Z" fill="url(#goldMetal)"/>
    <path d="M268 800 H732" stroke="url(#goldMetal)" stroke-width="18" stroke-linecap="round"/>
    <path d="M292 868 H708" stroke="url(#goldMetal)" stroke-width="14" stroke-linecap="round"/>
    <rect x="458" y="812" width="84" height="92" rx="14" fill="url(#goldMetal)" stroke="#6a4010" stroke-width="3"/>
    <circle cx="500" cy="846" r="14" fill="#3b220e"/>
    <path d="M492 846 H508 L504 878 H496 Z" fill="#3b220e"/>
  </g>
  ${coins(FRONT_COINS)}
  <path d="M180 250 L188 232 L196 250 L214 258 L196 266 L188 284 L180 266 L162 258 Z" fill="#fff8e4" opacity="0.9"/>
  <path d="M800 240 L806 226 L812 240 L826 246 L812 252 L806 266 L800 252 L786 246 Z" fill="#fff8e4" opacity="0.75"/>
  <path d="M150 430 L156 418 L162 430 L174 436 L162 442 L156 454 L150 442 L138 436 Z" fill="#fff8e4" opacity="0.55"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#vignette)"/>
  <rect x="22" y="22" width="956" height="956" rx="48" fill="none" stroke="#fff1c8" stroke-width="6" opacity="0.45"/>`;
}

function defs(): string {
  return `<defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#ffe7a6"/>
      <stop offset="32%" stop-color="#f0b03e"/>
      <stop offset="64%" stop-color="#c56a20"/>
      <stop offset="100%" stop-color="#4a2412"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="36%" r="34%">
      <stop offset="0%" stop-color="#fff6d4" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#ffd56a" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#ffd56a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="46%" r="74%">
      <stop offset="58%" stop-color="#2a1208" stop-opacity="0"/>
      <stop offset="100%" stop-color="#2a1208" stop-opacity="0.5"/>
    </radialGradient>
    <linearGradient id="goldMetal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8a5a10"/>
      <stop offset="16%" stop-color="#fff3c4"/>
      <stop offset="40%" stop-color="#f0c14b"/>
      <stop offset="68%" stop-color="#c48a22"/>
      <stop offset="100%" stop-color="#7a4e0c"/>
    </linearGradient>
    <linearGradient id="goldCup" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a56b12"/>
      <stop offset="22%" stop-color="#fff6d0"/>
      <stop offset="48%" stop-color="#e8b23a"/>
      <stop offset="74%" stop-color="#c48a1c"/>
      <stop offset="100%" stop-color="#8a5810"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c48448"/>
      <stop offset="38%" stop-color="#8a4e28"/>
      <stop offset="100%" stop-color="#4e2814"/>
    </linearGradient>
    <linearGradient id="woodLid" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#6b3a1e"/>
      <stop offset="100%" stop-color="#d49258"/>
    </linearGradient>
    <radialGradient id="coinFace" cx="35%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#fffce8"/>
      <stop offset="42%" stop-color="#f0c14b"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </radialGradient>
  </defs>`;
}

/** Square SVG of the default prize, with the hunt title watermarked across it. */
export function buildPrizeSvg(huntTitle: string): string {
  const clean = sanitizeTitle(huntTitle);
  const layout = layoutPrizeTitle(clean);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img">
  <title>${escapeXml(clean || "Prize")}</title>
  ${defs()}
  ${scene()}
  ${watermark(layout.lines, layout.fontSize)}
</svg>`;
}

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function decodeUtf8Base64(payload: string): string {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}

export function prizeSvgDataUri(huntTitle: string): string {
  return `data:image/svg+xml;base64,${utf8ToBase64(buildPrizeSvg(huntTitle))}`;
}

/** https URL or a raster/SVG data URI. Anything else is ignored. */
export function normalizeCustomPrizeImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200_000) return null;
  if (/^https:\/\/\S+$/i.test(trimmed)) return trimmed;
  if (/^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)[;,]/i.test(trimmed)) return trimmed;
  return null;
}

/** The picture that should be stored and shown. Custom art wins when it is usable. */
export function resolvePrizeImage(input: PrizeImageInput): string {
  const custom = normalizeCustomPrizeImage(input.customImage);
  if (custom) return custom;
  return prizeSvgDataUri(input.huntTitle);
}

export function buildPrizeMetadata(input: PrizeImageInput & { name: string; description: string }): PrizeNftMetadata {
  return {
    name: input.name,
    description: input.description,
    image: resolvePrizeImage(input),
  };
}

/** ERC-721 style tokenURI: a JSON data URI whose `image` is the prize picture. */
export function prizeTokenUri(input: PrizeImageInput & { name: string; description: string }): string {
  return `data:application/json;base64,${utf8ToBase64(JSON.stringify(buildPrizeMetadata(input)))}`;
}

export function imageFromTokenUri(tokenURI: string | null | undefined): string | null {
  if (!tokenURI?.startsWith("data:application/json")) return null;
  try {
    const comma = tokenURI.indexOf(",");
    if (comma < 0) return null;
    const header = tokenURI.slice(0, comma);
    const payload = tokenURI.slice(comma + 1);
    const json = /;base64/i.test(header) ? decodeUtf8Base64(payload) : decodeURIComponent(payload);
    const parsed = JSON.parse(json) as { image?: unknown };
    return typeof parsed.image === "string" && parsed.image ? parsed.image : null;
  } catch {
    return null;
  }
}

/** Prefer the picture baked into a minted token. Otherwise build the current default. */
export function prizeImageForCredential(input: PrizeImageInput & { tokenURI?: string | null }): string {
  return imageFromTokenUri(input.tokenURI) ?? resolvePrizeImage(input);
}
