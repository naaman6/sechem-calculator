/**
 * מחשבון סכם · שרת נתונים (Google Apps Script)
 * ------------------------------------------------
 * תפקידים:
 *  1. doGet  – מחזיר את נתוני הסקר (טופס + מחשבון) כ-JSON אנונימי לקריאה מהמחשבון.
 *  2. doPost – מקבל נתונים מהמחשבון יחד עם אסימון Google (ID token), מאמת אותו,
 *              ושומר/מעדכן שורה אחת בלבד לכל משתמש (לפי מזהה Google מוצפן).
 *  3. configureForm – מגדיר את טופס הסקר: תשובה אחת לאדם + אפשרות עריכה אחרי השליחה.
 *
 * התקנה (פעם אחת):
 *  א. בגיליון התגובות: תוספים → Apps Script → להדביק את הקובץ הזה.
 *  ב. למלא CLIENT_ID (מזהה OAuth שנוצר ב-Google Cloud Console) ו-SALT (מחרוזת אקראית כלשהי).
 *  ג. להריץ פעם אחת את configureForm (יבקש הרשאות).
 *  ד. פריסה → פריסה חדשה → "אפליקציית אינטרנט" → "הרץ בתור: אני" → "גישה: כל אחד".
 *     להעתיק את כתובת ה-Web app אל CONFIG.API_URL בקובץ index.html של המחשבון.
 */

const CONFIG = {
  SPREADSHEET_ID: '1YVkOOZewABO6NKHNd0T33HaMMAgNGZRIPy4F1xZGPOM',
  FORM_ID: '1zJFk-Yvxe-lA_lkIiRISQSKJZheKpd_RWLz0ZZGb7bU',
  FORM_SHEET: 'תגובות לטופס 1',
  CALC_SHEET: 'מחשבון',
  CLIENT_ID: 'PASTE_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com',
  SALT: 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',
};

const CALC_HEADERS = ['uid', 'עודכן לאחרונה', 'סכם קוגניטיבי', 'מו"ר', 'מסלול', 'מילא/ה גם את הטופס', 'מספר עדכונים', 'נוצר'];

/* ---------- GET: נתונים לקריאה ---------- */
function doGet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const form = readFormRows_(ss);
  const calc = readCalcRows_(ss);
  return json_({ ok: true, updated: new Date().toISOString(), form, calc });
}

function readFormRows_(ss) {
  const sh = ss.getSheetByName(CONFIG.FORM_SHEET);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const cog = Number(r[2]);
    if (!cog || cog < 200 || cog > 800) continue;
    const mor = Number(r[3]);
    out.push({ c: cog, m: (mor >= 151 && mor <= 250) ? mor : null, t: trackCode_(String(r[1] || '')) });
  }
  return out;
}

function readCalcRows_(ss) {
  const sh = ss.getSheetByName(CONFIG.CALC_SHEET);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const cog = Number(r[2]);
    if (!cog || cog < 200 || cog > 800) continue;
    const mor = Number(r[3]);
    out.push({ uid: String(r[0]), c: cog, m: (mor >= 151 && mor <= 250) ? mor : null, t: String(r[4] || 'U'), f: r[5] === true || r[5] === 'TRUE' });
  }
  return out;
}

function trackCode_(s) {
  if (/מילואים/.test(s)) return 'M';
  if (/ראיון|פנימי/.test(s)) return 'B';
  if (/מו.ר|מרק/.test(s)) return 'A';
  return 'U';
}

/* ---------- POST: שמירה/עדכון של שורה אחת למשתמש ---------- */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const info = verifyToken_(body.id_token);
    const uid = hash_(info.sub);

    const cog = Number(body.cog);
    const mor = body.mor === null || body.mor === '' ? null : Number(body.mor);
    const track = String(body.track || '');
    if (!(cog >= 200 && cog <= 800)) throw new Error('סכם קוגניטיבי לא תקין');
    if (mor !== null && !(mor >= 151 && mor <= 250)) throw new Error('ציון מו"ר לא תקין');
    if (!/^[ABUM]$/.test(track)) throw new Error('מסלול לא תקין');

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sh = ss.getSheetByName(CONFIG.CALC_SHEET);
    if (!sh) { sh = ss.insertSheet(CONFIG.CALC_SHEET); sh.appendRow(CALC_HEADERS); sh.setFrozenRows(1); }

    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const vals = sh.getDataRange().getValues();
      let rowIdx = -1;
      for (let i = 1; i < vals.length; i++) if (String(vals[i][0]) === uid) { rowIdx = i + 1; break; }
      const now = new Date();
      if (rowIdx === -1) {
        sh.appendRow([uid, now, cog, mor === null ? '' : mor, track, !!body.filledForm, 1, now]);
      } else {
        const prevN = Number(vals[rowIdx - 1][6]) || 0;
        const created = vals[rowIdx - 1][7] || now;
        sh.getRange(rowIdx, 1, 1, CALC_HEADERS.length).setValues([[uid, now, cog, mor === null ? '' : mor, track, !!body.filledForm, prevN + 1, created]]);
      }
    } finally { lock.releaseLock(); }

    return json_({ ok: true, uid, updated: new Date().toISOString() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* אימות אסימון Google מול שרתי Google (tokeninfo) */
function verifyToken_(idToken) {
  if (!idToken) throw new Error('חסר אסימון התחברות');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('האסימון נדחה, יש להתחבר מחדש');
  const info = JSON.parse(res.getContentText());
  if (info.aud !== CONFIG.CLIENT_ID) throw new Error('האסימון אינו שייך למחשבון זה');
  if (!info.sub) throw new Error('אסימון ללא מזהה');
  return info;
}

/* מזהה חד-ערכי ואנונימי: SHA-256 של מזהה Google + מלח. לא נשמר מייל ולא שם. */
function hash_(s) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s + '|' + CONFIG.SALT, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('').slice(0, 24);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- הגדרת הטופס: תשובה אחת לכל חשבון Google + עריכה בדיעבד ---------- */
function configureForm() {
  const form = FormApp.openById(CONFIG.FORM_ID);
  form.setLimitOneResponsePerUser(true);   // דורש התחברות לחשבון Google; תשובה אחת לאדם
  form.setAllowResponseEdits(true);        // המשיב/ה יכול/ה לערוך את התשובה אחרי השליחה
  form.setCollectEmail(false);             // לא נאסף מייל – הטופס נשאר אנונימי
  form.setConfirmationMessage('תודה. ניתן לערוך את התשובה בכל עת דרך הקישור "ערוך את התשובה" או בכניסה חוזרת לטופס מאותו חשבון Google.');
  Logger.log('Form configured: limitOne=%s, allowEdits=%s, collectEmail=%s',
    form.hasLimitOneResponsePerUser(), form.canEditResponse(), form.collectsEmail());
}
