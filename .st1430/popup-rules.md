# Diddit desktop — rules for the popups

These 8 rules apply to **every popup (dialog) on desktop** (window 1024 px wide or more). They do not
touch a single page, and they do not change the phone. Step 1 — [the 8 rules for all pages](/ST/issues/ST-1370#document-page-rules),
approved 18 October — explicitly left popups out; this is that step 2.

**Everything the approved Popups section already settles stays exactly as it is:** the thin ink edge
`#17120A` and the 30 % ink veil on a popup that blocks, the grey `#555E64` edge and no veil on one you
may ignore, the shadow recipe, the 13 px radius, 15 px inside, title 27 px Bricolage 800, body 16 px
Hanken 600, «Slett» filled with Overdue Rust `#A43A16`, and the safe action on the left. Those were
approved on ST-880 and are not reopened here. What the guide never wrote down is what a popup does on
a **1440 px window**: it gives 346 px at the phone's 22 px gutter and nothing for desktop. These 8
rules fill that gap — and nothing else.

Source: the popup findings in Ida's desktop review ([ST-1345](/ST/issues/ST-1345#document-review), F16),
re-measured on 18 October on all 17 popups at 1440 × 900.

## The 17 popups, and what opens them

| # | Popup | Opened from | Blocks? |
|---|---|---|---|
| 1 | «Ny oppgave» | Hjemme, Oppgaver | yes |
| 2 | «Rediger oppgave» | Oppgaver (a template row) | yes |
| 3 | «Tilordne oppgave på nytt» | Oppgaver (row action «Bytt») | yes |
| 4 | «Slette n oppgaver?» | Oppgaver, in select mode | yes |
| 5 | «Bytt husstand» | Hjemme, the caret after the household name | yes |
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
| **1** | **Popup width.** Every popup is 428 px wide — the same column a form gets on a page — and centred in the window. It never grows with the window and no popup has a width of its own. | 3 widths: 15 dialogs at 500 px, the two offers at 480 px, «Bytt husstand» 440 px. |
| **2** | **Height and place.** A popup is centred in the window with at least 48 px of air over and under it; when the content is taller, only the body scrolls — the title row and the action row stay. | The two tallest («Ny oppgave», «Barnedetaljer») stand 852 px tall in a 900 px window, 24 px from the edge. |
| **3** | **The action row is two equal halves:** two buttons of 194 × 49 px, 13 px corners, 16.5 px label, 8 px apart, filling the 396 px inside the popup; the safe one outlined on the left, the one that acts filled on the right. One action fills all 396 px; three share the row in equal thirds of 126,7 px. | The buttons hug their labels: 17 different widths between 57 and 230 px, and labels in two sizes (14 and 16.5 px). |
| **4** | **A popup's main action is never pale.** It keeps the yellow fill and its ink label (10,57:1). The form is checked when you press, and the error shows under the field — the same as the login page. | 6 popups dim it before you type: 2,63:1 on five of them and 3,46:1 on «Opprett». |
| **5** | **One field inside a popup:** 49 px tall, 13 px corners, a 1,5 px `#555E64` edge — the login field. A text box is the same field, 76 px tall. | 5 field heights (48, 50, 51,6, 52, 53 px) and 4 edges, one of them `#E2E8F0`, a colour from outside the system. |
| **6** | **No browser chrome inside a popup.** A choice is a Diddit field with the Diddit caret, never the operating system's own `<select>` menu or date picker. | 5 popups open the browser's own menu inside the Diddit frame. |
| **7** | **A popup that blocks is a centred dialog, never a sheet off an edge.** On desktop there is no bottom nav to rise above, and a sheet glued to the window's edge loses the popup's own shape. | «Bytt husstand» rises from the bottom edge with 20 px corners and no edge at all, against 13 px and the ink edge on the other 14. |
| **8** | **A popup you may ignore sits in the bottom right**, 428 px wide, 24 px clear of the window's right and bottom edge, grey edge, no veil. | Both offers float centred at the bottom of the window, 480 px wide, in a 16 px gutter meant for a phone. |

## The pictures: every popup with the 8 rules

Left half of each pair: the popup today. Right half: the same popup with the 8 rules and nothing else
changed — **the page behind is the same in both halves**, because the page rules are step 1 and are not
redrawn here. 1440 × 900 px, light mode, `deviceScaleFactor: 2`, the same fictional family throughout.
Every number under a pair was measured in the rendered pixels, not predicted.

- **Sheet 1 — Hjemme og Oppgaver (5):** «Ny oppgave», «Rediger oppgave», «Tilordne oppgave på nytt», «Slette n oppgaver?», «Bytt husstand».
- **Sheet 2 — Familie (4):** «Legg til barn», «Barnedetaljer», «Inviter familiemedlem», «QR-kode innlogging».
- **Sheet 3 — Belønninger og husholdninger (4):** «Slette belønningen?», «Vil du be om dette?», «Ny husholdning», «Endre husholdning».
- **Sheet 4 — Husholdninger og de to tilbudene (4):** «Forlat husholdningen», «Slett husholdningen», «Slå på varsler?», «Legg Diddit på hjemskjermen».

![Sheet 1 — Hjemme og Oppgaver](/api/attachments/a1463106-9f47-42b4-95cc-b8f3e6d2689d/content)

![Sheet 2 — Familie](/api/attachments/09625d23-d35f-4fb6-ba08-7e235c7d9eba/content)

![Sheet 3 — Belønninger og husholdninger](/api/attachments/74be040c-5154-4650-b540-f4f9ea2f207e/content)

![Sheet 4 — Husholdninger og de to tilbudene](/api/attachments/d8089d47-64e2-4441-9bce-9ce85ebf8104/content)

### Where a rule left a choice open, this is the choice I made

1. **428 px, not 500** (rule 1). It is the page's form column from step 1, so a popup and a form on the
   page below are the same width. The alternative — a second, wider popup for «Ny oppgave» and
   «Barnedetaljer» — would add a width to the system; those two scroll instead.
2. **48 px of air** (rule 2) makes the tallest popup 804 px in a 900 px window, so the veil and the page
   are visible on every side. 
3. **Three actions share the row in equal thirds**, 126,7 px, with «Slett» in rust on the left
   («Rediger oppgave» is the only popup with three).
4. **A lone action fills all 396 px** («QR-kode innlogging», «Barnedetaljer»).
5. **The offers go to the bottom right corner** (rule 8), 24 px from both edges — the corner a desktop
   user expects a message in, and there is no bottom nav to keep clear of. Only one offer shows at a time.
6. **«Bytt husstand» becomes a centred dialog on desktop only.** On the phone it stays the bottom sheet
   the picture draws.

### What is not in this step

- **Nothing on a single page.** The 📱 emoji and the «Faresone» block inside «Barnedetaljer», and the
  empty «Velg barn» menu in «Tilordne oppgave på nytt», are step 3, each with its own decision.
- **Nothing on the phone.** Every rule here is scoped to 1024 px and wider.
- **Nothing in the approved Popups section.** Edge, veil, shadow, radius, padding, type and the rust
  «Slett» are quoted above, not reopened.

## How this was measured

`ng serve` on `origin/main` (3f56e0e), Playwright/Chromium at 1440 × 900, `deviceScaleFactor: 2`,
`nb-NO`, a synthetic family (Kari, Emma, Jonas, Mathea) — **no real user data**. Each popup was opened
by clicking the same buttons a parent or child clicks. Widths, heights, button boxes, field boxes and
the label contrast of every action were read off the rendered DOM and pixels in both halves
(`st1430-shoot.js`, `st1430-sheet.js` on branch `ida/st-1430-popup-rules`; the right-hand half is that
branch's CSS, so every «after» picture is a real render, not a drawing).

## What happens when Stig approves

1. Ida writes these 8 rules into the Diddit design guide under **Popups**, as a desktop section, with
   the four sheets in `reference/`. Astrid checks them against the pictures.
2. Eirik changes the popups to look like the right-hand halves. Solveig checks them live at 1440 and
   1024 px, and checks that nothing moved on the phone.

## Order (one decision at a time)

1. ~~Rules for all pages~~ — approved 18 October.
2. **Now:** these rules for the popups.
3. **Then:** what is left on single pages.
4. **Last:** the 3 pages that need a drawing first.
