# Treasureb0x — proposed product flows

This describes the flows the prototype lets you click through. They are proposals. See `docs/DESIGN-DECISIONS.md`. Nothing here is a committee decision.

The app is for playing and making hunts. A person should not need to learn what sits underneath. Words like account, wallet, and fee are not used in the player screens.

## Who it is for

- A player joins a hunt with a code, does something in the world, and types the code they found to open the next step.
- A private creator makes a hunt inside the app, within a covered allowance.
- A commercial organiser is not served inside the app. A placeholder says public events are arranged on the website, for one event or for the year.

Players do not pay. The app does not take payment.

## Entry

The first screen is Login, Restore, or First use.

- **First use.** Name, a 4–6 digit device code, then twelve backup words to write down. The person confirms three of the words. Then they are in.
- **Restore.** The twelve words, a name, and a new device code for this phone.
- **Login.** The device code, if this phone already has a first use or a restore.

The backup words are English even when the rest of the app is not. The screen says why. It also says that if the words are lost, nobody can bring back what that id holds.

Appearance (language, theme, text size) is on the entry screen and again on Me.

## Hunts

Your hunts lists only hunts you have joined. Until then it is empty, with three samples:

| Code | Shape | What to try |
| --- | --- | --- |
| LANTERN | Serial basic | One step at a time. Codes are in the hints: GREENGLASS, then THIRD, then FERRY. |
| MARKET | Parallel basic | All three stalls at once. CRUST, STEM, NOON. All three open the prize. |
| MILL | Hybrid basic | The yard (WHEEL and CREEK), then inside (DUST or BARLEY). |

Joining a sample is the same action as joining any other code.

### Serial basic

Only the current step is shown. Finishing it reveals the next. Hidden steps are a count, not a list.

### Parallel basic

Every step is visible. The creator chooses “all” or “at least N”. Once that is met, leftover steps close and the prize can be claimed.

### Hybrid basic

Stages are in order. The next stage's name stays hidden until the current stage's rule is met.

A wrong code does not open the step. Too many tries on one step pauses that step. The prize button appears when the rules are met. Claiming keeps the prize under Prizes. Each opened step also keeps a mark.

## Making a hunt

Create opens a wizard:

1. **Structure.** Serial basic, Parallel basic, or Hybrid basic, each with one sentence. Tap the name for the same sentence.
2. **Basics.** Name, short description, optional start and end.
3. **Steps.** Title, what to do, and the code a player will find. A hint is optional. Hybrid hunts are built stage by stage, with a rule on each stage.
4. **Prize.** Name and what the player keeps.
5. **Review.** The hunt code (editable), how many covered hunts are left, and a reminder that players never pay. No amount to deposit.
6. **Done.** The code, a copy button, and a way to open the hunt.

A private creator may have 3 live hunts, each for up to 40 players. Those numbers are proposals. When none are left, the wizard points at Public events instead of taking payment.

The creator is joined automatically, so they can walk the hunt. On Me they can see the codes to place in the world, the player count, and end the hunt. Ending stops new joins and new steps. A prize already ready can still be claimed.

## Prizes

Prizes are the things kept at the end. Marks are the things kept per step. Both are digital. There is no physical handover in this draft.

## Me

Name, id (copyable, easy to ignore), backup words behind the device code, hunts you made, appearance, and Lock.

The same screen lists the b0x credentials on this id. This draft issues two kinds: a mark for each opened step, and a prize when one is claimed. Joining a hunt and publishing one do not mint a separate credential. Filters cover type, hunt, and status (active, expired, short-lived, revoked — the last three apply only when a record carries an end or a revocation). Sort covers newest, oldest, hunt name, and type. Search matches the title, hunt, stage, and issuer. Each row shows when it was issued, the hunt, the stage when the mark has one, who issued it, and the named network. A mock record is not linked as a chain receipt. Balances, unrelated tokens, and other NFTs are not read.

Lock returns to the entry screen on this phone. It does not delete the backup.

Review notes are collapsed and in English. They show the mocked chain target and the sponsored-action totals. They are for this review, not for players.

## Public events

`/organise` is a placeholder. It says a public event is arranged on the website, per event or for the year, and that the app does not take payment. There is no price and no form.

## What a person never has to do

- Learn a new vocabulary for the id.
- Pay to play or to try a private hunt.
- Connect a separate app to sign in.
- Understand where a record was written.

## What can go wrong, in the open

- Shared codes. Nothing stops a player from sending a code to someone else.
- Lost backup words. There is no reset.
- A covered hunt that runs out of sponsored actions. The step does not open, and the message says covered actions are used up.
- A hunt that ends while someone is mid-way. New steps stop. An already earned prize can still be claimed.
