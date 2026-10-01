/**
 * Sechem backend v3: authenticated reads and one calculator record per Google sub.
 * Keep the existing private SALT when upgrading the bound Apps Script.
 * Do not copy that value into GitHub, logs, screenshots or client code.
 * Form responses remain intact. Only attributable records enter the merged pool.
 * Requires Google Forms email collection to remain VERIFIED (not manual input).
 * No triggers or configureForm execution are required.
 */
const CONFIG = {
  SPREADSHEET_ID: '1YVkOOZewABO6NKHNd0T33HaMMAgNGZRIPy4F1xZGPOM',
  FORM_ID: '1zJFk-Yvxe-lA_lkIiRISQSKJZheKpd_RWLz0ZZGb7bU',
  FORM_SHEET: 'תגובות לטופס 1',
  CALC_SHEET: 'מחשבון',
  CLIENT_ID: '294846711314-uvs3679bbgdg8ju9kdidreehmon9vnc7.apps.googleusercontent.com',
  SALT: 'SET_PRIVATE_SALT_IN_APPS_SCRIPT',
};
const API_VERSION = 3;
const CALC_HEADERS = ['uid', 'עודכן לאחרונה', 'סכם קוגניטיבי', 'מו"ר', 'מסלול',
  'מילא/ה גם את הטופס', 'מספר עדכונים', 'נוצר', 'מזהי מייל פנימיים', 'גרסאות טופס בעת שמירה'];

