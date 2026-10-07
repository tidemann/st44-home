---
name: Diddit
description: A family chore app where points are the hero and the yellow is never rationed
colors:
  yellow: '#F6B93B'
  ink: '#17120A'
  text: '#15181C'
  text-muted: '#555E64'
  amber-ink: '#8A5A00'
  overdue: '#A43A16'
  done: '#0F7A54'
  surface: '#FFFFFF'
  background: '#F6F6F4'
  track: '#ECECE8'
  yellow-inset: '#DBA434'
  yellow-track: '#C59430'
typography:
  display:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '106px'
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: '-0.02em'
  display-sm:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '90px'
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '30px'
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: '-0.01em'
  number:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '32px'
    fontWeight: 800
    lineHeight: 1
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Hanken Grotesk, system-ui, sans-serif'
    fontSize: '17px'
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: 'Hanken Grotesk, system-ui, sans-serif'
    fontSize: '15px'
    fontWeight: 600
    lineHeight: 1.3
  meta:
    fontFamily: 'Hanken Grotesk, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: 'Hanken Grotesk, system-ui, sans-serif'
    fontSize: '13px'
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: '6px'
  md: '10px'
  lg: '12px'
  xl: '20px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  xxl: '24px'
components:
  button-primary:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    height: '53px'
    typography: '{typography.body}'
  button-solid:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
    rounded: '{rounded.md}'
    height: '53px'
    typography: '{typography.body}'
  button-ghost-on-yellow:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    height: '53px'
    typography: '{typography.body}'
  button-row-action:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    height: '44px'
    typography: '{typography.label}'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    padding: '12px 16px'
  card-overdue:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    padding: '12px 16px'
  card-inset-on-yellow:
    backgroundColor: '{colors.yellow-inset}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '12px 16px'
  chip-filter-active:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
    rounded: '{rounded.sm}'
    typography: '{typography.label}'
  chip-filter:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.sm}'
    typography: '{typography.label}'
  meter-segment:
    backgroundColor: '{colors.yellow}'
    rounded: '{rounded.pill}'
    height: '15px'
    width: '34px'
  meter-segment-empty:
    backgroundColor: '{colors.track}'
    rounded: '{rounded.pill}'
    height: '15px'
    width: '34px'
---

# Design System: Diddit

## The signed-off picture is the spec

![Diddit — Retning 3, Poeng, lys modus: five screens signed off by Stig](reference/poeng-signed-off.png)

`reference/poeng-signed-off.png` — "Retning 3 – Poeng · lys modus", five screens, phones at 390 px.
Signed off by Stig (owner). Source of record: ST-744.

**Everything in this guide describes that picture.** The picture outranks the guide. If a rule here
would remove, tone down, or ration something the picture visibly does, the rule is wrong — delete the
rule, keep the picture. Check your work against the picture first and against this text second.

