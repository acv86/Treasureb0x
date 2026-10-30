# Design proposals for committee review

Nothing in this draft is a decision. Each item below is a proposal the prototype implements so Mr. A can click through it. The committee can keep, change, or drop any of them.

**Status on every item: PROPOSED — pending committee review.**

Where an earlier chat suggested something else, that alternative is listed. The prototype follows the later notes in the project brief and the pricing report only as a starting point for review, not as a lock.

## D1. Installable mobile web app, not a native app

**Proposal.** Treasureb0x is a phone-shaped web app (Next.js, TypeScript, Tailwind) with a web app manifest, so it can be added to a home screen. It runs in the browser for this review.

**Alternatives.** Expo / React Native. A native shell later (the same screens wrapped). A desktop-first site.

**Reasoning.** Mr. A has a short review window and a browser. A native build would need a simulator or a store. The product is allowed a backend, and route handlers live next to the screens. The keys use the same backup words a later native app could restore.

**Risks.** A home-screen web app is not an App Store app. Background refresh, push, and secure hardware storage are weaker than in a native app. Apple's rules still matter if a native wrapper is added later.

## D2. One repository for the screens and a product-backend stub

**Proposal.** The app and a small product backend live in this repo. The credential core (Project OCP) stays behind an interface and is mocked.

**Alternatives.** Screens only, with a fake client store. A separate backend service. Putting hunt rules inside OCP.

**Reasoning.** The brief allows a backend for products and forbids one for the credential core. A stub in the same repo is enough to hide future steps, check codes, and count sponsored actions.

**Risks.** It is easy to let product rules leak into the core later. The file store is one machine, not a service.

## D3. Visual language and UI kit

**Proposal.** shadcn/ui primitives (button, input, dialog, and so on), plus a warm paper background, teal ink, and rounded controls. Three themes: Light, Dark, Colorful. Text sizes Small, Medium, Large. On a wide screen the app sits in a phone-width column.

**Alternatives.** A dark “crypto” look. Hand-rolled controls. A full-width desktop layout.

**Reasoning.** The earlier mockups asked for light, soft teal, rounded shapes, and generous space, with Dark and Colorful as settings. shadcn supplies the controls so they behave consistently.

**Risks.** Colorful can become noisy. The phone column is a review frame; a real phone already is that width.

## D4. Entry wording

**Proposal.** The first screen offers Login, Restore, and First use. There is no “create account”.

**Alternatives.** “Sign in / Set up”. “Create wallet”. A single continue button.

**Reasoning.** Mr. A asked for Login / Restore / First use so the screen would not sound like a hosted account or a key ceremony.

**Risks.** “Login” still sounds like an account to some people. The three paths need to stay obvious.

## D5. No technical jargon in the player screens

**Proposal.** The player sees hunts, steps, codes, prizes, marks, backup words, and “your id”. Review notes (chain name, ETH totals) sit in a collapsed section on You, in English, and are labeled as review notes.

**Alternatives.** A visible address and fee on every screen. Hiding the id completely. Putting the chain name in the main navigation.

**Reasoning.** The point of the app is that a person can play without being taught what the id is. The reviewer still needs to see that a real id and a sponsored pool exist.

**Risks.** People can hold something valuable without a clear name for it. See D8.

## D6. One shared id for every b0x app

**Proposal.** First use derives one account at `m/44'/60'/0'/0/0`. Later b0x apps would restore the same backup words and use that same id. This draft does not use a different index per app.

**Alternatives.** The earlier chat's per-app indexes (Treasureb0x 0, Loyaltyb0x 1, …), which produce different addresses. A new id per install.

**Reasoning.** A later product should see the same prizes and marks. Separate indexes would split that. The task for this draft asked for one shared id.

**Risks.** One id means one backup protects everything, and one loss loses everything. A bug or a drain in one app reaches the others.

## D7. Keys stay on the device

**Proposal.** Twelve English backup words are generated in the browser. They are encrypted with a 4–6 digit device code (AES-GCM, PBKDF2) and stored in local storage. The words are not sent to the backend. Opening the app for this browser tab keeps the words in session storage so a refresh does not lock the review. Lock clears that. Each change that matters is signed with the key; the backend checks the signature.

**Alternatives.** A server account. An external wallet connection. OS biometrics and a hardware keystore. A longer device secret. Forgetting the words after showing them once, with no session copy.

**Reasoning.** The app is meant to be the place the id lives, without an extra wallet app. Signing shows the key is real. Session storage is a review convenience.

**Risks.** A short device code is not a serious lock. Session storage means the words sit in the tab until it closes. A stolen unlocked phone is a stolen id. Production would need the OS keystore and biometrics. 80,000 PBKDF2 rounds are a demo cost, not a final parameter.

## D8. Say that a loss cannot be undone, in plain words

**Proposal.** First use says the twelve words are the only way back, and that nobody else can restore what the id holds. The same sentence is on You.

**Alternatives.** No warning, to keep the id fully invisible. A full explanation of self-custody. A custodial reset.

