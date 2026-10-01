'use strict';
// Keep authentication and saving in index.html; this file only reads scores and renders scenarios.
const results=$('result');
results.innerHTML=`
  <h2><span class="step">2</span> סכם סופי משוער: השוואת תרחישים</h2>
  <div class="note"><strong>אין כאן המלצה לוותר על המו״ר או הסתברות קבלה.</strong>
  זהו סקר התנדבותי. ההתפלגות של המיון הפנימי, המתאם למו״ר ושיטת התקנון אינם ידועים.
  טווחי הסימולציה מותנים בהנחות ואינם רווחי סמך לאוכלוסיית המועמדים.</div>
  <div class="mini" style="margin-top:18px">
    <div><label for="sampleMode">קבוצת ההשוואה</label>
      <select id="sampleMode"><option value="expanded">מזוהים + היסטוריים: ייתכנו כפילויות</option><option value="identified">מזוהים בלבד: מאגר מאוחד ללא כפילויות זהות</option></select></div>
    <div><label for="scoreMethod">נוסחת הסכם המשוערת</label>
      <select id="scoreMethod"><option value="C">תקנון קוגניטיבי ל־200/20</option><option value="B">חיבור גולמי 70/30</option><option value="A">המרת אחוזוני מו״ר לפסיכומטרי</option></select></div>
  </div>
  <p class="small muted">אף אחת מההמרות אינה מוצגת כנוסחה מוסדית מאומתת. במכסה ב׳ מחליפים את רכיב המו״ר בציון פנימי מדומה; גם התאמת סולם המו״ר למיון הפנימי היא הנחה.</p>
  <details class="adv" open>
    <summary>התפלגות הציונים במכסה ב׳ והנחות הסכם</summary>
    <div class="mini">
      <div><label for="distribution">התפלגות המיון הפנימי</label><select id="distribution"><option value="normal">נורמלית חתוכה בטווח 150–250</option><option value="uniform">אחידה 150–250: בדיקת קיצון ללא קשר למו״ר</option></select></div>
      <div><label for="internalMu">ממוצע פנימי שהונח, לפני חיתוך</label><input id="internalMu" type="number" min="175" max="225" step="1" value="200"></div>
      <div><label for="internalSd">סטיית תקן פנימית שהונחה</label><input id="internalSd" type="number" min="5" max="35" step="1" value="20"></div>
      <div><label for="scenarioR">מתאם למו״ר לפני חיתוך: הנחה בלבד</label><select id="scenarioR"><option value="0">0: ללא קשר מנבא</option><option value="0.3">0.3</option><option value="0.6">0.6</option><option value="0.9">0.9</option></select></div>
      <div><label for="scenarioSd">פיזור קוגניטיבי לתקנון</label><select id="scenarioSd"><option value="sample">מהרשומות במצב הנבחר</option><option value="25">25: הנחת רגישות</option><option value="40">40: הנחת רגישות</option></select></div>
      <div><label for="scenarioUndec">שיוך מתלבטים</label><select id="scenarioUndec"><option value="exclude">לא לשייך: להציג בנפרד</option><option value="A">בעלי מו״ר לא׳, האחרים אינם משויכים</option><option value="B">כולם לב׳</option></select></div>
    </div>
    <p class="hint">הערכים 200 ו־20 הם הנחת הדגמה, לא נתוני המיון של אריאל. מתאם 0 אינו אומר שהמיון עצמו אקראי, אלא שאין במודל מידע מנבא מהמו״ר. ללא מו״ר משתמשים בהתפלגות הבסיס. בהתפלגות אחידה ממוצע, פיזור ומתאם אינם בשימוש.</p>
  </details>
  <div id="scenarioOutput" aria-live="polite"></div>
  <details style="margin-top:18px"><summary>נוסחאות, מקורות ומגבלות</summary>
    <p class="small">לכל מועמד מחושב סכם סופי בכל הגרלה: 70% רכיב קוגניטיבי ו־30% רכיב אישיותי לפי ההמרה הנבחרת. מדרגים ציונים פרטניים; אין משמעות לסכימת ציוני כל חברי המכסה לציון קבוצתי.</p>
    <div class="formula">I | M ~ Normal(μI + ρ·σI·(M−200)/20, σI²·(1−ρ²)), restricted to [150,250]</div>
    <div class="formula">A: 0.7·C + 0.3·T(M) | B: 0.7·C + 0.3·M | C: 0.7·[200 + 20·(C−μC)/σC] + 0.3·M</div>
    <p class="small">בשיטת האחוזונים T היא המרה באמצעות טבלאות מו״ר ופסיכומטרי הקיימות במחשבון, לא המרה רשמית של אריאל. בב׳ השימוש באותה המרה גם לציון הפנימי הוא הנחה נוספת. בטבלת הרגישות אין הצבעת רוב ואין מדד ביטחון. הזרע האקראי קבוע כדי שאותו קלט יחזיר אותו פלט.</p>
    <p class="small">הנתונים אינם מדגם מייצג. אין כאן מודל מתוקף לציוני המיון הפנימי, להרכב המועמדים הסופי או לסף האישיות המינימלי. לא מחושבת קבלה, לרבות עמידה בסף זה. טווח 5%–95% מתאר את ההגרלות בלבד ולא את אי־הוודאות המלאה.</p>
    <ul class="small"><li><a href="https://campuscore.ariel.ac.il/wp/med/admission-6years/" target="_blank" rel="noopener">אריאל: משקל 70% קוגניטיבי ו־30% אישיותי</a></li>
    <li><a href="https://online.stat.psu.edu/stat505/Lesson06" target="_blank" rel="noopener">Penn State: התפלגות נורמלית מותנית</a></li>
    <li><a href="https://aapor.org/wp-content/uploads/2022/11/NPS_TF_Report_Final_7_revised_FNL_6_22_13-1.pdf" target="_blank" rel="noopener">AAPOR: מגבלות ההסקה מסקר התנדבותי</a></li>
    <li><a href="https://www.bmj.com/content/384/bmj-2023-074820" target="_blank" rel="noopener">BMJ: תיקוף וכיול מודלי חיזוי</a></li></ul>
  </details>`;