This is not a hypothetical failure mode. On ST-729 a style guide was written whose rules were
_stricter_ than the picture ("yellow only as a surface", "one yellow area per screen", "the tick
moment goes dark"). The screens built from those rules had the yellow drained out of them, every
review passed because every review checked the rules, and Stig rejected the result. See
**Banned rules** at the end of this file.

## Overview

**Creative North Star: "The Reward Is The Interface"**

Diddit is a family chore app, in Norwegian, light mode. The product promise is that a child earns
points and can see them. So the points are literally the largest thing on the screen: a 90 px black
numeral on a child's own screen, 106 px in the moment a chore is ticked off. Nothing else on the
screen competes with it. Everything around it is small, quiet and ordinary — plain white cards on a
near-white background, a 17 px row title, a 14 px line of context underneath.

The yellow is the second voice, and it is a loud one. It is not an accent reserved for one special
button; it fills primary buttons, every per-item action button, every progress meter, and the entire
background of the screen where a chore gets ticked off. On the rewards screen it appears five times.
The system's warmth comes from using it freely; the discipline is in the _text colour on top of it_
(always near-black ink), not in rationing the yellow itself.

Depth is tonal, not shadowed. A white card on a near-white screen is the only layering device on the
light screens; on the yellow screen, depth is a _darker shade of the same yellow_. There are no drop
shadows and no card borders anywhere in the picture — the one border that exists marks an overdue
chore, and it is red because it means something.

**Key Characteristics:**

- Points are the hero: one enormous tabular numeral per child screen, never a second hero near it.
- Yellow is used freely and is always one hex (`#F6B93B`), never lightened, muted or greyed.
- Near-black ink on yellow, always (10.57:1). White on yellow never appears.
- Flat: no shadows, no card strokes; a white card on `#F6F6F4` is the whole depth system.
- Every state that uses colour also uses a word: "Forfalt", "Gjort 16.10", "35 igjen".
- Light mode only. The picture is "lys modus" and there is no signed-off dark mode.

## Colors

A single warm yellow against warm-neutral greys, with three small semantic colours that only appear
where they carry meaning.

### Primary

- **Diddit Yellow** (`#F6B93B`): the one yellow. Primary buttons, per-row action buttons ("Hak av"),
  per-reward buttons ("Spør mor"), filled meter segments, and the full-bleed background of the
  tick-off moment. It is a surface colour and a fill colour, not a text colour: at 1.76:1 against
  white it must never carry type or a hairline on its own.

### Secondary

- **Ink** (`#17120A`): the near-black that lives _on_ the yellow — all text, icons, meter fills,
  the tick badge, and the solid "Ferdig" button on the yellow screen. 10.57:1 on the yellow.
- **Amber Ink** (`#8A5A00`): the small amber type — points values on a chore row ("10 p") and the
  active bottom-nav label. 5.93:1 on white. It reads as "this is about points" without adding a
  second yellow surface. It is a _white-background_ colour: on the yellow it is only 3.36:1 and
  must not be used for text there.

### Tertiary

- **Overdue Rust** (`#A43A16`): the "Forfalt" word, the 2 px border on an overdue card, and the
  "1 av 3 gjort" line on a child card that is behind. 6.57:1 on white.
- **Done Green** (`#0F7A54`): the filled checkmark on a completed chore and "Du har nok poeng" on
  an affordable reward. 5.34:1 on white; white tick on the green is the same 5.34:1.

### Neutral

- **Text** (`#15181C`): headings, screen titles, and the big point numerals on white.
- **Muted Text** (`#555E64`): dates, "Mathea – kl. 16.30", inactive nav labels. 6.62:1 on white.
- **Surface** (`#FFFFFF`): cards.
- **Background** (`#F6F6F4`): the screen behind the cards, and the bottom nav band — the nav is not
  a separate white bar.
- **Track** (`#ECECE8`): the unfilled segments of a meter on a white screen.

### On-yellow neutrals

The yellow screen does not borrow greys. Its two surfaces are darker shades of the same hue:

- **Yellow Inset** (`#DBA434`): the inset card on the yellow screen (the "next chore" block).
  Ink on it is still 8.31:1.
- **Yellow Track** (`#C59430`): unfilled meter segments on the yellow screen, against ink fills
  at 6.79:1.

### Named Rules

**The Keep-The-Yellow Rule.** When contrast fails on or around the yellow, you change the _other_
side: text colour, weight, size, or a darker shade of the same hue on a small area. You never
desaturate, lighten, grey out, or replace the yellow, and you never swap a yellow surface for a
neutral one to pass a check. Black on yellow is the system's answer; it already passes AAA.

**The Ink-On-Yellow Rule.** Anything sitting on `#F6B93B` is `#17120A`. White text on the yellow
(1.76:1) does not exist in this system at any size.

**The Say-It-In-Words Rule.** No state is carried by colour alone. Overdue is red _and_ the word
"Forfalt". Done is green _and_ a timestamp. A meter always has its number beside it ("35 igjen",
"225 av 250 poeng"). This is what keeps a 1.49:1 filled-vs-empty meter conformant and legible.

## Typography

**Display Font:** Bricolage Grotesque (fallback `system-ui, sans-serif`) — weight 800 only.
**Body Font:** Hanken Grotesk (fallback `system-ui, sans-serif`) — weights 500 and 600.

**Character:** A tight, heavy grotesque for every number and screen title, and a calm humanist
grotesque for everything a person reads as a sentence. The pairing does the hierarchy on its own:
there is no third font, no italic, and no uppercase tracking anywhere in the picture.

Both faces were confirmed by rendering the actual webfonts and matching ink boxes against the
picture (widths within ~3% for eleven of twelve sampled strings). The fonts ship with the earlier
Diddit sources as `hanken.woff2` and `bricolage.woff2`.

### Hierarchy

Sizes are CSS px at 390 px phone width, measured off the picture by calibrating each string against
the real webfont (±1 px).

- **Display** (Bricolage 800, 106 px, line-height 0.95, −0.02em, tabular): the points won in the
  tick-off moment — "+10". The single largest thing in the product.
- **Display sm** (Bricolage 800, 90 px, 0.95, −0.02em, tabular): a child's total on their own
  screen — "215", "225". One per screen, top-left, with a 17 px "poeng" under it.
- **Number** (Bricolage 800, 32 px, 1.0, tabular): a child's total on a family card — "340".
- **Title** (Bricolage 800, 30 px, 1.15): the screen name — "Hjemme", "Oppgaver", "Jonas".
- **Body** (Hanken 600, 17 px, 1.35): chore titles, button labels, the "poeng" unit.
- **Label** (Hanken 600, 15 px, 1.3): status words that must be read fast — "Forfalt".
- **Meta** (Hanken 500, 14 px, 1.4): who and when ("Mathea – kl. 16.30"), group labels
  ("Igjen i dag"), points values on a row ("10 p").
- **Caption** (Hanken 600, 13 px, 1.3): bottom-nav labels.

### Named Rules

**The Tabular Numbers Rule.** Every number uses `font-variant-numeric: tabular-nums`. Points change
while a child is looking at them; proportional figures make the total jiggle as it counts. This is
measurable in the picture: the big numerals are 18–25% wider than proportional figures would be.

**The One Hero Rule.** A screen has exactly one number in Display or Display sm. The tick-off moment
has "+10" and nothing else that size; the child screen has the total and nothing else that size.

## Layout

A 390 px phone, single column, content scrolling between a fixed title area and a fixed bottom nav.

- **Screen gutter: 8 px.** Cards run close to the edge — a card is 375 px wide on a 390 px screen.
  This is deliberate: the rows are the content, and the picture gives them the width.
- **Card rhythm: 8 px between cards**, with a larger break before a group label
  ("Forfalt", "I dag", "Gjort i dag").
- **Card padding: 16 px** horizontal; a chore row is **74 px** tall.
- **Primary button:** full content width (375 px), **53 px** tall, pinned to the bottom of the
  scroll area above the nav.
- **Meters:** segments 34 × 15 px with a 4 px gap, filling the content width; the matching number
  sits on the same line as the meter's label.
- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24. 4 is for meter gaps only; 8 is the default gap
  between siblings; 16 is the default padding inside a surface.

The reference board's phone frames are 390 × ~945 px — taller than a real device so a whole screen
fits without scrolling. A device-true screenshot (390 × 844) is shorter than the reference frame.
That is expected and is not a difference from the spec.

## Elevation & Depth

**There are no shadows and no card borders in this system.** Depth is tonal only:

- On a light screen: `#FFFFFF` card on a `#F6F6F4` background. That 1.18:1 step is the entire
  elevation vocabulary, and it is enough because the cards are large and edge-to-edge.
- On the yellow screen: `#DBA434` inset on `#F6B93B`. Same idea, same hue, one step darker.

A border in this system means something. The only stroke in the picture is the 2 px `#A43A16`
border on an overdue card.

### Named Rules

**The Flat Rule.** No `box-shadow` anywhere. If something needs to separate from what is behind it,
step the tone — do not lift it.

**The Borders Mean Something Rule.** A visible stroke is reserved for state (overdue) and for the
ghost button outline. A card never gets a decorative hairline.

## Shapes

Softly rounded rectangles throughout; nothing is a circle except the person badges.

- **Cards and rows:** 10 px.
- **Buttons:** 12 px for the full-width primary and the on-yellow pair; 10 px for row-level
  action buttons.
- **Filter chips:** 6 px.
- **Meter segments:** fully rounded (pill) — 15 px tall, so the radius reads as a lozenge.
- **The tick badge** on the yellow screen: a ~55 px rounded square at roughly 20 px radius,
  the one piece of geometry that is allowed to look like a stamp.

## Components

### Buttons

- **Shape:** gently rounded (12 px primary, 10 px row-level).
- **Primary** (`button-primary`): Diddit Yellow fill, Ink label, **no border**, full content width,
  53 px tall, Body 17 px / 600. Used for the one creating action on a screen ("+ Ny oppgave").
- **Row action** (`button-row-action`): the same yellow fill and ink label at row scale — "Hak av"
  on an overdue or due chore, "Spør mor" on a reward. **Several per screen is correct**: the
  rewards screen has three.
- **Solid dark** (`button-solid`): Ink fill, white label — only for the confirming action inside
  the yellow moment ("Ferdig"), where a yellow button would disappear into the background.
- **Ghost on yellow** (`button-ghost-on-yellow`): transparent on the yellow with an outlined edge
  and Ink label — the escape hatch ("Angre"). Draw the outline in **Ink**, not in a darker gold:
  the sampled gold line is 2.10:1 against the yellow and misses the 3:1 a control boundary needs.
- **Hit area:** every button is at least 44 × 44 px, including the row-level ones.

### Chips

- **Filter chips** ("Alle / Emma / Jonas / Mathea"): 6 px radius. Selected is an Ink fill with a
  white label; unselected is a white fill with Ink label. Selection is a fill change, not a
  colour-only tint.

### Cards and rows

- **Chore row** (`card`): white, 10 px, 16 px padding, 74 px tall. Left to right: a checkbox
  (24 × 24 px rounded square inside a ≥44 px target), the chore title (Body 17), the who-and-when line
  (Meta 14, muted), then the points at the right in Amber Ink ("10 p") — plain type, **no chip
  background**.
- **Overdue row** (`card-overdue`): the same white card with a 2 px Overdue Rust border, the word
  "Forfalt" above the group, and its context line in rust. The fill stays white — an overdue row is
  not a pink block.
- **Done row:** white card, a filled Done Green square with a white tick, and the time it was done
  ("Gjort 16.10") — never a tick on its own.
- **Child card** (family screen): name in Meta, total in Number 32, the word "poeng", a thin meter,
  and "1 av 2 gjort" underneath.
- **Inset on yellow** (`card-inset-on-yellow`): `#DBA434` block on the yellow screen carrying the
  next chore.

### Meters

- Segmented, not continuous: 34 × 15 px pills, 4 px apart.
- On white: Diddit Yellow filled, `#ECECE8` empty.
- On the yellow screen: Ink filled, `#C59430` empty.
- **A meter is never alone.** It always carries its own number — "35 igjen", "225 av 250 poeng",
  "75 igjen" — on the label line above or beside it.

### Navigation

- Four items: Hjem · Oppgaver · Belønninger · Familie. Icon above a 13 px label.
- The bar sits on the screen background (`#F6F6F4`), not on a white bar.
- Active is Amber Ink with the heavier weight; inactive is Muted Text. Two signals, not one.
- Each target is at least 44 px tall.

### The tick-off moment (signature)

The single most important screen in the product, and the one most likely to be designed wrongly.

- **The whole screen is `#F6B93B`, edge to edge, including behind the status bar and the buttons.**
  It does not go dark. It does not dim. It does not become a yellow card on a neutral screen.
- Ink tick badge top-left (~55 px rounded square), then the chore title in Title, then
  "Haket av 16.48" in Meta.
- "+10" in Display (106 px) with "poeng" set small on the baseline beside it.
- The reward meter below in Ink-on-`#C59430`, with "225 av 250 poeng" and "25 igjen".
- An inset `#DBA434` card for the next chore.
- "Du kan angre i 5 minutter", then **Angre** (ghost) and **Ferdig** (solid ink) side by side.
  The undo is offered plainly, in the same size as the confirm — no confirmshaming.

## Do's and Don'ts

### Do:

- **Do** use `#F6B93B` as often as the screen needs it — buttons, per-row actions, meters, and a
  full-bleed background are all correct uses, several per screen.
- **Do** put `#17120A` on every yellow surface (10.57:1).
- **Do** fix a contrast failure by changing the text colour, weight or size, or by using a darker
  shade of the same hue on a small area (`#DBA434`, `#C59430`).
- **Do** pair every colour-coded state with a word or a number.
- **Do** use tabular figures for every number.
- **Do** keep the system flat — tonal steps, never shadows.
- **Do** keep a visible, equal-weight undo on anything that awards or spends points.

### Don't:

- **Don't** desaturate, lighten, mute or grey the yellow to pass a contrast check, and don't
  replace a yellow surface with a neutral one. Change the ink, keep the yellow.
- **Don't** put white text on the yellow (1.76:1), or Amber Ink text on the yellow (3.36:1).
- **Don't** ration the yellow to one element per screen.
- **Don't** make the tick-off moment dark, dimmed, or a card on a neutral screen.
- **Don't** add `box-shadow`, card borders, or a second accent colour.
- **Don't** let a meter be the only carrier of a number.
- **Don't** introduce a third typeface, uppercase tracking, or italics.
- **Don't** redesign a signed-off screen — see the next section.

## Banned rules

These three rules were written into an earlier Diddit style guide, were followed faithfully, and
produced the screens Stig rejected on ST-729. They contradict the signed-off picture. Do not
reintroduce them under any wording.

| Banned rule                  | What the picture actually shows                                                  |
| ---------------------------- | -------------------------------------------------------------------------------- |
| "Yellow only as a surface"   | Yellow fills buttons and meter segments, not only backgrounds (screens 2, 3, 5). |
| "One yellow area per screen" | The rewards screen has five: three "Spør mor" buttons and two meters.            |
| "The tick moment goes dark"  | Screen 4 is a full-bleed **yellow** screen with a dark badge on it.              |

The general form of the mistake: **a rule that is stricter than the picture.** Every rule in this
file must hold for the picture itself. If you write one that does not, the rule is the defect.

## Changing this system

The five screens in `reference/poeng-signed-off.png` are **locked**. They are not a starting point
to be improved.

- Do not run `quieter`, `distill`, `bolder`, `colorize`, or any redesign pass over a signed-off
  screen.
- Any change to the look — removing a colour, switching a mode, making a button plain, adding a
  dark mode — goes to Maria as a written "Changes from the signed-off picture" list **before** the
  drawings, not after. It is the owner's call, not the designer's.
- Accessibility fixes that stay inside the look (text colour, weight, size, a darker shade of the
  same hue, a larger hit area) do not need that route. Fixes that remove colour do.
- New screens that the picture does not cover (empty, loading, error, settings) are built from this
  vocabulary and must be labelled as additions, not presented as signed off. The picture contains
  no empty, loading or error state.

## Rendering screens as pictures

For HTML → PNG renders, so new work can be compared with the reference at the same scale:

| Case                                | Setting                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A single screen, device-true        | viewport **390 × 844**, `deviceScaleFactor: 2` → 780 × 1688 px                                                                                    |
| Rebuilding the 5-up reference board | frames **390 × 945** css, **63 px** gutters, rendered at **1.846×** (the reference board is 4260 × 2044 px with 720 px frames and 116 px gutters) |

Playwright in this runner: pin
`executablePath: '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'` and set
`LD_LIBRARY_PATH=/paperclip/.cache/chromium-sysroot/usr/lib/x86_64-linux-gnu:/paperclip/.cache/chromium-sysroot/lib/x86_64-linux-gnu`.

**Always compare side by side.** Put the signed-off picture and the new render in one image at the
same scale before handing in, and list every visible difference with its reason. A difference with
no reason is a fault.

## Accessibility

Light mode, Norwegian, WCAG 2.2 AA as the floor. Measured from the picture:

| Pair                                     | Ratio         | Verdict                        |
| ---------------------------------------- | ------------- | ------------------------------ |
| Ink `#17120A` on Yellow `#F6B93B`        | 10.57:1       | AAA                            |
| Text `#15181C` on white                  | 17.81:1       | AAA                            |
| White on Ink (solid button)              | 17.81:1       | AAA                            |
| Ink on Yellow Inset `#DBA434`            | 8.31:1        | AAA                            |
| Muted `#555E64` on white / `#F6F6F4`     | 6.62 / 6.12:1 | AA+                            |
| Overdue `#A43A16` on white / `#F6F6F4`   | 6.57 / 6.07:1 | AA+                            |
| Amber Ink `#8A5A00` on white / `#F6F6F4` | 5.93 / 5.48:1 | AA+                            |
| Done `#0F7A54` on white                  | 5.34:1        | AA+                            |
| White on Yellow                          | 1.76:1        | **banned — never use**         |
| Amber Ink on Yellow                      | 3.36:1        | **not for text on the yellow** |

Every text colour in the signed-off picture already clears 4.5:1. **No contrast fix in this system
requires touching the yellow.**

Three things the picture leaves to implementation, all fixable inside the look:

1. **Meter segments.** Filled yellow against the `#ECECE8` track is 1.49:1. It conforms because the
   number is always stated in text next to the meter (1.4.1 / 1.4.11), but for low-vision users give
   filled segments a 1 px `#8A5A00` outline — that is ≥3:1 against both the track and the card, and
   it keeps the yellow. Darkening the track does not help: the yellow is light, so a grey of similar
   lightness can never reach 3:1 against it.
2. **The "Angre" outline.** Sampled at ≈`#A87E29` on the yellow, which is 2.10:1 — below the 3:1 that
   1.4.11 requires for a control boundary. Draw it in Ink instead. Same shape, same yellow, legal
   edge.
3. **The unchecked checkbox.** Its outline samples at `#DFDFD9` — 1.34:1 against the white card,
   far below the 3:1 a form control needs, and this is the single most-pressed control in the
   product. Draw the resting outline in Muted Text `#555E64` (6.62:1). The box stays 24 × 24 px and
   the look is unchanged at a glance.

Also required of any build of these screens:

- Focus visible on every control, drawn outside the element (`outline: 2.5px solid #17120A;
outline-offset: 2px`) so it reads on white and on yellow alike.
- Touch targets ≥44 × 44 px — the checkbox's visible box is 24 px and needs a padded target.
- Respect `prefers-reduced-motion` on the tick-off moment: the award can appear without animating.
- Norwegian `lang="nb"`; the points number needs an accessible label ("215 poeng"), not just a
  numeral.
- Never colour alone: the picture already pairs every state with a word, and so must every new
  screen.
