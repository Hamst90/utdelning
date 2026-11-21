# utdelning

Reklamutdelning – en webbapp för att dela ut reklam på ett distrikt.

Appen: https://hamst90.github.io/utdelning/

## Så används den

1. Spara veckans adresslista från utdelare.nu som PDF (Dela → Spara i Filer).
2. Öppna appen i Safari, gå till **Lista** och välj PDF:en. Listan läses i telefonen – portkoderna lagras inte i det här repot.
3. Lägg appen på hemskärmen: Dela → Lägg till på hemskärmen.

## Funktioner

- **Rutt:** kort per hus i gångordning med koder, taggar och instruktioner. Klar-knapp för nästa hus längst ner.
- **Karta:** OpenStreetMap med numrerade nålar, rutten som linje och den egna positionen. Nålar kan flyttas om en adress hamnar fel.
- **Rapportering per hus:** hur många som vill ha reklam, problem med kod/tagg/grind och anteckning.
- **Smart rutt:** hoppar över hus där ingen vill ha reklam eller där man inte kommer in. Hus där ingen vill ha reklam kontrolleras var 8:e vecka, eller direkt om antalet hushåll ändras. Får ett hus ny kod i listan tas det med igen.
- **Rapport:** färdig text till arbetsgivaren med åtkomstproblem och hur många som vill ha reklam.

All data sparas i telefonens webbläsare (säkerhetskopia finns under Lista) och – om kalkylarket är kopplat – i Google Kalkylark.

## Koppla Google Kalkylark

1. Öppna kalkylarket → **Tillägg → Apps Script**.
2. Ta bort koden som står där och klistra in hela `apps-script.gs`. Spara.
3. **Implementera → Ny implementering → Webbapp**. Kör som: *Jag*. Vem har åtkomst: *Alla*. Implementera och godkänn behörigheterna.
4. Kopiera webbappens länk (slutar på `/exec`) och klistra in den i appen under **Lista → Kalkylark**.

Fliken *Rapporter* skapas automatiskt med en rad per hus och vecka. Portkoder skickas aldrig. Ändras skriptet senare: **Implementera → Hantera implementeringar → redigera → Ny version**.

## Filer

- `index.html` – appen
- `apps-script.gs` – skriptet till kalkylarket (klistras in i Apps Script, används inte av sidan)
- `pdf.min.js`, `pdf.worker.min.js` – [pdf.js](https://github.com/mozilla/pdf.js) 4.10.38 (Apache-2.0) för att läsa PDF:en
