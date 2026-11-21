/**
 * Utdelningsrutt – koppling till Google Kalkylark
 *
 * Klistra in hela den här filen i kalkylarkets skript (Tillägg → Apps Script),
 * spara och publicera som webbapp:
 *   Implementera → Ny implementering → Typ: Webbapp
 *   Kör som: Jag   ·   Vem har åtkomst: Alla
 * Kopiera webbappens länk (slutar på /exec) och klistra in den i appen under Lista → Kalkylark.
 *
 * Fliken "Rapporter" skapas automatiskt: en rad per hus och vecka.
 */

const FLIK = 'Rapporter';
const KOLUMNER = ['Period', 'Datum', 'Distrikt', 'Nr', 'Adress', 'Hushåll', 'Vill ha reklam',
  'Status', 'Problem', 'Anteckning', 'Uppdaterad', 'Nyckel'];
const NYCKEL_KOL = KOLUMNER.length; // sista kolumnen

function flik_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(FLIK);
  if (!sh) {
    sh = ss.insertSheet(FLIK);
    sh.getRange(1, 1, 1, KOLUMNER.length).setValues([KOLUMNER]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.hideColumns(NYCKEL_KOL);
  }
  return sh;
}

// Text som börjar med = + - @ skulle tolkas som formel – gör den till ren text.
function text_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function svar_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Appen skickar rader hit. Samma hus samma vecka skrivs över i stället för att dubbleras. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    const rader = Array.isArray(data.rows) ? data.rows : [];
    const sh = flik_();
    const sista = sh.getLastRow();
    const index = {};
    if (sista > 1) {
      const nycklar = sh.getRange(2, NYCKEL_KOL, sista - 1, 1).getValues();
      nycklar.forEach((r, i) => { if (r[0]) index[r[0]] = i + 2; });
    }
    const nya = [];
    rader.forEach(r => {
      const nyckel = String(r.period || '') + '|' + String(r.address || '').toLowerCase();
      const varden = [
        text_(String(r.period || '')), text_(r.date), text_(r.district), r.order === undefined ? '' : r.order,
        text_(r.address), r.hh === undefined ? '' : r.hh, r.vill === null || r.vill === undefined ? '' : r.vill,
        text_(r.status), text_(r.problem), text_(r.note), new Date(r.updated || Date.now()), nyckel
      ];
      if (index[nyckel]) sh.getRange(index[nyckel], 1, 1, varden.length).setValues([varden]);
      else { nya.push(varden); index[nyckel] = -1; }
    });
    if (nya.length) sh.getRange(sh.getLastRow() + 1, 1, nya.length, KOLUMNER.length).setValues(nya);
    return svar_({ ok: true, saved: rader.length });
  } catch (err) {
    return svar_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Appen hämtar raderna härifrån (för att testa kopplingen eller återställa på en ny telefon). */
function doGet(e) {
  const sh = flik_();
  const sista = sh.getLastRow();
  if (e && e.parameter && e.parameter.ping) return svar_({ ok: true, rows: Math.max(0, sista - 1) });
  if (sista < 2) return svar_({ ok: true, rows: [] });
  const v = sh.getRange(2, 1, sista - 1, KOLUMNER.length).getValues();
  const rader = v.map(r => ({
    period: String(r[0]).replace(/^'/, ''), address: String(r[4]).replace(/^'/, ''), hh: r[5],
    vill: r[6] === '' ? null : Number(r[6]), status: r[7], problem: r[8],
    note: String(r[9]).replace(/^'/, ''), updated: r[10] instanceof Date ? r[10].getTime() : 0
  }));
  return svar_({ ok: true, rows: rader });
}