function fail_(code, message) {
  const error = new Error(message);
  error.publicCode = code;
  throw error;
}
function doGet() {
  // No respondent data, email hashes or account IDs on the public GET endpoint.
  return json_({ ok: true, apiVersion: API_VERSION, requiresAuth: true });
}
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (typeof raw !== 'string' || raw.length > 16000) fail_('INPUT', 'בקשה לא תקינה.');
    let body;
    try { body = JSON.parse(raw); } catch (_) { fail_('INPUT', 'בקשה לא תקינה.'); }
    if (!body || body.apiVersion !== API_VERSION ||
        !['session', 'save'].includes(body.action)) {
      fail_('VERSION', 'נדרשת הגרסה החדשה של המחשבון. יש לרענן את הדף.');
    }
    const identity = verifyIdentity_(body.id_token);
    const scores = body.action === 'save' ? validateScores_(body) : null;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) fail_('BUSY', 'השרת עסוק. אפשר לנסות שוב, בלי ליצור רשומה כפולה.');
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const forms = readForms_(ss);
      let calcs = readCalcs_(ss);
      assertUnambiguousIdentity_(identity, calcs);
      let saved = null;
      if (scores) {
        saved = saveCalc_(ss, calcs, forms, identity, scores);
        calcs = readCalcs_(ss);
      }
      const data = mergeData_(forms, calcs, identity);
      return json_({ ok: true, apiVersion: API_VERSION, saved,
        updated: new Date().toISOString(), ...data });
    } finally { lock.releaseLock(); }
  } catch (error) {
    // Never echo Google responses, claims, tokens, spreadsheet values or raw exceptions.
    return json_({ ok: false, apiVersion: API_VERSION,
      code: error.publicCode || 'SERVER',
      error: error.publicCode ? error.message : 'לא ניתן להשלים את הבקשה כרגע. נסה/י שוב.' });
  }
}
function verifyIdentity_(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 8192) {
    fail_('AUTH', 'יש להתחבר מחדש עם Google.');
  }
  let response;
  try {
    response = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
      { muteHttpExceptions: true });
  } catch (_) { fail_('AUTH_SERVICE', 'שירות אימות ההתחברות אינו זמין כרגע. נסה/י שוב.'); }
  if (response.getResponseCode() !== 200) fail_('AUTH', 'ההתחברות נדחתה. יש להתחבר מחדש.');
  let info;
  try { info = JSON.parse(response.getContentText()); } catch (_) {
    fail_('AUTH_SERVICE', 'לא ניתן לאמת את ההתחברות כרגע.');
  }
  if (info.aud !== CONFIG.CLIENT_ID ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(info.iss) ||
      !Number.isFinite(Number(info.exp)) || Number(info.exp) * 1000 <= Date.now() ||
      typeof info.sub !== 'string' || !info.sub ||
      !(info.email_verified === true || info.email_verified === 'true')) {
    fail_('AUTH', 'יש להתחבר מחדש עם חשבון Google מאומת.');
  }
  const email = normalizeEmail_(info.email);
  if (!email) fail_('AUTH', 'החשבון לא סיפק כתובת מייל מאומתת.');
  const authoritative = email.endsWith('@gmail.com') ||
    (typeof info.hd === 'string' && !!info.hd.trim());
  return { uid: hash_(info.sub), emailKey: hash_('email|' + email), authoritative };
}
function normalizeEmail_(value) {
  let email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  if (email.endsWith('@googlemail.com')) email = email.replace(/@googlemail\.com$/, '@gmail.com');
  if (email.endsWith('@gmail.com')) {
    const parts = email.split('@');
    email = parts[0].replace(/\./g, '') + '@gmail.com';
  }
  return email;
}
function validateScores_(body) {
  if (typeof body.cog !== 'number' || !Number.isFinite(body.cog) || body.cog < 200 || body.cog > 800) {
    fail_('INPUT', 'סכם קוגניטיבי חייב להיות מספר בין 200 ל־800.');
  }
  if (body.mor !== null && (typeof body.mor !== 'number' || !Number.isFinite(body.mor) ||
      body.mor < 150 || body.mor > 250)) {
    fail_('INPUT', 'ציון מו״ר חייב להיות בין 150 ל־250, או ללא ציון.');
  }
  if (!['A', 'B', 'U', 'M'].includes(body.track)) fail_('INPUT', 'יש לבחור מסלול.');
  return { c: body.cog, m: body.mor, t: body.track };
}
function scoresFromRow_(c, m, t) {
  const cog = Number(c), mor = Number(m);
  if (!Number.isFinite(cog) || cog < 200 || cog > 800) return null;
  if (m !== '' && m !== null && Number.isFinite(mor) && mor !== 0 &&
      (mor < 150 || mor > 250)) return null;
  if (m !== '' && m !== null && !Number.isFinite(mor)) return null;
  return { c: cog, m: mor >= 150 && mor <= 250 ? mor : null, t };
}
function trackCode_(s) {
  if (/מילואים/.test(s)) return 'M';
  if (/ראיון|פנימי/.test(s)) return 'B';
  if (/מו.ר|מרק/.test(s)) return 'A';
  return 'U';
}
function readForms_(ss) {
  const sh = ss.getSheetByName(CONFIG.FORM_SHEET);
  if (!sh) fail_('SCHEMA', 'לשונית הסקר אינה זמינה. לא בוצעה שמירה.');
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(x => String(x).trim());
  const pos = {
    date: headers.indexOf('חותמת זמן'),
    track: headers.indexOf('באיזה מסלול את/ה מתמיין/ת?'),
    cog: headers.indexOf('ציון סכם קוגנטיבי'),
    mor: headers.indexOf('ציון המו״ר / מרק״ם שלך'),
    email: headers.indexOf('כתובת אימייל')
  };
  if (Object.values(pos).some(x => x < 0)) fail_('SCHEMA', 'מבנה הסקר השתנה. לא בוצעה שמירה.');
  const identified = new Map();
  let historical = 0, invalid = 0;
  values.slice(1).forEach((row, index) => {
    if (row.every(x => x === '')) return;
    const score = scoresFromRow_(row[pos.cog], row[pos.mor], trackCode_(String(row[pos.track])));
    if (!score) { invalid++; return; }
    const email = normalizeEmail_(row[pos.email]);
    if (!email) { historical++; return; }
    const emailKey = hash_('email|' + email);
    const timestamp = new Date(row[pos.date]).getTime() || 0;
    const form = { ...score, emailKey, timestamp, order: index,
      gmail: email.endsWith('@gmail.com'),
      version: hash_(JSON.stringify([timestamp, score.c, score.m, score.t])) };
    const previous = identified.get(emailKey);
    if (!previous || timestamp >= previous.timestamp) identified.set(emailKey, form);
  });
  return { identified, historical, invalid };
}
function parseAliases_(cell) {
  try {
    const parsed = JSON.parse(cell || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter(x => /^[a-f0-9]{24}$/.test(x)))] : [];
  } catch (_) { return []; }
}
function parseVersions_(cell) {
  try {
    const parsed = JSON.parse(cell || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) { return {}; }
}
function readCalcs_(ss) {
  const sh = ss.getSheetByName(CONFIG.CALC_SHEET);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (!CALC_HEADERS.slice(0, 8).every((h, i) => values[0][i] === h)) {
    fail_('SCHEMA', 'מבנה לשונית המחשבון השתנה. לא בוצעה שמירה.');
  }
  // Old rows are preserved; if duplicates already exist, count only the newest.
  const unique = new Map();
  values.slice(1).forEach((row, index) => {
    const uid = String(row[0]);
    if (!/^[a-f0-9]{24}$/.test(uid)) return;
    const score = scoresFromRow_(row[2], row[3], /^[ABUM]$/.test(row[4]) ? row[4] : 'U');
    if (!score) return;
    const calc = { ...score, uid, row: index + 2, timestamp: new Date(row[1]).getTime() || 0,
      count: Number(row[6]) || 0, created: row[7], linked: typeof row[8] === 'string' && row[8].startsWith('['),
      aliases: parseAliases_(row[8]),
      versions: parseVersions_(row[9]) };
    if (!unique.has(uid) || calc.timestamp >= unique.get(uid).timestamp) unique.set(uid, calc);
  });
  return [...unique.values()];
}
function assertUnambiguousIdentity_(identity, calcs) {
  if (!identity.authoritative) return;
  if (calcs.some(c => c.uid !== identity.uid && c.aliases.includes(identity.emailKey))) {
    fail_('IDENTITY_CONFLICT', 'כתובת המייל משויכת לרשומה של חשבון אחר. נדרשת בדיקת מנהל; לא בוצע איחוד או שינוי.');
  }
}
function saveCalc_(ss, calcs, forms, identity, score) {
  const previous = calcs.find(c => c.uid === identity.uid);
  const aliases = previous ? previous.aliases.slice() : [];
  if (identity.authoritative && !aliases.includes(identity.emailKey)) aliases.push(identity.emailKey);
  aliases.sort();
  const versions = {};
  aliases.forEach(key => { versions[key] = forms.identified.has(key) ? forms.identified.get(key).version : ''; });
  const unchanged = previous && previous.c === score.c && previous.m === score.m &&
    previous.t === score.t && JSON.stringify(previous.aliases.slice().sort()) === JSON.stringify(aliases) &&
    JSON.stringify(previous.versions) === JSON.stringify(versions);
  if (unchanged) return { changed: false };
  let sh = ss.getSheetByName(CONFIG.CALC_SHEET);
  if (!sh) { sh = ss.insertSheet(CONFIG.CALC_SHEET); sh.setFrozenRows(1); }
  sh.getRange(1, 1, 1, CALC_HEADERS.length).setValues([CALC_HEADERS]);
  const now = new Date();
  const record = [identity.uid, now, score.c, score.m === null ? '' : score.m, score.t,
    false, previous ? previous.count + 1 : 1, previous ? previous.created : now,
    JSON.stringify(aliases), JSON.stringify(versions)];
  if (previous) sh.getRange(previous.row, 1, 1, record.length).setValues([record]);
  else sh.appendRow(record);
  SpreadsheetApp.flush();
  return { changed: true };
}
function publicScore_(record, self) {
  return { c: record.c, m: record.m, t: record.t, self: !!self };
}
function mergeData_(forms, calcs, identity) {
  // Ownership uses Google sub; email is only a verified cross-source matching key.
  const consumed = new Set(), rows = [], owners = new Map();
  let unresolved = 0;
  calcs.forEach(c => c.aliases.forEach(key => {
    const set = owners.get(key) || new Set(); set.add(c.uid); owners.set(key, set);
  }));
  calcs.forEach(calc => {
    const self = calc.uid === identity.uid;
    if (!calc.linked && !self) { unresolved++; return; }
    const aliases = new Set(calc.aliases);
    if (self && identity.authoritative) aliases.add(identity.emailKey);
    let chosen = calc;
    let newestChangedForm = null;
    aliases.forEach(key => {
      const form = forms.identified.get(key);
      if (!form) return;
      consumed.add(key);
      if (owners.has(key) && owners.get(key).size > 1) { unresolved++; return; }
      // A new/edited form response since the calculator save supersedes that save.
      // A subsequent calculator save records the form version and takes priority again.
      if (calc.versions[key] !== form.version &&
          (!newestChangedForm || form.timestamp >= newestChangedForm.timestamp)) newestChangedForm = form;
    });
    if (newestChangedForm) chosen = newestChangedForm;
    rows.push(publicScore_(chosen, self));
  });
  forms.identified.forEach((form, key) => {
    if (consumed.has(key)) return;
    const self = identity.authoritative && key === identity.emailKey;
    // Without a Workspace identity linking it, a third-party email is not proof of ownership.
    if (!form.gmail && !self) { unresolved++; return; }
    rows.push(publicScore_(form, self));
  });
  return { rows, counts: { identified: rows.length, historical: forms.historical,
    unresolved, invalid: forms.invalid },
    identityNotice: identity.authoritative ? '' :
      'החשבון מזוהה לפי Google, אך התאמה אוטומטית לטופס לפי כתובת מייל חיצונית אינה זמינה ללא אימות נוסף.' };
}
function hash_(value) {
  if (!CONFIG.SALT || /SET_PRIVATE|CHANGE|PASTE|REPLACE/i.test(CONFIG.SALT)) {
    fail_('CONFIG', 'השרת טרם הוגדר לשמירה מאובטחת.');
  }
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    value + '|' + CONFIG.SALT, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('').slice(0, 24);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
