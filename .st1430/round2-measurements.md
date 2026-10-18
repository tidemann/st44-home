# ST-1430 round 2 — the numbers the review sent back, re-measured

Everything below is read off `.st1430/rules2/*.png` and `.st1430/press/*.png`
(1440 × 900, deviceScaleFactor 2) and the DOM fingerprints taken in the same frame.

## A2 and A3 — the text box is the same field as the others

| Popup | text box | fill (pixels) | first ink | inset | edge | round 1 |
| --- | --- | --- | --- | --- | --- | --- |
| «Beskrivelse» (ny-oppgave) | **396 × 76 px** at x 522 | #FFFFFF | x 540 | **18 px** | 1px rgb(85, 94, 100) | Paper `#F6F6F4` |
| «Beskrivelse» (rediger-oppgave) | **396 × 76 px** at x 522 | #FFFFFF | x 540 | **18 px** | 1px rgb(85, 94, 100) | Paper `#F6F6F4` |
| «Personlig melding» (inviter) | **396 × 76 px** at x 522 | #FFFFFF | x 540 | **18 px** | 1px rgb(85, 94, 100) | 183 px wide, ~2 px inset, Paper |

Control, the e-post field in the same popup: **396 × 49 px** at x 522, first ink x 539 = **17 px** inset. The text box and the field are now the same column and the same inset.

## Control — rules 1, 2 and 8 still hold after the round-2 changes

| Popup | surface | air over / under | title |
| --- | --- | --- | --- |
| ny-oppgave | x 506, y 48, **428 × 804 px** | 48 / 48 px | 27px |
| bytt-husstand | x 506, y 297.7, **428 × 304.5 px** | 297.7 / 297.8 px | 27px |
| rediger-oppgave | x 506, y 143.2, **428 × 613.6 px** | 143.2 / 143.2 px | 27px |
| flytt-oppgave | x 506, y 285.3, **428 × 329.4 px** | 285.3 / 285.3 px | 27px |
| slett-oppgaver | x 506, y 338, **428 × 223.9 px** | 338 / 338.1 px | 27px |
| legg-til-barn | x 506, y 211.9, **428 × 476.2 px** | 211.9 / 211.9 px | 27px |
| barnedetaljer | x 506, y 48, **428 × 804 px** | 48 / 48 px | 27px |
| inviter | x 506, y 179.7, **428 × 540.6 px** | 179.7 / 179.7 px | 27px |
| qr-kode | x 506, y 382, **428 × 136 px** | 382 / 382 px | 27px |
| slette-belonningen | x 506, y 367.8, **428 × 164.5 px** | 367.8 / 367.7 px | 27px |
| be-om-belonning | x 506, y 261.7, **428 × 376.6 px** | 261.7 / 261.7 px | 27px |
| ny-husholdning | x 506, y 278.1, **428 × 343.8 px** | 278.1 / 278.1 px | 27px |
| endre-husholdning | x 506, y 292.5, **428 × 315 px** | 292.5 / 292.5 px | 27px |
| forlat-husholdningen | x 506, y 244.3, **428 × 411.4 px** | 244.3 / 244.3 px | 27px |
| slett-husholdningen | x 506, y 254.8, **428 × 390.4 px** | 254.8 / 254.8 px | 27px |
| varsler | x 988, y 688.1, **428 × 187.9 px** | right 24 / bottom 24 px | 27px |
| hjemskjerm | x 988, y 658, **428 × 218 px** | right 24 / bottom 24 px | 27px |

| Popup | left edge / right edge (pixels, windowed) | width | edge colour |
| --- | --- | --- | --- |
| ny-oppgave | x 498.5 … 942.5 | **444 px** | #A9A7A4 |
| bytt-husstand | x 498.5 … 942.5 | **444 px** | #A9A7A4 |
| rediger-oppgave | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| flytt-oppgave | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| slett-oppgaver | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| legg-til-barn | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| barnedetaljer | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| inviter | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| qr-kode | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| slette-belonningen | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| be-om-belonning | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| ny-husholdning | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| endre-husholdning | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| forlat-husholdningen | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| slett-husholdningen | x 498.5 … 941.5 | **443 px** | #A9A7A4 |
| varsler | x 988 … 1416 | **428 px** | #555E64 |
| hjemskjerm | x 988 … 1416 | **428 px** | #555E64 |

## Rule 4 — the six popups, pressed on an incomplete form

| Popup | main action | fill | `disabled` | field in error | the line under that field |
| --- | --- | --- | --- | --- | --- |
| ny-oppgave | «Legg til» 194 × 49 px | #F6B93B, label 10.57:1 | **false** | #task-name 2px rgb(164, 58, 22) | «Oppgavenavn er obligatorisk» 15px/500 rgb(164, 58, 22), 6.57:1 |
| rediger-oppgave | «Lagre» 126.7 × 49 px | #F6B93B, label 10.57:1 | **false** | **two:** #task-name (y 102.4) and #points (y 370.2), both 2px rgb(164, 58, 22) | **two:** «Oppgavenavn er obligatorisk» (y 157.4) and «Poeng må være mellom 1 og 1000» (y 425.2), both 15px/500 rgb(164, 58, 22), 6.57:1 |
| flytt-oppgave | «Tilordne på nytt» 194 × 49 px | #F6B93B, label 10.57:1 | **false** | #child-select 2px rgb(164, 58, 22) | «Velg et barn» 15px/500 rgb(164, 58, 22), 6.57:1 |
| legg-til-barn | «Legg til barn» 194 × 49 px | #F6B93B, label 10.57:1 | **false** | #child-name 2px rgb(164, 58, 22) | «Barnets navn er obligatorisk» 15px/500 rgb(164, 58, 22), 6.57:1 |
| inviter | «Send invitasjon» 194 × 49 px | #F6B93B, label 10.57:1 | **false** | #invite-email 2px rgb(164, 58, 22) | «E-postadresse er obligatorisk» 15px/500 rgb(164, 58, 22), 6.57:1 |
| ny-husholdning | «Opprett» 194 × 49 px | #F6B93B, label 10.57:1 | **false** | #create-name 2px rgb(164, 58, 22) | «Skriv inn et navn på husholdningen» 15px/500 rgb(164, 58, 22), 6.57:1 |

**«Rediger oppgave» is the one frame with two errors at once** (finding 4 on ST-1465): the empty name
*and* a «Poeng» value outside 1–1000. Each wrong field keeps its own 2 px edge and its own line under
it; nothing is gathered into a banner. The five others have one field wrong, so they show one line. The
error is the guide's `field-text-error` (2 px rust, no icon) — not the approved login's form-level
error, which marks both its fields and carries a warning icon above the action.

## Rule 6 — the closed field, which is all a picture can hold

| Popup | `<select>` | appearance | caret | height |
| --- | --- | --- | --- | --- |
| ny-oppgave | yes | none | diddit | 49 px |
| rediger-oppgave | yes | none | diddit | 49 px |
| flytt-oppgave | yes | none | diddit | 49 px |
| legg-til-barn | yes | none | diddit | 49 px |
| inviter | yes | none | diddit | 49 px |