**Reasoning.** The pricing report's ethics note says people who do not know they hold something can lose it without warning. The copy avoids the words wallet, seed, and key.

**Risks.** The warning can be skipped. It may still be too vague once a prize has real-world value. How frank to be is a committee question.

## D9. Three hunt shapes

**Proposal.** Serial basic: steps open one after another. Parallel basic: every step is visible; finish all, or at least N. Hybrid basic: ordered stages, each with its own steps and its own all / at least N rule. Optional steps close once the rule is met.

**Alternatives.** Only serial. A free-form graph. Letting leftover optional steps stay open after the rule is met.

**Reasoning.** These three are what the brief asked to start with. Closing optional steps keeps “at least N” from dragging on.

**Risks.** Creators may want a step that stays open after the prize is ready. Hybrid is the easiest shape to build wrong; the rules are covered by tests.

## D10. A code opens a step, and the product backend checks it

**Proposal.** Every step has a code the player types. The backend stores a hash and compares it. A wrong code counts. After 8 misses, that step waits 10 minutes. There is no “I’ve done this” button. Project OCP is told only that the condition was met, and it records a mark.

**Alternatives.** Self-attestation. Checking the code inside a transaction. A QR scan only. Per-player codes.

**Reasoning.** Mr. A said a real-world task yields a code that opens the next step. Checking on the product backend keeps the code out of a public transaction. The core stays “condition met, record it”.

**Risks.** Players can share codes. Short codes can be guessed (length and the attempt cap are the current brakes). The backend is trusted for this check. If it disappears, hidden steps and code checks stop; already recorded marks would not.

## D11. Hidden steps stay on the server

**Proposal.** Until a step is open, its title, instruction, and hint are not sent to the player. A serial hunt shows finished steps and the current one, plus a count of hidden steps. A hybrid hunt shows a locked stage as “Stage N is still hidden”, without its name.

**Alternatives.** Encrypt the text and put the ciphertext on-chain. Send everything and hide it in the client. Show upcoming titles but not instructions.

**Reasoning.** The product backend is allowed. Hiding in the client would leak the text. On-chain text is public.

**Risks.** The server can see every instruction. A stolen database reveals unreleased steps. The plaintext code is also kept for the creator (D19).

## D12. Marks and a prize, digital only

**Proposal.** Each opened step records a mark. Finishing the hunt records a prize. Both show under Prizes. Nothing physical is claimed. No hardware.

**Alternatives.** Only the prize, no per-step mark. A physical claim in this draft. A staff QR check.

**Reasoning.** The brief treats each step as a credential that unlocks the next, and the prize as the last one. Digital only matches the early hardware decision.

**Risks.** Many marks could clutter a collection, and later they may count toward a cap that is not designed yet. The mock does not write them to a chain.

## D13. Players do not pay, and the app does not sell anything

**Proposal.** No price, no checkout, and no upgrade in the app. Private creators may have 3 live hunts, each up to 40 players, covered. A fourth hunt, or a public event, points at `/organise`, which says a public event is arranged on the website, per event or for the year, and that this screen is a placeholder. No prices are shown.

**Alternatives.** The earlier transcript's escrow deposit inside the create wizard. A creator subscription in the app. Showing a benchmark price. Charging players (parked for later by the pricing report).

**Reasoning.** The pricing report says players do not pay in this phase, private creators are free within an allowance, and commercial organisers prepay on the web. Paid features in the iOS app would collide with store rules, so this draft keeps payment out of the app entirely.

**Risks.** The numbers 3 and 40 are placeholders. A creator can end a hunt to free a slot and start another. “Commercial” is not judged; the cap is the only brake. There is still no named paying organiser.

## D14. Sponsored actions instead of an in-app deposit

**Proposal.** A relayer stub draws from a house pool on each create, step unlock, and prize claim. Caps: pool 0.05 ETH, 0.002 ETH per device, 0.01 ETH per hunt, 0.00004 ETH per action. Joining does not draw. If a cap is hit, the action is refused in plain language. Totals are visible only in review notes.

**Alternatives.** A drip of ETH to each new id. The creator deposits an escrow in the wizard. The player pays the fee. No cap.

**Reasoning.** Mr. A will fund a small pool for early tests. The pricing report asked for a relayer with caps so a script cannot empty it. Product backends may host that relayer. The permanent mechanism is still later.

**Risks.** Device ids are self-declared, so a script can rotate them; the pool cap is the real backstop and is small on purpose. The amounts are untested against real fees. When the pool is empty, a hunt stops mid-way. Nobody is alerted except by the refusal.

## D15. OCP is an interface, mocked, aimed at Arbitrum Sepolia

**Proposal.** `OcpClient` has `publishHunt`, `mintMark`, and `mintPrize`. The mock returns records and fake transaction ids. It does not call a node. The target chain id is 421614, Arbitrum Sepolia. Health check reports `mode: "mock"`.

