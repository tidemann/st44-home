# Diddit på skjerm — de 8 sidereglene, tegnet (barne-, oppsett- og innloggingssidene, 2 av 2)

**Signert bilde (spesifikasjonen):** `docs/design/diddit/reference/desktop-07-opsjon-A-1440.png`,
`desktop-12-anbefalt-A-mine-oppgaver-1440.png` (barnets oppgaveskjerm) og
`login-19-desktop-1440x900.png` (innloggingen). **Veileder:** `docs/design/diddit/DESIGN-GUIDE.md`
→ *Desktop and tablet — layout A* og *The login screen*. **Målt i dag:**
[ST-1345](/ST/issues/ST-1345#document-review). **Del 1:** [ST-1409](/ST/issues/ST-1409#document-pictures).

Ni bilder, ett per side, 1440 px, lys modus, norsk innhold, samme oppdiktede familie som i del 1.
De 8 reglene fra [ST-1370](/ST/issues/ST-1370) er lagt på, og ingenting annet.

## Hvordan de er laget

Som i del 1: sidene er **appen selv**, ikke en tegning. `ng serve` på `origin/main` (51f41dc) i to
arbeidstrær — ett uten reglene (venstre halvdel i arkene) og ett med dem — API-et mokket med
oppdiktede data, `deviceScaleFactor: 2`, og den samme *settle*-ventingen som i runde 2 av del 1
(nettverket i ro, ingen «Laster/Henter», ingen plassholderrad). Begge halvdelene i hvert par er
tegnet i samme kjøring. Gren `ida/st-1410-rules-pictures` (33e9bcb) — **ikke for main.**
Skriptene: `st1410-shoot.js`, `.st1410/measure.js`, `.st1410/audit.js`, `.st1410/cols.js`,
`.st1410/worst.js`, `.st1410/sheet.js`, `.st1410/worstsheet.js`.

## Tallene Astrid sjekker

Målt i pikslene på DPR 2-filene (felt, tittelblekk) og i DOM-en (bredde, spalter, knapper).

| Side | Bilde | Innhold @ x | Tittel | Felt | Spalter |
| --- | --- | --- | --- | --- | --- |
| Mine oppgaver (barn) | `rules-mine-oppgaver-barn-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **270** | 428 + 24 + 428 |
| Belønninger (barn) | `rules-belonninger-barn-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **282** | 428 + 24 + 428 |
| Ny husstand (veiviser) | `rules-ny-husstand-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Logg inn | `rules-logg-inn-1440.png` | gult panel + skjema ✅ | **34**/800 ✅ (regel 3) | eget merkeområde | login-19 |
| Opprett konto | `rules-opprett-konto-1440.png` | gult panel + skjema ✅ | **34**/800 ✅ (regel 3) | eget merkeområde | login-19 |
| Barnas innlogging | `rules-barnas-innlogging-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Glemt passord | `rules-glemt-passord-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Sett nytt passord | `rules-sett-nytt-passord-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |
| Invitasjon (lenke) | `rules-invitasjon-1440.png` | **880 @ 280** ✅ | 26/800 @ 280 ✅ | **191** | én 428 |

- **Hovedknappen** måler **428 × 49, hjørne 13,0, etikett 16,5**, gul `rgb(246,185,59)` med blekk
  `rgb(23,18,10)`, `opacity: 1` og `disabled: false` på alle fem skjemasidene. På «Logg inn» og
  «Opprett konto» er den 382 × 49 / 13 / 16,5 — innloggingsbildets egen spaltebredde, urørt.
- **Spaltene** måles i DOM-en til **428 @ x 280 og 428 @ x 732** på begge barnesidene: 428 + 24 + 428.
- **Luften under underlinja** er **20 px** på alle fire feltene som bare bærer tittel og underlinje
  (ST-1065-regelen), og feltet ender 17 px under det laveste det bærer: 191.
- `scrollWidth = 1440` på alle ni.

Oversikt i dag mot med reglene: `rules-overview-1.png` (Mine oppgaver, Belønninger, Ny husstand,
Logg inn, Opprett konto) og `rules-overview-2.png` (Barnas innlogging, Glemt passord, Sett nytt
passord, Invitasjon).

## Én linje per side: hvilke regler endret den, og hva jeg valgte

| Side | Hva reglene gjorde | Åpent valg jeg tok |
| --- | --- | --- |
| **Mine oppgaver (barn)** | **Nesten ingenting** — den traff 1, 2, 3 og 4 fra før (880 @ 280, 26/800, felt 270, to 428-spalter), som ST-1345 sa. Bare **7**: lastingen var «Laster oppgavene dine…» og feilen bar tekst; nå er det plassholderrader og det hvite kortet. Paret i arket er derfor likt — det er meningen. | — |
| **Belønninger (barn)** | 1 (600 på x 420 → 880 på x 280), 4 (én stabel → to spalter), 7 («Henter belønninger…» → plassholderrader; «Ingen belønninger ennå!» og feilen → det hvite kortet med tittellinje, setning og hovedknapp). | Spaltene: **det du kan be om til venstre, det du har bedt om til høyre** (venter / hentet før / nei denne gangen). Feltet er **282** som i dag, og poengtallet står igjen der det står. |
| **Ny husstand (veiviser)** | 1 (480 på x 504 → 880 på x 280), 2 (bare fanerad, 80 → 191 med tittel og underlinje), 3 (30/800 inne i kortet → 26/800 i feltet), 4 (ett 428-skjema), 5 («Neste» 60,8 høy med 18 px etikett → 49/13/16,5 i spaltas bredde), 6 («Neste» var blek og grå, 2,67:1, før du skrev — nå gul fra start), 8 (🔔 over «Slå på påminnelser» er fjernet). | **Stegets eget spørsmål er sidetittelen** («Hva heter familien?»), med **«Steg 1 av 4»** som underlinje — samme ord som sto inni kortet, flyttet dit regel 2 sier. Framdriftsstreken (de fire strekene) står øverst i spalta. |
| **Logg inn** | **Ingenting.** Reglene 5–8 holdt allerede: hovedknapp 49/13/16,5, omrissknappene like store, øyet 44/10, gul knapp fra start med sjekk på trykk, norsk tekst, Diddit-merket. Bildet er med for å vise at reglene lar siden stå. | Regel 3 lar den beholde 34 px; regel 1 og 2 gjelder den ikke — veilederen gir innloggingen sitt eget merkeområde («no band; it has its own brand area»), det **634 px gule panelet**. |
| **Opprett konto** | **Ingenting**, samme som «Logg inn» — den deler `login.css`. | Som over. |
| **Barnas innlogging** | 1 (480 på x 512 → 880 på x 280), 2 (ikke noe gult noe sted → felt 191), 3 (40/800 → 26/800), 4 (ett 428-skjema), 5 («🚀 Logg inn» 78,4 høy med 24 px etikett → 49/13/16,5), 6 (knappen var blek og grå, 3,48:1, før du skrev), 8 (📧 🔐 🙈 og raketten er borte; øyet er tegnet; «Spor en forelder» → «**Spør** en forelder»). | Samme ord i feltet som i dag: «Velkommen tilbake!» / «La oss komme i gang med oppgavene dine». |
| **Glemt passord** | 1 (480 på x 528 → 880 på x 280), 2 (felt 191), 3 (30/800 engelsk → 26/800), 4 (ett 428-skjema), 5 + 6 («Send Reset Link» var blek, 3,48:1 → «Send lenke», gul, 49/13/16,5), 7 (kvitteringen er det hvite kortet), 8 (**hele siden var engelsk**: «Forgot Your Password?», «Enter your email and we'll send you a link…», «Email Address», «Send Reset Link», «Back to login»; og tekst-«Diddit!» → merket + ordmerket i feltet). | Tittelen er **«Glemt passord»** (sidenavnet i oppgaven) med underlinja **«Vi sender deg en lenke»**; den engelske setningen er flyttet ned som skjemaets ledetekst på norsk. |
| **Sett nytt passord** | 1 (400 på x 552 → 880 på x 280), 2 (felt 191), 3 (**24/600 `#15181C`, midtstilt** — appens letteste sidetittel → 26/800 blekk, venstre), 4 (ett 428-skjema), 5 (knappen var 336 × 49,6 med **6 px hjørne**), 6 (og **grå `#ECECE8`** — nå gul fra start), 7 (kvitteringen er det hvite kortet), 8 (👁️ / 👁️‍🗨️ → det tegnede øyet). | Underlinja: **«Velg et passord du husker»**. Knappen heter «Sett passordet» (samme handling som «Tilbakestill passord», i sidens egen tittelform). |
| **Invitasjon (lenke)** | 1 (440 på x 532 → 880 på x 280), 2 (felt 191), 3 (ingen 26/800-tittel → «Invitasjon»), 4 (én 428-spalte med de to handlingene), 5 (begge knappene 49/13/16,5 — hovedknapp og omriss), 7 (feil og kvittering er det samme hvite kortet), 8 (**hele siden var engelsk**: «Household Invitation», «You've been invited…», «Accept Invitation», «Decline»). | Begge halvdelene i paret viser **innlogget** tilstand (godta/avslå), ikke «logg inn først». Underlinja: «Du er invitert inn i en husstand». |

## Det ene valget som er verdt et blikk

**De fire innloggingssidene får Diddit-merket i sitt eget gule felt.** Regel 1 sier at en sides
venstre kant er venstre kant av Diddit-merket **i menyen** — og disse fire sidene har ingen meny.
Jeg lot dem bære merket selv: den samme 80 px gule raden som menyens fanerad, samme 880 px, samme
oppsett (merke 36 + ordmerke 26/800 blekk), uten faner og uten initialmerke, siden ingen er logget
inn ennå. Da får både regel 1 (venstre kant = merket, x 280) og regel 2 (tittel og underlinje i
det gule feltet, 191) noe å feste seg i, uten å finne på noe nytt: hver verdi er hentet fra
`app-top-tabs` eller fra innloggingsbildet.

Alternativet var å gi dem innloggingens **634 px gule panel**. Det ville vært nærmere
`login-19`, men det er regel 3 som peker den andre veien: den gir bare «Logg inn» og «Opprett
konto» unntak, og sier dermed at de andre innloggingssidene ikke er innloggingsbildet.

## Verste tilfelle (`rules-verste-tilfelle-2.png`)

Barnenavn på 28 tegn, seks oppgaver med 66 tegns titler, **tom** belønningsliste med 1480 poeng på
kontoen, husstandsnavn på 44 tegn i veiviseren, og de tre innloggingsskjemaene **trykket tomme**.

- **Ingenting renner ut vannrett:** `scrollWidth = 1440` i alle seks, tittelen står på 26/800 @ 280
  og spaltene på 428 + 24 + 428 (ett 428-skjema på innloggingssidene).
- **Regel 6 er det man ser best:** ingen av de tre skjemaene er en blindvei. Knappen er gul fra
  start, og trykket skriver feilen under feltet den gjelder — «Vennligst oppgi en gyldig
  e-postadresse», «Passordet må være minst 8 tegn», «Passordene samsvarer ikke».
- Lange oppgavetitler brekker til to linjer i en høyere rad; den tomme belønningslista er det
  hvite kortet, ikke en bar setning.

## Tre ting reglene ikke rører

1. **Barnas to felt er fortsatt ulike** (ST-1345 **F8**): «Mine oppgaver» setter poengtallet til
   høyre for navnet (desktop-12), «Belønninger» stabler det under underlinja, derav 270 mot 282.
   Ingen av de 8 reglene sier hvor i feltet poengtallet skal stå, så jeg flyttet det ikke.
2. **Fanestripa «Ønsker / Belønninger»** finnes ikke på barnets side; den er foreldrenes (del 1).
3. **Veiviserens steg 2–5** (QR-koder, oppgavevalg, påminnelser) er de samme sidene som i dag, med
   reglenes ramme rundt. Bildet viser steg 1, som er det siden åpner på.

## WCAG

Ingen ny farge, ingen ny skrift, ingen ny komponent: feltetiketten er 13 px `#15181C` på hvitt,
ledeteksten `#555E64` på papiret (6,12:1), lenkene `#8A5A00`, feillinja rusten `#A43A16`, og blekk
på gult er 10,57:1 som før.

**Tre ting ble bedre av reglene:**

- **W2 · 3.1.1 Språk:** «Glemt passord» og invitasjonssiden var engelske inne i en norsk app. Nå er
  de norske.
- **W4 · 1.1.1:** emojiene som ikoner er borte — 📧 🔐 🙈 og raketten på barnas innlogging, 👁️ på
  «Sett nytt passord», 🔔 i veiviseren. En skjermleser leste dem opp ved navn.
- **Regel 6 fjerner de grå blindveiene ST-1345 målte:** veiviserens «Neste» (2,67:1), barnas
  «Logg inn» (3,48:1) og «Send Reset Link» (3,48:1). Knappen er gul fra start, og sjekken skjer på
  trykket, som innloggingen alltid har gjort.
