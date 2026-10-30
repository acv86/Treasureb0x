# Treasureb0x

A phone-shaped hunt app, and the first product proposed on top of Project OCP (a credential core aimed at Arbitrum, drafted in another repo).

You join a hunt with a code. You do a thing in the world. You type the code you found. The next step opens. At the end you keep a prize. Players do not pay, and the app does not take payment.

Underneath, first use quietly creates an id this phone can restore later. The screens do not ask anyone to learn a new vocabulary for that. **Every non-trivial choice in this repo is a proposal for Mr. A's decision committee, not a decision.** The list is `docs/DESIGN-DECISIONS.md`.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:38471](http://127.0.0.1:38471).

```bash
npm test
```

That checks the hunt rules (serial, parallel, hybrid) and the sponsored-action caps.

The product stub writes `data/store.json` on first use. That file is local and is not committed. Delete it to restore the three sample hunts and an empty pool.

## A short way through

1. **First use.** Any name, a 4–6 digit device code, write down the twelve words (or copy them), then confirm three words.
2. On Hunts, try **Harbour lanterns** (code `LANTERN`). The hints include the sample codes: `GREENGLASS`, then `THIRD`, then `FERRY`.
3. **Saturday market** (`MARKET`) is every step at once: `CRUST`, `STEM`, `NOON`.
4. **Old mill** (`MILL`) is two stages: `WHEEL` and `CREEK`, then either `DUST` or `BARLEY`.
5. **Create** walks the wizard. Review shows a covered private hunt, not a fee.
6. **Prizes** holds marks and the prize. **You** holds the id, backup words, hunts you made, text size, theme, and language.

Public events (`/organise`) are a placeholder: arranged on the website, per event or for the year, with no payment in the app.

## Why a web app, not Expo

This is proposal D1, not a decision.

Mr. A reviews in a browser. A native project would need a simulator before anyone could click. The product is allowed a backend, and the stub sits beside the screens. The backup words use the ordinary Ethereum path `m/44'/60'/0'/0/0`, so a later native app can restore the same id. The manifest lets a phone add the site to the home screen.

Stack: Next.js, TypeScript, Tailwind, shadcn/ui.

## What is real, and what is a stand-in

| Piece | In this draft |
| --- | --- |
| Backup words and the id | Generated in the browser. Not sent to the server. |
| Step codes | Checked by the product backend. Future step text is not sent until the step is open. |
| Credential core (OCP) | An interface with a mock. No node is called. Target named for later: Arbitrum Sepolia. |
| Sponsored actions | A ledger with a pool and per-device and per-hunt caps. Amounts, when shown, are ETH. |
| Payment | Not in the app. Private hunts are covered within a proposed allowance. |

Health: `GET /api/health` returns `{ "mode": "mock" }`.

## Docs

- `docs/PRODUCT.md` — flows as proposed.
- `docs/ARCHITECTURE.md` — modules, the OCP boundary, and questions that are still open.
- `docs/DESIGN-DECISIONS.md` — each proposal, the alternatives, the risks, and the status **PROPOSED — pending committee review**.

## Not in this draft

Live contracts, a real paymaster, editing a hunt after release, per-player codes, and any price. Those wait on the committee and on the OCP repository.
