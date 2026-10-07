# Rule check: every rule in the guide, against the signed-off picture

The test for [DESIGN-GUIDE.md](DESIGN-GUIDE.md) is not "is this rule sensible" but **"does the
signed-off picture visibly do this"**. A rule the picture does not show is a rule that will drain
the picture, which is exactly what went wrong on ST-729.

Reference: [`reference/poeng-signed-off.png`](reference/poeng-signed-off.png) — five screens,
left to right:

| #   | Screen                     | Caption in the picture     |
| --- | -------------------------- | -------------------------- |
| 1   | Familiens hjem             | Familiens hjem             |
| 2   | Forelder: oppgaveliste     | Forelder: oppgaveliste     |
| 3   | Barn: mine oppgaver        | Barn: mine oppgaver        |
| 4   | Barn: haker av en oppgave  | Barn: haker av en oppgave  |
| 5   | Barn: poeng og belønninger | Barn: poeng og belønninger |

Crops used as evidence below:
[`screen-4-tick-moment.png`](reference/screen-4-tick-moment.png) ·
[`screen-5-rewards.png`](reference/screen-5-rewards.png) ·
[`row-chore.png`](reference/row-chore.png) ·
[`row-overdue.png`](reference/row-overdue.png)

All hex values and sizes below were sampled from the PNG, not estimated by eye. Sizes are CSS px at
390 px phone width (board scale 1.846×, from the picture's own "telefon 390 px" caption).

---

## Colour rules

| Rule                                                            | Where the picture shows it                                                                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One yellow, `#F6B93B`                                           | Sampled identical on screen 2's "Ny oppgave" button, screen 3's meter, screen 4's whole background, screen 5's "Spør mor" buttons. Four different roles, one hex.          |
| Yellow is a fill colour, not only a surface                     | Screen 2 primary button, screen 3 "Hak av" button and meter segments, screen 5 three reward buttons + two meters — all filled yellow.                                      |
| Yellow is used freely, several times per screen                 | **Screen 5 has five yellow elements.** See [`screen-5-rewards.png`](reference/screen-5-rewards.png).                                                                       |
| Ink `#17120A` on every yellow surface                           | Screen 4: title, "+10", meter fill, tick badge, "Ferdig" fill — all sampled `#17120A`. 10.57:1.                                                                            |
| White on yellow never appears                                   | No white type anywhere on screen 4 or on any yellow button. Computed 1.76:1.                                                                                               |
| Amber Ink `#8A5A00` is a white-background colour                | "10 p" on a white row ([`row-chore.png`](reference/row-chore.png)) and the active nav label. It appears nowhere on the yellow.                                             |
| Overdue Rust `#A43A16`                                          | The word "Forfalt" and the 2 px card border, screens 1 and 3. See [`row-overdue.png`](reference/row-overdue.png).                                                          |
| Done Green `#0F7A54`                                            | Filled check on completed rows (screen 2), "Du har nok poeng" (screen 5).                                                                                                  |
| Surface `#FFFFFF` on background `#F6F6F4`                       | Every card on screens 1, 2, 3, 5.                                                                                                                                          |
| On-yellow neutrals are darker shades of the same hue, not greys | Screen 4: inset card `#DBA434`, meter track `#C59430`. No grey appears on the yellow screen.                                                                               |
| **The Keep-The-Yellow Rule**                                    | The picture never needs it: every text colour in it already clears 4.5:1, and the one hard case (type on yellow) is solved with black at 10.57:1.                          |
| **The Ink-On-Yellow Rule**                                      | Screen 4, every element.                                                                                                                                                   |
| **The Say-It-In-Words Rule**                                    | "Forfalt" beside the red border; "Gjort 16.10" beside the green tick; "35 igjen" beside the meter; "225 av 250 poeng" on screen 4. No state in the picture is colour-only. |

## Type rules

| Rule                                                               | Where the picture shows it                                                                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two faces only: Bricolage Grotesque 800 and Hanken Grotesk 500/600 | Confirmed by rendering both webfonts and matching ink boxes: widths within ~3% on eleven of twelve sampled strings. No third face, no italic, no uppercase tracking appears. |
| Display 106 px                                                     | "+10", screen 4 — measured 106.0 px by string calibration.                                                                                                                   |
| Display sm 90 px                                                   | "215" on screen 3 — measured 90.5 px.                                                                                                                                        |
| Number 32 px                                                       | "340" on a family card, screen 1 — measured 32.5 px.                                                                                                                         |
| Title 30 px                                                        | "Jonas", screen 3 — measured 29.5 px.                                                                                                                                        |
| Body 17 px                                                         | "Dekke bord" 17.5, "Ny oppgave" 17.1, "poeng" 16.8.                                                                                                                          |
| Label 15 px                                                        | "Forfalt" — measured 15.0 px.                                                                                                                                                |
| Meta 14 px                                                         | "Mathea – kl. 16.30" 13.7, "Igjen i dag" 14.1, "10 p" 14.3.                                                                                                                  |
| Caption 13 px                                                      | Nav label "Hjem" — measured 13.1 px.                                                                                                                                         |
| **The Tabular Numbers Rule**                                       | The big numerals are 18–25% wider than proportional figures of the same height; with `tabular-nums` the rendered widths match the picture to 0.2–3.7%.                       |
| **The One Hero Rule**                                              | Screen 3 has one 90 px number; screen 4 has one 106 px number; screen 5 has one 90 px number. Never two.                                                                     |

## Layout, depth and shape rules

| Rule                                               | Where the picture shows it                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen gutter 8 px; card 375 px wide               | Card spans x 132–823 inside a phone at x 118–837 → 14 board px each side.                                                                   |
| 8 px between cards                                 | Measured gaps of 15 board px between consecutive rows on screen 1.                                                                          |
| Chore row 74 px tall; 16 px padding                | Row pitch 152 board px minus the 15 px gap; first ink 28 board px in from the card edge.                                                    |
| Primary button 375 × 53 px, full width             | Screen 2, "Ny oppgave": 692 × 98 board px.                                                                                                  |
| Meter segments 34 × 15 px, 4 px apart              | Screen 3: segments 62 board px wide, 28 tall, 8 apart.                                                                                      |
| **The Flat Rule** — no shadows                     | The pixel immediately left of every card edge is exactly `#F6F6F4`. There is no gradient, so there is no shadow.                            |
| **The Borders Mean Something Rule**                | The only stroke in the whole picture is the 2 px `#A43A16` overdue border. Ordinary cards go white → background with no intermediate value. |
| Card radius 10 px, button radius 12 px             | Corner settles after 19 board px on a card, 23 on the primary button.                                                                       |
| Bottom nav sits on the background, not a white bar | Column samples through the nav band read `#F6F6F4`, not `#FFFFFF`.                                                                          |
| Active nav = colour **and** weight                 | "Hjem" is Amber Ink and heavier; "Oppgaver" is Muted Text.                                                                                  |

## The tick-off moment

| Rule                                          | Where the picture shows it                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| The screen is full-bleed yellow, edge to edge | [`screen-4-tick-moment.png`](reference/screen-4-tick-moment.png): yellow runs from the top of the status bar to below the buttons. |
| It does not go dark                           | There is no dark surface on screen 4 except the tick badge and the "Ferdig" button.                                                |
| Depth on yellow is a darker shade of yellow   | Inset card `#DBA434`, meter track `#C59430`.                                                                                       |
| Undo is offered plainly, same size as confirm | "Angre" and "Ferdig" are the same height, side by side, with "Du kan angre i 5 minutter" above. No confirmshaming.                 |

## Rules the picture does **not** support — dropped

| Candidate rule                                       | Why it was not written                                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Yellow only as a surface" (from the ST-729 guide)   | Contradicted: yellow fills buttons and meters on screens 2, 3 and 5.                                       |
| "One yellow area per screen" (from the ST-729 guide) | Contradicted: screen 5 has five.                                                                           |
| "The tick moment goes dark" (from the ST-729 guide)  | Contradicted: screen 4 is full-bleed yellow.                                                               |
| "Points chips sit on a sunk grey background"         | The picture shows "10 p" as plain amber type on white, no chip background. Sampled `#FFFFFF` behind it.    |
| "Overdue rows get a pink fill"                       | The picture shows a **white** fill with a rust border. See [`row-overdue.png`](reference/row-overdue.png). |
| "Primary buttons carry a darker gold border"         | The picture's primary button goes straight from `#F6F6F4` to `#F6B93B` with no border line.                |
| Any dark-mode token set                              | The picture is "lys modus" only. A dark mode is a new sign-off, not a rule.                                |

These last four are differences from the **earlier ST-729 CSS**, not from the picture. The ST-729
sources use `--bg: #EDEFEC`, `--text: #101316`, a pink `--late-bg`, a grey points chip, a bordered
primary button and a `.dark` block "used only by the points moment". The signed-off picture matches
none of those. **Do not treat the ST-729 stylesheet as the token source.**

## Known gaps in the picture

Not faults — just things the five screens do not cover, which therefore are **not** signed off and
must be labelled as additions when they are designed:

- empty, loading, error and offline states;
- settings, auth and onboarding screens;
- any dark mode;
- landscape and tablet widths;
- motion: the picture is still, so no timing or easing is signed off.

## Unverified in this pass

- **Font identity** is evidence-based, not documentary: Hanken Grotesk and Bricolage Grotesque are
  the faces shipped with the earlier Diddit design sources, and rendering them reproduces the
  picture's ink boxes to within ~3%. That is strong, but it is a match, not a stated fact from the
  file that produced the picture. If the source HTML for this exact render turns up, confirm.
- **Board scale.** Every CSS px value here assumes the picture's own caption, "telefon 390 px", is
  exact, giving 1.846 board px per CSS px. A 2% error in that assumption moves every size by 2%.