const surveySection=$('stats').closest('section');
surveySection.innerHTML=`
  <h2>תמונת הסקר המלאה, בנפרד מהמאגר המזוהה</h2>
  <div id="surveyStats" class="stats"></div>
  <p id="surveyNote" class="small muted">יש להתחבר כדי לטעון את הסקר.</p>
  <h3>מאגר מזוהה משולב: טופס + מחשבון</h3>
  <div id="stats" class="stats"></div>
  <p id="dataSrc" class="small muted"></p><p id="dataCaveat" class="note hidden"></p>
  <button type="button" id="refreshData" disabled>רענון נתונים מהשרת, ללא שמירה</button>
  <p class="small muted" id="refreshStatus" role="status"></p>`;
function statsMarkup(items){
  return items.map(([n,t])=>`<div class="stat"><div class="n">${n}</div><div class="t">${t}</div></div>`).join('');
}
function renderStats(){
  const live=AUTH_VERIFIED&&DATA.source==='live';
  $('refreshData').disabled=!live||SAVING||REFRESHING;
  if(!live){
    $('stats').replaceChildren();$('surveyStats').replaceChildren();
    $('surveyNote').textContent='יש להתחבר כדי לטעון את הסקר.';
    $('dataSrc').textContent='נתוני הסקר נטענים רק לאחר אימות בשרת.';
    $('dataCaveat').classList.add('hidden');$('refreshStatus').textContent='';return;
  }
  const s=DATA.survey, pool=DATA.rows;
  if(s){
    const track=(k)=>`${s.tracks[k]} · ${s.answered?f1(100*s.tracks[k]/s.answered)+'%':'0%'}`;
    $('surveyStats').innerHTML=statsMarkup([[s.answered,'תשובות לשאלת המסלול בטופס'],[track('A'),'מכסה א׳ בטופס'],[track('B'),'מכסה ב׳ בטופס'],[track('U'),'מתלבטים בטופס'],[track('M'),'מילואים בטופס']]);
    $('surveyNote').textContent=`אלו תשובות הטופס, לא ספירה מוכחת של אנשים ייחודיים. ${s.validRows} רשומות בעלות ציונים תקינים; ${s.historicalRows.length} מהן ללא מזהה. שמירה במחשבון מתעדכנת במאגר המשולב ואינה יוצרת תשובת Google Forms חדשה.`;
  }else{
    $('surveyStats').replaceChildren();
    $('surveyNote').textContent='השרת עדיין לא החזיר את תמונת הטופס המלאה. אין להסיק שהסקר כולל רק את הרשומות המזוהות.';
  }
  $('stats').innerHTML=statsMarkup([[pool.length,'רשומות מזוהות לאחר איחוד'],[pool.filter(x=>x.t==='A').length,'מזוהים במכסה א׳'],[pool.filter(x=>x.t==='B').length,'מזוהים במכסה ב׳'],[pool.filter(x=>x.t==='U').length,'מזוהים מתלבטים']]);
  $('dataSrc').textContent=`קריאה חיה אחרונה מהשרת: ${DATA.updated}. רענון בהתחברות, בשמירה, בלחיצה וכאשר העמוד פעיל אחת לדקה.`;
  $('dataCaveat').textContent=`הרשומה המזוהה שלך מוצאת מקבוצת המתחרים. ${DATA.counts.historical||0} תשובות היסטוריות אינן ניתנות להתאמה ודאית לחשבונות; במצב המורחב ייתכנו כפילויות ואף תשובה ישנה שלך. ${DATA.counts.unresolved||0} רשומות עם התאמת זהות לא פתורה ו־${DATA.counts.invalid||0} רשומות לא תקינות אינן נכללות בניתוח.`;
  $('dataCaveat').classList.remove('hidden');
}
function scenarioPool(){
  const identified=DATA.rows.filter(r=>!r.self);
  return $('sampleMode').value==='expanded'?[...identified,...(DATA.survey?.historicalRows||[])]:identified;
}
function scenarioParams(){
  const mu=+$('internalMu').value,sd=+$('internalSd').value;
  if(!Number.isFinite(mu)||mu<175||mu>225||!Number.isFinite(sd)||sd<5||sd>35)throw new Error('ממוצע פנימי: 175–225; סטיית תקן: 5–35.');
  // All regular identified records (including self) define one common reference scale.
  const ref=[...DATA.rows,...($('sampleMode').value==='expanded'?(DATA.survey?.historicalRows||[]):[])].filter(x=>x.t!=='M');
  const ms=ScenarioModel.moments(ref.map(x=>x.c));
  return {mu:ms.mu,sd:$('scenarioSd').value==='sample'?ms.sd:+$('scenarioSd').value,
    internalMu:mu,internalSd:sd,r:+$('scenarioR').value,distribution:$('distribution').value,undecided:$('scenarioUndec').value};
}
function band(s){return `<bdi dir="ltr">${f1(s.lo)}–${f1(s.hi)}</bdi>`;}
function rankText(rank,n){return rank==null?'אין קבוצת השוואה':`${f1(rank)} מתוך ${n}`;}
function renderRecommendation(me){
  if(!AUTH_VERIFIED)return;
  LAST_RESULT={me};
  $('result').classList.remove('hidden');
  if(me.t==='M'){
    $('scenarioOutput').textContent='מתווה מילואים אינו חלק ממודל שתי המכסות הרגיל. הציונים נשמרו, אך לא מוצג עבורו ניתוח דירוג שאינו מתאים למתווה.';return;
  }
  try{
    const rows=scenarioPool(),params=scenarioParams(),method=$('scoreMethod').value;
    const out=ScenarioModel.run(me,rows,params,method);
    const own=out.B[0],expanded=$('sampleMode').value==='expanded';
    const a=out.aRank!=null?`מקום ${rankText(out.aRank,out.aN)}`:'אין דירוג בר־השוואה';
    const b=out.bRank?`מקום ממוצע ${rankText(out.bRank.mean,out.bN)}; טווח סימולציה ${band(out.bRank)}`:'אין מתחרים משויכים בב׳';
    const sensitivities=[];
    for(const m of ScenarioModel.methods){
      if(m.id==='C'&&!(params.sd>0))continue;
      for(const r of (params.distribution==='uniform'?[0]:[0,.3,.6,.9])){
        const v=ScenarioModel.run(me,rows,{...params,r},m.id,1500);
        sensitivities.push(`<tr><td>${m.name}</td><td>${r}</td><td>${rankText(v.aRank,v.aN)}</td><td>${v.bRank?rankText(v.bRank.mean,v.bN):'אין קבוצה'}</td><td>${f1(v.B[0].final.mean)}</td></tr>`);
      }
    }
    const aRows=out.A.map((x,i)=>`<tr><td>רשומה א׳ ${i+1}</td><td>${f1(x.c)}</td><td>${f1(x.m)}</td><td>${f1(x.final)}</td></tr>`).join('');
    const bRows=out.B.map((x,i)=>`<tr${i===0?' class="own"':''}><td>${i===0?'הנתונים שלך':'רשומה ב׳ '+i}</td><td>${f1(x.c)}</td><td>${x.m==null?'ללא':f1(x.m)}</td><td>${f1(x.internal.mean)}</td><td>${band(x.internal)}</td><td>${f1(x.final.mean)}</td><td>${band(x.final)}</td></tr>`).join('');
    const population=expanded?'מורחבת, עם אפשרות לכפילויות':'מזוהה בלבד';
    $('scenarioOutput').innerHTML=`
      <div class="info"><strong>תוצאה מותנית בהנחות, לא הכרעה בין המכסות</strong><br>
      קבוצת השוואה ${population}: ${out.A.length} בא׳ ו־${out.B.length-1} בב׳; ${out.excluded} רשומות אינן משויכות לניתוח.
      ${expanded?'תשובה אנונימית ישנה שלך עלולה עדיין להופיע כמתחרה; אי אפשר לזהות אותה לפי ציונים בלבד.':''}
      ${!DATA.survey&&expanded?'נתוני ההיסטוריה לא זמינים, ולכן מוצגים מזוהים בלבד.':''}</div>
      <div class="stats">
        <div class="stat"><div class="t">הסכם הסופי שלך בא׳ לפי הנוסחה הנבחרת</div><div class="n">${out.ownA==null?'לא זמין':f1(out.ownA)}</div><div class="t">${a}</div></div>
        <div class="stat"><div class="t">ממוצע הסכם הסופי המדומה שלך בב׳</div><div class="n">${f1(own.final.mean)}</div><div class="t">טווח 5%–95%: ${band(own.final)}</div></div>
      </div>
      <p>${b}. זהו דירוג בקרב הרשומות בלבד, לא אחוזון בכלל המועמדים.</p>
      <p class="small muted">הסימולציה משלבת את הסכם הקוגניטיבי עם ציוני מיון פנימי לכל משתתף בכל אחת מ־${out.sims} ההגרלות. הממוצע הפנימי המדומה שלך: ${f1(own.internal.mean)}; טווח: ${band(own.internal)}. טווח זה אינו רווח סמך.</p>
      <p class="small muted">פרמטרי התקנון הקוגניטיבי: ממוצע ${Number.isFinite(params.mu)?f1(params.mu):'לא זמין'}, סטיית תקן ${Number.isFinite(params.sd)?f1(params.sd):'לא זמינה'}. שימוש בממוצע ופיזור הסקר הוא הנחה, לא נתון רשמי של אריאל.</p>
      <details open><summary>רגישות למתאם ולנוסחת הסכם</summary>
        <p class="small muted">אין שיטה מנצחת או הצבעת רוב. המספרים משתנים כשמשנים את ההנחות; ציונים משיטות שונות אינם באותו סולם. לבדיקת רגישות לפיזור ולהתפלגות השתמש/י בבוררים למעלה.</p>
        <div class="table-scroll"><table><thead><tr><th>שיטה</th><th>מתאם</th><th>מיקום בא׳</th><th>מיקום ממוצע בב׳</th><th>סכם ב׳ שלך, ממוצע</th></tr></thead><tbody>${sensitivities.join('')}</tbody></table></div>
      </details>
      <details><summary>ציונים משוערים לכל רשומה במכסה א׳ (${out.A.length})</summary>
        <div class="table-scroll"><table><thead><tr><th>רשומה מקומית</th><th>קוגניטיבי</th><th>מו״ר</th><th>סכם משוקלל</th></tr></thead><tbody>${aRows||'<tr><td colspan="4">אין רשומות משויכות</td></tr>'}</tbody></table></div>
      </details>
      <details><summary>התפלגות וסכם משוער לכל רשומה במכסה ב׳ (${out.B.length-1} + הנתונים שלך)</summary>
        <p class="small muted">מוצגים ממוצע וטווח 5%–95% מכל ההגרלות. מספרי הרשומות זמניים ואינם מזהי אנשים. אין כאן ציון פנימי שנמדד בפועל.</p>
        <div class="table-scroll"><table><thead><tr><th>רשומה מקומית</th><th>קוגניטיבי</th><th>מו״ר קיים</th><th>פנימי: ממוצע</th><th>פנימי: טווח</th><th>סכם: ממוצע</th><th>סכם: טווח</th></tr></thead><tbody>${bRows}</tbody></table></div>
      </details>`;
  }catch(e){$('scenarioOutput').textContent=e.message;}
}
let REFRESHING=false;
async function refreshScenarioData(automatic=false){
  if(!AUTH_VERIFIED||SAVING||REFRESHING)return;
  const token=ID_TOKEN;
  REFRESHING=true;$('refreshData').disabled=true;
  if(!automatic)$('refreshStatus').textContent='קורא את הנתונים העדכניים, ללא שמירה…';
  try{
    const j=await apiCall('session',{},token);
    if(token!==ID_TOKEN||SAVING)return;
    applyData(j);renderStats();
    if(LAST_RESULT)renderRecommendation(LAST_RESULT.me);
    $('refreshStatus').textContent='הנתונים רועננו. לא נשמרו ציונים ולא נוצרה תשובה בטופס.';
  }catch(e){
    if(token!==ID_TOKEN)return;
    if(e.code==='AUTH')clearAuth(e.message);
    else $('refreshStatus').textContent='הרענון נכשל; מוצגת הקריאה הקודמת: '+e.message;
  }finally{REFRESHING=false;$('refreshData').disabled=!AUTH_VERIFIED||SAVING;}
}
function updateScenario(){
  const uniform=$('distribution').value==='uniform';
  ['internalMu','internalSd','scenarioR'].forEach(id=>$(id).disabled=uniform);
  if(LAST_RESULT)renderRecommendation(LAST_RESULT.me);
}
['sampleMode','scoreMethod','distribution','internalMu','internalSd','scenarioR','scenarioSd','scenarioUndec'].forEach(id=>$(id).addEventListener('change',updateScenario));
$('refreshData').addEventListener('click',()=>refreshScenarioData(false));
setInterval(()=>{if(!document.hidden)refreshScenarioData(true);},60000);
syncAuthUi();
initAuth();
renderStats();
