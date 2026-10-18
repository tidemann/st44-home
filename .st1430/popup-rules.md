# Diddit desktop — rules for the popups

These 8 rules apply to **every popup (dialog) on desktop** (window 1024 px wide or more). They do not
touch a single page, and they do not change the phone. Step 1 — [the 8 rules for all pages](/ST/issues/ST-1370#document-page-rules),
approved 18 October — explicitly left popups out; this is that step 2.

**Everything the approved Popups section already settles stays exactly as it is:** the thin ink edge
`#17120A` and the 30 % ink veil on a popup that blocks, the grey `#555E64` edge and no veil on one you
may ignore, the shadow recipe, the 13 px radius, 15 px inside, title 27 px Bricolage 800, body 16 px
Hanken 600, «Slett» filled with Overdue Rust `#A43A16`, and the safe action on the left. Those were
approved on ST-880 and are not reopened here — **with one exception, and it is a question for Stig, not
a rule: whether «Bytt husstand» blocks.** It is in its own section below, with both versions drawn.

What the guide never wrote down is what a popup does on a **1440 px window**: it gives 346 px at the
phone's 22 px gutter and nothing for desktop. These 8 rules fill that gap — and nothing else.

Source: the popup findings in Ida's desktop review ([ST-1345](/ST/issues/ST-1345#document-review), F16),
re-measured on 18 October on all 17 popups at 1440 × 900, and re-measured again after Astrid's two
reviews ([ST-1443](/ST/issues/ST-1443#document-review) and
[ST-1465](/ST/issues/ST-1465#document-review), which accepted the set).

## The 17 popups, and what opens them

| # | Popup | Opened from | Blocks? |
|---|---|---|---|
| 1 | «Ny oppgave» | Hjemme, Oppgaver | yes |
| 2 | «Rediger oppgave» | Oppgaver (a template row) | yes |
| 3 | «Tilordne oppgave på nytt» | Oppgaver (row action «Bytt») | yes |
| 4 | «Slette n oppgaver?» | Oppgaver, in select mode | yes |
| 5 | «Bytt husstand» | Hjemme, the caret after the household name | **Stig's call — see the section below** |
| 6 | «Legg til barn» | Familie | yes |
| 7 | «Barnedetaljer» | Familie (click a child) | yes |
| 8 | «Inviter familiemedlem» | Familie | yes |
| 9 | «QR-kode innlogging» | Familie (the QR button on a child) | yes |
| 10 | «Slette belønningen?» — the shared yes/no box | Belønninger, Familie, Invitasjoner, Husholdningsinnstillinger | yes |
| 11 | «Vil du be om dette?» | the child's Belønninger | yes |
| 12 | «Ny husholdning» | Husholdninger | yes |
| 13 | «Endre husholdning» | Husholdninger | yes |
| 14 | «Forlat husholdningen» | Husholdninger | yes |
| 15 | «Slett husholdningen» | Husholdninger | yes |
| 16 | «Slå på varsler?» | every page, as an offer | no |
| 17 | «Legg Diddit på hjemskjermen» | every page, as an offer | no |

Not popups, as the guide already says: the offline banner, the QR scanner's viewfinder, and the
celebration overlay. Five more modal components exist in the code but no page opens them
(`edit-task-modal`, `quick-add-modal`, `task-form`, `reassign-modal`, `manual-assignment-modal`) —
they are dead code for Eirik, not design.

## The 8 rules

| # | Rule | Today |
|---|---|---|
| **1** | **Popup width.** Every popup is 428 px wide — the same column a form gets on a page — and centred in the window. It never grows with the window and no popup has a width of its own. | 3 widths: 14 dialogs at 500 px, the two offers at 480 px, «Bytt husstand» 440 px. |
| **2** | **Height and place.** A popup is centred in the window with at least 48 px of air over and under it; when the content is taller, only the body scrolls — the title row and the action row stay. | The two tallest («Ny oppgave», «Barnedetaljer») stand 852 px tall in a 900 px window, 24 px from the edge. |
| **3** | **The action row is two equal halves:** two buttons of 194 × 49 px, 13 px corners, 16.5 px label, 8 px apart, filling the 396 px inside the popup; the safe one outlined on the left, the one that acts filled on the right. One action fills all 396 px; three share the row in equal thirds of 126,7 px. | The buttons hug their labels: 17 different widths between 57 and 230 px, and labels in two sizes (14 and 16.5 px). |
| **4** | **A popup's main action is never pale — and never dead.** It keeps the yellow fill and its ink label (10,57:1) and is pressable from the first paint. The form is checked **when you press**: the field that is wrong takes a 2 px `#A43A16` edge and one `#A43A16` line, 15 px, stands under *that* field (6,57:1) — the guide's `field-text-error` token, 2 px rust and no icon. An error on **one** field marks only that field; the approved login marks *both* of its fields because its error is on the whole form («Feil e-post eller passord») and the placement must not say which field was wrong — that reason does not apply here. The only `disabled` left inside a popup is the moment it is working, and that keeps its yellow and swaps its label, as the login does. | 6 popups dim it before you have typed anything — 2,63:1 on five, 3,46:1 on «Opprett» — and all six are `disabled`, so the press does nothing at all. |
| **5** | **One field inside a popup:** 49 px tall, 13 px corners, a 1,5 px `#555E64` edge, white, 16 px inside — otherwise the login field (whose own inset is 18 px; see «What is not in this step»). A text box is that same field, the full 396 px wide and 76 px tall. | 5 field heights (48, 50, 51,6, 52, 53 px) and 4 edges, one of them `#E2E8F0`, a colour from outside the system; and text boxes in two shapes — 468 × 76 px with a 2 px `#DFDFD9` edge in the two task popups, and «Personlig melding» in «Inviter familiemedlem» **181 × 72 px, 0 px corners, no edge at all**: a white box on a white surface. |
| **6** | **No browser chrome inside a popup.** A choice is a Diddit field with the Diddit caret, never the operating system's own `<select>` menu or date picker. The pictures show the **closed** field, which is all a picture can hold; the open list is a Diddit menu Eirik builds. | 5 popups open the browser's own menu inside the Diddit frame. |
| **7** | **A popup is a centred dialog, never a sheet off an edge.** On desktop there is no bottom nav to rise above, and a sheet glued to the window's edge loses the popup's own shape. The shape does not depend on whether the popup blocks: it holds whichever way the question below goes, and the only popups that stand off-centre are the two offers in rule 8. | «Bytt husstand» rises from the bottom edge with 20 px corners and no edge at all, against 13 px and the ink edge on the other 14. |
| **8** | **An offer sits in the bottom right** — in this set «Slå på varsler?» and «Legg Diddit på hjemskjermen» (rows 16 and 17), and no other popup: 428 px wide, 24 px clear of the window's right and bottom edge, grey edge, no veil. A popup that asks you something stays centred (rule 7) even if you may ignore it, so this corner does not pick up «Bytt husstand» whichever way Stig answers below. | Both offers float centred at the bottom of the window, 480 px wide, in a 16 px gutter meant for a phone. |

## The pictures: every popup with the 8 rules

Left half of each pair: the popup today. Right half: the same popup with the 8 rules and nothing else
changed — **the page behind is the same in both halves**, because the page rules are step 1 and are not
redrawn here. 1440 × 900 px, light mode, `deviceScaleFactor: 2`, the same fictional family throughout.
Every number under a pair was measured in the rendered pixels, not predicted.

- **Sheet 1 — Hjemme og Oppgaver (5):** «Ny oppgave», «Rediger oppgave», «Tilordne oppgave på nytt», «Slette n oppgaver?», «Bytt husstand».
- **Sheet 2 — Familie (4):** «Legg til barn», «Barnedetaljer», «Inviter familiemedlem», «QR-kode innlogging».
- **Sheet 3 — Belønninger og husholdninger (4):** «Slette belønningen?», «Vil du be om dette?», «Ny husholdning», «Endre husholdning».
- **Sheet 4 — Husholdninger og de to tilbudene (4):** «Forlat husholdningen», «Slett husholdningen», «Slå på varsler?», «Legg Diddit på hjemskjermen».
- **Sheet 5 — rule 4 alone, in three columns (6):** the main action today (pale *and* dead), with the rules (yellow and live), and pressed on a form that is not finished. This sheet is new in round 2: it is the one rule a two-column pair cannot show. In «Rediger oppgave» the press finds **two** fields wrong at once («Oppgavenavn» and «Poeng»), so that frame also shows what the rule does when an error is not alone: each wrong field takes its own rust edge and its own line, and nothing is collected into a banner.

**Three things to read correctly in the pictures.** «QR-kode innlogging» shows its frame only — the code
is drawn from a server answer the mock does not give, and the popup has no action row at all, so that
pair carries **rule 1 and rule 2 only**; its one pressable is the 40 × 40 px close cross. In
«Barnedetaljer» the 362 px and 93 px buttons sit inside the body's own blocks («Opprett innlogging» in
the notice, «Fjern barn» in «Faresone»); the action row is the 396 px «Lukk» at the bottom. And **every
emoji draws as an empty square in both halves**: the drawing rig has no emoji font. That is not a
design change — in the app they are a phone, a person, a warning triangle, a pencil, a tick, a cross
and a bell.

![Sheet 1 — Hjemme og Oppgaver](/api/attachments/4ef411cf-3c4c-419f-87ac-02b6ed2ef038/content)

![Sheet 2 — Familie](/api/attachments/1862d044-c304-4da3-bbcc-25d6027e44e9/content)

![Sheet 3 — Belønninger og husholdninger](/api/attachments/55d456e9-a2ab-4053-bf9a-911ddbd49019/content)

![Sheet 4 — Husholdninger og de to tilbudene](/api/attachments/35557d9e-2ba4-4b36-9c00-34e0e7bf52fb/content)

![Sheet 5 — rule 4 in three columns](/api/attachments/99c7e8a5-0b97-4750-a8aa-310c72982526/content)

### Where a rule left a choice open, this is the choice I made

1. **428 px, not 500** (rule 1). It is the page's form column from step 1, so a popup and a form on the
   page below are the same width. The alternative — a second, wider popup for «Ny oppgave» and
   «Barnedetaljer» — would add a width to the system; those two scroll instead.
2. **48 px of air** (rule 2) makes the tallest popup 804 px in a 900 px window, so the veil and the page
   are visible on every side.
3. **Three actions share the row in equal thirds**, 126,7 px, with «Slett» in rust on the left
   («Rediger oppgave» is the only popup with three).
4. **A lone action fills all 396 px** («Barnedetaljer»).
5. **The error stands under the field that is wrong** (rule 4): the guide's `field-text-error` — a 2 px
   rust edge on that field and one rust line under it, no icon. Not a banner at the top of the popup,
   which is where «Tilordne oppgave på nytt» put it, and not a message on the page behind the veil,
   which is where «Ny husholdning» put it. The login's own error marks both fields and stands above the
   action because it is an error on the whole form; a popup's is an error on one field.
6. **The offers go to the bottom right corner** (rule 8), 24 px from both edges — the corner a desktop
   user expects a message in, and there is no bottom nav to keep clear of. Only one offer shows at a time.
7. **«Bytt husstand» becomes a centred dialog on desktop only.** On the phone it stays the bottom sheet
   the picture draws.

## One question for Stig before this is a rule: does «Bytt husstand» block?

Rule 7 settles the **shape** — a centred 428 px dialog with 13 px corners, not a sheet glued to the
bottom edge. That part is not in question. What rule 7 must not settle on its own is whether this
popup **blocks**: the approved Popups section (ST-880) lists the household dropdown in the column you
may ignore — grey `#555E64` edge, no veil — while the app today already paints the 30 % ink veil and
draws no edge at all. The right-hand halves in sheet 1 currently show it blocking.

Both versions are drawn, same render, one difference:

![«Bytt husstand» — A blocks, B may be ignored](/api/attachments/b0c6f257-6774-45e5-85e5-f7d724c91ba0/content)

- **A — it blocks:** ink edge `#17120A`, 30 % veil. One new line in the approved table moves the
  household choice to the blocking column.
- **B — you may ignore it:** grey `#555E64` edge, no veil. The approved table is untouched and the
  right-hand half of sheet 1 is re-rendered. It stays a centred 428 px dialog in that case too: the
  corner in rule 8 belongs to the two offers, and rule 7's shape does not depend on this answer.

**Ida's recommendation: A.** «Bytt husstand» switches the active household for the whole app, covers
the page and takes focus — it behaves like a dialog, and the app paints the whole veil today. The
approved line was written about a *dropdown* at the name; what the code opens is a full sheet. Either
way the shape is the same. This is Stig's call.

### What is not in this step

- **Nothing on a single page.** Inside «Barnedetaljer»: the emoji, the «Faresone» block, and
  «✏️ Rediger», whose pressable box is **63,7 × 22,4 px** — under the 24 × 24 px floor of WCAG 2.5.8
  that the guide quotes under **Hit area**. The empty «Velg barn» menu in «Tilordne oppgave på nytt»
  is the same: step 3, each with its own decision. Everything else in the 17 clears the floor (the
  close cross is 40 × 40, every action 49 px tall).
- **The open menu list** (rule 6). The rule bans the OS menu; the Diddit menu that replaces it is a
  component for Eirik, and only the closed field is in these pictures.
- **Emoji as icons inside a popup.** Step 1's rule 8 was scoped to pages. The popups in this set carry
  a phone, a person, a warning triangle, a pencil, a tick, a cross and a bell. Whether the page rule
  reaches into popups is step 3.
- **16 px or 18 px inside a field.** The guide's `field-text` token says 18 px; all 17 popups are
  built with 16 px, and the pictures keep 16 px so every box in the set agrees. Which number is the
  rule is a guide question, not a popup question.
- **The two error lines Diddit now has.** The approved login draws a *form-level* error: both fields
  marked, one line with a warning icon above the action. Rule 4 draws a *field-level* one: the wrong
  field marked, one line without an icon under it. Both are in the app; naming them as two patterns in
  the guide is step 3, and nothing here decides it.
- **Nothing on the phone.** Every rule here is scoped to 1024 px and wider.
- **Nothing else in the approved Popups section.** Edge, veil, shadow, radius, padding, type and the
  rust «Slett» are quoted above, not reopened.

## How this was measured

`ng serve`, Playwright/Chromium at 1440 × 900, `deviceScaleFactor: 2`, `nb-NO`, a synthetic family
(Kari, Emma, Jonas, Mathea) — **no real user data**. Each popup was opened by clicking the same buttons
a parent or child clicks, and in sheet 5 the main action was pressed the way a parent presses it.
Widths, heights, button boxes, field boxes, fills and the label contrast of every action were read off
the rendered DOM **and** the pixels in both halves.

The left halves are `origin/main` at 3f56e0e. The right halves are branch
`ida/st-1430-popup-rules` at **c8d6fb7** (`st1430-shoot.js`, `st1430-press.js`, `st1430-sheet.js`,
`st1430-sheet4.js`, `st1430-b1.js`), so every «after» picture is a real render, not a drawing. The
round-2 numbers are in `.st1430/round2-measurements.md` on that branch. All 1103 frontend tests pass
on it. It is a prototype for the pictures, not a merge candidate — Eirik builds this for real.

## What happens when Stig approves

1. Ida writes these 8 rules into the Diddit design guide under **Popups**, as a desktop section, with
   the sheets in `reference/`. Astrid checks them against the pictures.
2. Eirik changes the popups to look like the right-hand halves. Solveig checks them live at 1440 and
   1024 px, and checks that nothing moved on the phone.

## Order (one decision at a time)

1. ~~Rules for all pages~~ — approved 18 October.
2. **Now:** these rules for the popups.
3. **Then:** what is left on single pages.
4. **Last:** the 3 pages that need a drawing first.
