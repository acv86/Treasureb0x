# Treasureb0x — proposed architecture

This is the shape of the draft, not a decision. Proposals and the alternatives behind them are in `docs/DESIGN-DECISIONS.md`. Each one is **PROPOSED — pending committee review**.

Project OCP is the credential core, drafted in another repository. Treasureb0x is the first product on top of it. The core is meant to stay free of a backend. This product is not.

```
phone  →  Next.js screens
            │  signs create / join / unlock / claim / end
            ▼
        product backend (this repo, file store)
            │  hides future steps, checks codes, counts allowance
            │  asks the relayer stub, then the OCP client
            ▼
        OcpClient  →  mock today
                       Arbitrum Sepolia (chain id 421614) when a real client exists
```

## Modules

| Path | Role |
| --- | --- |
| `lib/domain.ts` | Hunt rules: what is visible, what is open, when the prize is ready. Pure, tested. |
| `lib/relayer.ts` | Sponsored-action ledger and caps. Pure, tested. |
| `lib/ocp/types.ts` | The only door to Project OCP. |
| `lib/server/ocp-mock.ts` | Stand-in. No network call. |
| `lib/server/actions.ts` | Join, unlock, claim, create, end. |
| `lib/server/store.ts` | `data/store.json`, created on first use. Not committed. |
| `lib/identity.ts` | Backup words, device-code encryption, signatures. Browser only. |
| `app/api/*` | HTTP stub. |

`npm test` runs the hunt rules and the relayer caps.

## Identity

Proposed path: `m/44'/60'/0'/0/0`, one id for every b0x app.

The twelve words are generated with the English word list, encrypted on the device, and never posted. The backend sees the id and a signature. A signed message is:

```
Treasureb0x
action:<action>
hunt:<code>
task:<id or empty>
code:<sha256 of the step code, or empty>
at:<ISO time>
```

The signature must be within five minutes. Reads are not signed in this draft (proposal D17).

## OCP interface

```ts
publishHunt({ huntId, creator, structure, taskCount }) → { txHash }
mintMark({ holder, huntId, taskId, title, description }) → credential
mintPrize({ holder, huntId, title, description }) → credential
```

The mock stores the credential in the product file so the Prizes screen survives a refresh. Replacing the mock should not require a screen change. The method names are a guess until the other repository publishes its own interface.

The player never sees a transaction id.

## Relayer stub

Integers are micro-ETH (1e-6 ETH), so the ledger does not use floating point.

| Cap | Proposed amount |
| --- | --- |
| House pool | 0.05 ETH |
| Per device | 0.002 ETH |
| Per hunt | 0.01 ETH |
| One action (create, unlock, or claim) | 0.00004 ETH |

Join is free. A refused action does not record a mark. Device ids are a random id in local storage, not a hardware attestation.

## What the backend stores

Hunts, including step text and, for this draft, the plaintext step code beside its hash. Progress, attempt counts, and lockout times. Mock credentials. The relayer ledger.

It does not store backup words or device codes.

## What happens if the backend disappears

Already recorded marks and prizes would still be on OCP, once OCP is real. Hidden instructions and code checks would stop. The core would still be usable for anything that does not need those secrets. That split is the point of the interface, and it is unproven until a real client exists.

## Questions for Mr. A

These are not proposals. The draft does not pick them.

1. Which items in `docs/DESIGN-DECISIONS.md` should the committee keep, change, or drop? In particular D6 (one shared id), D7 (where the words live), D8 (how frank the loss warning is), D10 (backend code check), D13 (allowance numbers), D14 (pool and caps), and D18 (plaintext codes).
2. When the OCP repository lands, which of `publishHunt` / `mintMark` / `mintPrize` match it, and which must change?
3. What should a player see when the house pool is empty in the middle of a hunt? This draft refuses the step.
4. Should a mark exist per step, or only the prize? Both are recorded today.
5. Is a 4–6 digit device code acceptable until prizes have real-world value, or does the warning need to be stronger before any public test?
6. Commercial price, VAT, and prize rules are untouched here, on purpose. The pricing report left the price open and asked for a lawyer before valuable prizes. This app still has no price.
7. Arbitrum One is Stage 1 on L2BEAT, not Stage 2. Is “test on Sepolia, aim at Arbitrum” the sentence to use until that changes?
8. If a later b0x app is installed by someone who never opened Treasureb0x, is “enter the same backup words” the whole story?
9. Who is told when the pool runs low, and who refills it?
10. Minors may play. Nothing in this draft checks age.

## Out of scope for this draft

Live contracts, a real paymaster, biometrics, push notifications, editing a hunt after it is created, per-player codes, payment, and the Pass / treasury / upgrade questions that belong to OCP.
