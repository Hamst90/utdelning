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

All data sparas i telefonens webbläsare (säkerhetskopia finns under Lista).

## Filer

- `index.html` – appen
- `pdf.min.js`, `pdf.worker.min.js` – [pdf.js](https://github.com/mozilla/pdf.js) 4.10.38 (Apache-2.0) för att läsa PDF:en
