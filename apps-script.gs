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
 * Lägg till skriptegenskapen PIN (Projektinställningar → Skriptegenskaper). Den krävs för att hämta rapporterna
 * och adresslistorna (PDF:erna innehåller portkoder) och för att ladda upp nya listor.
 * Kör funktionen installera() en gång: den skapar Drive-mappen för adresslistorna.
 */

const FLIK = 'Rapporter';
const KOLUMNER = ['Period', 'Datum', 'Distrikt', 'Nr', 'Adress', 'Hushåll', 'Vill ha reklam',
  'Status', 'Problem', 'Anteckning', 'Uppdaterad', 'Nyckel'];
const NYCKEL_KOL = KOLUMNER.length; // sista kolumnen
const MAPPNAMN = 'Utdelning – adresslistor';
const PLATS_FLIK = 'Platser';
const PLATS_KOLUMNER = ['Adress', 'Lat', 'Lon', 'Manuell', 'Uppdaterad'];

/** Fliken med kartplatser, delade mellan telefonerna så att adresserna bara behöver sökas en gång. */
function platsFlik_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PLATS_FLIK);
  if (!sh) {
    sh = ss.insertSheet(PLATS_FLIK);
    sh.getRange(1, 1, 1, PLATS_KOLUMNER.length).setValues([PLATS_KOLUMNER]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function pinOk_(pin) {
  const ratt = PropertiesService.getScriptProperties().getProperty('PIN');
  return !!ratt && String(pin || '') === String(ratt);
}

/** Drive-mappen där adresslistorna (PDF) ligger. Skapas första gången. */
function mapp_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('MAPP');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const m = DriveApp.createFolder(MAPPNAMN);
  props.setProperty('MAPP', m.getId());
  return m;
}

/** Kör en gång från redigeraren för att godkänna Drive-behörigheten och skapa mappen. */
function installera() {
  const m = mapp_();
  Logger.log('Lägg adresslistorna (PDF) i: ' + m.getUrl());
}

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
    if (data.action === 'upload') {
      if (!pinOk_(data.pin)) return svar_({ ok: false, error: 'PIN' });
      const namn = String(data.name || 'Adresslista.pdf').replace(/[\\/]/g, '-');
      const befintliga = mapp_().getFilesByName(namn);
      while (befintliga.hasNext()) befintliga.next().setTrashed(true); // samma lista igen ersätter den gamla
      const fil = mapp_().createFile(Utilities.newBlob(Utilities.base64Decode(data.data), 'application/pdf', namn));
      return svar_({ ok: true, id: fil.getId() });
    }
    if (data.action === 'places') {
      if (!pinOk_(data.pin)) return svar_({ ok: false, error: 'PIN' });
      const sh = platsFlik_(), sista = sh.getLastRow(), index = {}, manuell = {};
      if (sista > 1) sh.getRange(2, 1, sista - 1, 4).getValues().forEach((r, i) => { index[r[0]] = i + 2; manuell[r[0]] = r[3] === true || r[3] === 'ja'; });
      const nya = [];
      Object.keys(data.places || {}).forEach(k => {
        const v = data.places[k];
        if (!v || typeof v.lat !== 'number' || typeof v.lon !== 'number') return;
        if (manuell[k] && !v.manual) return; // en handplacerad nål skrivs inte över av adressökningen
        const rad = [text_(k), v.lat, v.lon, v.manual ? 'ja' : '', new Date()];
        if (index[k]) sh.getRange(index[k], 1, 1, rad.length).setValues([rad]);
        else { nya.push(rad); index[k] = -1; }
      });
      if (nya.length) sh.getRange(sh.getLastRow() + 1, 1, nya.length, PLATS_KOLUMNER.length).setValues(nya);
      return svar_({ ok: true });
    }
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

/**
 * Appen hämtar härifrån. Allt utom ?ping=1 kräver PIN-koden (Projektinställningar → Skriptegenskaper → PIN):
 *   ?pin=…                 rapportraderna (för att återställa på en ny telefon)
 *   ?action=lists&pin=…    adresslistorna (PDF) i Drive-mappen
 *   ?action=pdf&id=…&pin=… en adresslista, base64-kodad
 *   ?action=places&pin=…   delade kartplatser
 * ?ping=1 svarar bara med antalet rader (för att testa kopplingen).
 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const sh = flik_();
  const sista = sh.getLastRow();
  if (p.ping) return svar_({ ok: true, rows: Math.max(0, sista - 1) });
  if (!pinOk_(p.pin)) return svar_({ ok: false, error: 'PIN' });
  if (p.action === 'lists') {
    const filer = [], it = mapp_().getFiles();
    while (it.hasNext()) {
      const f = it.next();
      if (f.getMimeType() === 'application/pdf' || /\.pdf$/i.test(f.getName()))
        filer.push({ id: f.getId(), name: f.getName(), modified: f.getLastUpdated().getTime(), size: f.getSize() });
    }
    filer.sort((a, b) => b.modified - a.modified);
    return svar_({ ok: true, files: filer });
  }
  if (p.action === 'places') {
    const ps = platsFlik_(), n = ps.getLastRow(), platser = {};
    if (n > 1) ps.getRange(2, 1, n - 1, 4).getValues().forEach(r => {
      if (r[0] && r[1] !== '' && r[2] !== '') platser[String(r[0]).replace(/^'/, '')] = [Number(r[1]), Number(r[2]), r[3] === 'ja' ? 1 : 0];
    });
    return svar_({ ok: true, places: platser });
  }
  if (p.action === 'pdf') {
    const f = DriveApp.getFileById(p.id);
    if (!f.getParents().hasNext() || f.getParents().next().getId() !== mapp_().getId()) return svar_({ ok: false, error: 'Okänd fil' });
    return svar_({ ok: true, name: f.getName(), data: Utilities.base64Encode(f.getBlob().getBytes()) });
  }
  if (sista < 2) return svar_({ ok: true, rows: [] });
  const v = sh.getRange(2, 1, sista - 1, KOLUMNER.length).getValues();
  const rader = v.map(r => ({
    period: String(r[0]).replace(/^'/, ''), address: String(r[4]).replace(/^'/, ''), hh: r[5],
    vill: r[6] === '' ? null : Number(r[6]), status: r[7], problem: r[8],
    note: String(r[9]).replace(/^'/, ''), updated: r[10] instanceof Date ? r[10].getTime() : 0
  }));
  return svar_({ ok: true, rows: rader });
}
