import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPrizeMetadata,
  buildPrizeSvg,
  escapeXml,
  imageFromTokenUri,
  layoutPrizeTitle,
  prizeImageForCredential,
  prizeTokenUri,
  resolvePrizeImage,
  sanitizeTitle,
} from "./prize-image";

const DANISH = "Mathildes 9-års fødselsdag – Dragens Æg";

function assertWellFormedSvg(svg: string) {
  assert.match(svg, /<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /\bwidth="1000"/);
  assert.match(svg, /\bheight="1000"/);
  assert.match(svg, /\bviewBox="0 0 1000 1000"/);
  assert.equal(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(svg), false);
  const withoutEntities = svg.replace(/&(?:amp|lt|gt|quot|apos);/g, "");
  assert.equal(withoutEntities.includes("&"), false);
  const tags = svg.match(/<\/?[^>]+>/g) ?? [];
  const stack: string[] = [];
  for (const tag of tags) {
    if (tag.startsWith("<?")) continue;
    if (tag.startsWith("</")) {
      const name = /^<\/\s*([A-Za-z0-9]+)/.exec(tag)?.[1];
      assert.equal(stack.pop(), name);
      continue;
    }
    const name = /^<\s*([A-Za-z0-9]+)/.exec(tag)?.[1];
    assert.ok(name);
    if (!tag.endsWith("/>")) stack.push(name);
  }
  assert.deepEqual(stack, []);
  assert.match(svg, /<\/svg>\s*$/);
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function watermarkText(svg: string): string {
  return [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((match) => decodeXml(match[1] ?? "")).join(" ");
}

function fontSize(svg: string): number {
  return Number(/font-size="([\d.]+)"/.exec(svg)?.[1]);
}

describe("prize image text", () => {
  it("escapes SVG and XML special characters", () => {
    const title = `Fish & Chips <gold> "best" 'år'`;
    const svg = buildPrizeSvg(title);
    assertWellFormedSvg(svg);
    assert.match(svg, /Fish &amp; Chips &lt;gold&gt; &quot;best&quot; &apos;år&apos;/);
    assert.equal(svg.includes("<gold>"), false);
    assert.equal(svg.includes('"best"'), false);
    assert.equal(watermarkText(svg), title);
    assert.equal(escapeXml(`a&b<c>d"e'f`), "a&amp;b&lt;c&gt;d&quot;e&apos;f");
  });

  it("drops characters XML cannot store and keeps the rest readable", () => {
    assert.equal(sanitizeTitle("Hi\u0000\u0007 there"), "Hi there");
    const svg = buildPrizeSvg("Line\none\tand\u0001 two");
    assertWellFormedSvg(svg);
    assert.equal(watermarkText(svg), "Line one and two");
  });

  it("keeps a long title inside the square by wrapping and scaling", () => {
    const title = "The Great Midsummer Treasure Hunt Along the Old Stone Harbour";
    const layout = layoutPrizeTitle(title);
    const svg = buildPrizeSvg(title);
    assertWellFormedSvg(svg);
    assert.ok(layout.lines.length >= 2);
    assert.ok(layout.lines.length <= 3);
    assert.ok(layout.fontSize >= 36);
    assert.ok(layout.fontSize <= 90);
    assert.equal(watermarkText(svg), title);
    assert.equal((svg.match(/<tspan /g) ?? []).length, layout.lines.length);
  });

  it("still emits valid SVG when a title has no spaces and will not fit", () => {
    const title = "W".repeat(180);
    const svg = buildPrizeSvg(title);
    assertWellFormedSvg(svg);
    const text = watermarkText(svg);
    assert.ok(text.endsWith("…"));
    assert.ok(text.length < title.length);
    assert.equal(fontSize(svg), 36);
  });

  it("prints a short title in one large line", () => {
    const svg = buildPrizeSvg("Cup");
    assertWellFormedSvg(svg);
    assert.equal((svg.match(/<tspan /g) ?? []).length, 1);
    assert.ok(fontSize(svg) >= 96);
    assert.equal(watermarkText(svg), "Cup");
  });

  it("keeps Danish letters and emoji as themselves", () => {
    const svg = buildPrizeSvg(DANISH);
    assertWellFormedSvg(svg);
    assert.equal(watermarkText(svg), DANISH);
    assert.match(svg, /fødselsdag/);
    assert.match(svg, /Æg/);
    assert.equal(svg.includes("&#"), false);

    const emoji = "Birthday 🎂 æøå";
    const marked = buildPrizeSvg(emoji);
    assertWellFormedSvg(marked);
    assert.equal(watermarkText(marked), emoji);
    assert.match(marked, /🎂/);
  });
});

describe("prize metadata", () => {
  it("includes the default image data URI", () => {
    const metadata = buildPrizeMetadata({
      name: "Harbour light",
      description: "You walked the whole quay.",
      huntTitle: "Harbour lanterns",
    });
    assert.equal(metadata.name, "Harbour light");
    assert.equal(metadata.description, "You walked the whole quay.");
    assert.match(metadata.image, /^data:image\/svg\+xml;base64,/);

    const tokenURI = prizeTokenUri({
      name: "Harbour light",
      description: "You walked the whole quay.",
      huntTitle: "Harbour lanterns",
    });
    assert.match(tokenURI, /^data:application\/json;base64,/);
    assert.equal(imageFromTokenUri(tokenURI), metadata.image);

    const svg = Buffer.from(metadata.image.slice(metadata.image.indexOf(",") + 1), "base64").toString("utf8");
    assertWellFormedSvg(svg);
    assert.equal(watermarkText(svg), "Harbour lanterns");
  });

  it("lets a custom image replace the default", () => {
    const custom = "https://example.com/prizes/dragon.png";
    const metadata = buildPrizeMetadata({
      name: "Dragon egg",
      description: "The egg is yours.",
      huntTitle: DANISH,
      customImage: custom,
    });
    assert.equal(metadata.image, custom);
    assert.equal(imageFromTokenUri(prizeTokenUri({
      name: "Dragon egg",
      description: "The egg is yours.",
      huntTitle: DANISH,
      customImage: `  ${custom}  `,
    })), custom);

    const fallback = resolvePrizeImage({ huntTitle: "Cup", customImage: "javascript:alert(1)" });
    assert.match(fallback, /^data:image\/svg\+xml;base64,/);
    assert.equal(resolvePrizeImage({ huntTitle: "Cup", customImage: "   " }).startsWith("data:image/svg+xml"), true);
  });

  it("reads a minted picture and otherwise rebuilds the default", () => {
    const tokenURI = prizeTokenUri({
      name: "Egg",
      description: "Kept.",
      huntTitle: DANISH,
    });
    assert.equal(
      prizeImageForCredential({ tokenURI, huntTitle: "other", customImage: "https://example.com/x.png" }),
      imageFromTokenUri(tokenURI),
    );
    const rebuilt = prizeImageForCredential({ huntTitle: "Cup" });
    assert.match(rebuilt, /^data:image\/svg\+xml;base64,/);
    assert.equal(imageFromTokenUri("not-a-token"), null);
    assert.equal(imageFromTokenUri(undefined), null);
  });
});