**Alternatives.** A live testnet deploy in this draft. Mocking inside the React state only. Targeting Arbitrum One now.

**Reasoning.** OCP is being drafted in another repo. This app should not invent that core, and it should not block on it. Sepolia matches a test hunt before any real fee.

**Risks.** The method names may not match the other repo. Arbitrum One is Stage 1, not Stage 2; this draft does not claim otherwise. Fake transaction ids must never be shown as real receipts. The player UI does not show them.

## D16. What the product backend is allowed to do in this draft

**Proposal.** It may: store hunts, hide unreleased text, check codes, count players, enforce the private allowance, record mock credentials, and run the relayer ledger. It may not: hold backup words, replace the credential core, or take payment.

**Alternatives.** A purely local demo. Moving code checks into OCP. A read-only index only.

**Reasoning.** This is the boundary from the brief: the core stays backend-free; the product may use a backend for the things that cannot be public.

**Risks.** The boundary is a comment and a folder (`lib/server`, `lib/ocp`), not a separate deploy. It will blur unless the committee writes it down as a rule.

## D17. Reads are not signed

**Proposal.** Creating, joining, unlocking, claiming, and ending are signed. Lists and hunt views trust the id in the query string.

**Alternatives.** Sign every read. A session cookie.

**Reasoning.** Signing the actions shows the key works. Signing every refresh made the draft slower and noisier.

**Risks.** Anyone who knows an id can read that player's hunt progress and creator codes from this stub. That is acceptable only while the data is a demo.

## D18. Plaintext step codes kept for the creator

**Proposal.** The server stores the step code in plaintext as well as a hash, so You can list “codes to place”. Players never receive another step's code except their own sample hints (D20).

**Alternatives.** Hash only; the creator must keep their own copy. Encrypt the codes to the creator's key.

**Reasoning.** A creator who closes the wizard still needs the codes. This is the smallest way to show that.

**Risks.** A database copy is a full answer key. This should not survive past the draft without a committee choice.

## D19. Sample hunts put the code in the hint

**Proposal.** Three sample hunts ship with the app: LANTERN (serial), MARKET (parallel), MILL (hybrid). Each hint says the code a player would have found, so the draft can be played at a desk.

**Alternatives.** Codes only in the README. A “fill the code” debug button. No samples.

**Reasoning.** The review is short and there is no physical site. The hint is honest that it is a sample.

**Risks.** People may copy the pattern and put real codes in hints. Sample hunts are flagged.

## D20. Creator joins their own hunt and may end it

**Proposal.** Creating a hunt also joins the creator, so they can try it. End hunt stops new joins and new unlocks. A prize already earned can still be claimed. Ending frees a private-hunt slot. Sample hunts cannot be ended.

**Alternatives.** Creators cannot play their own hunt. Ending deletes it. Ending also blocks claims.

**Reasoning.** The creator needs a way to rehearse and a way to free the allowance. People who already finished should not lose the prize because the hunt closed.

**Risks.** The creator counts toward the 40 players. Ending is instant and has no undo.

## D21. Languages, direction, and backup words

**Proposal.** The shell is translated into English, Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, Japanese, and Danish. Arabic is right to left. Backup words stay English in every language. Hunt text stays in the language the creator wrote. Sample hunts stay in English unless that language has its own wording; Danish does.

**Alternatives.** English only for this draft. Localized word lists. Machine-translating hunt text.

**Reasoning.** The settings list named these languages, and Danish was added beside them. One word list avoids mixed backups. Authored hunt text is not the same as chrome. Sample wording follows the language only when a translation is included.

**Risks.** Translation quality needs a native pass. A player who cannot read the creator's language is stuck. English words on a non-English phone need the sentence that explains why.

## D22. Create flow is a modal wizard

**Proposal.** Create opens a dialog: structure, basics, steps, prize, review, done. Terms such as the structure names, the hunt code, and the prize can be tapped for one sentence. Closing a dirty wizard asks before discarding. Review shows the allowance, not a fee.

**Alternatives.** A separate page. A single long form. The transcript's fee-and-deposit step.

**Reasoning.** Mr. A asked for a modal wizard and for help inside the screen. The deposit step is replaced by D13 and D14.

**Risks.** A tall wizard is cramped on a small phone. Tap help is easy to miss.

## D23. Navigation

**Proposal.** Bottom bar: Hunts, Create, Prizes, You. Settings (text size, theme, language), the id, backup words, and created hunts live on You. Public events live at `/organise`, linked when the allowance is full and from the copy, not as a paid item.

**Alternatives.** The three-item menu only (Join, Create, Settings), with prizes buried. A separate settings screen.

**Reasoning.** Prizes and the id are part of the request for this draft. The original three jobs are still there: join is the Hunts screen, create is the middle button, settings are on You.

**Risks.** Four items is tighter than three. “You” is doing a lot.

---

## What this list is not

It does not set a price, a Pass, a treasury split, an upgrade rule for OCP, or a permanent way to pay fees. Those stay open in `docs/ARCHITECTURE.md`.
