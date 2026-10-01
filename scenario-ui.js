'use strict';
$('result').innerHTML=`
  <h2><span class="step">2</span> הסכם המשוער וההמלצה שלך</h2>
  <div id="scenarioOutput" aria-live="polite"></div>`;
const surveySection=$('stats').closest('section');
surveySection.innerHTML=`
  <h2>תמונת הסקר המלאה, בנפרד מהמאגר המזוהה</h2>
  <div id="surveyStats" class="stats"></div>
  <p id="surveyNote" class="small muted">יש להתחבר כדי לטעון את הסקר.</p>
  <div id="surveyCharts"></div>
  <h3>מאגר מזוהה משולב: טופס + מחשבון</h3>
  <div id="stats" class="stats"></div>
  <p id="dataSrc" class="small muted"></p><p id="dataCaveat" class="note hidden"></p>
  <button type="button" id="refreshData" disabled>רענון נתונים מהשרת, ללא שמירה</button>
  <p class="small muted" id="refreshStatus" role="status"></p>`;
function statsMarkup(items){
  return items.map(([n,t])=>`<div class="stat"><div class="n">${n}</div><div class="t">${t}</div></div>`).join('');
}
function renderStats(){
  if(typeof SurveyCharts!=='undefined')SurveyCharts.render($('surveyCharts'),AUTH_VERIFIED?DATA.survey:null);
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


let ANALYSIS_JOB=0;
function thresholdLabel(value){
  if(value===null)return 'אין קבוצה';
  if(!Number.isFinite(value))return 'לא נמצא עד 250';
  if(value<=150)return '150';
  return String(Math.ceil(value));
}
function positionLabel(value){
  return Number.isInteger(value)?String(value):f1(value);
}
function comparisonMarkup(method,runs,hasMor){
  const s=ScenarioModel.comparisonSummary(runs);
  if(!s)return `<article class="comparison-card"><h3>${method.name}</h3><p>אין מספיק נתונים לחישוב.</p></article>`;
  const aPosition=s.aRank===null?'אין מספיק רשומות לדירוג':
    `מקום ${positionLabel(s.aRank)} מתוך ${s.aN}`;
  const bPosition=s.bRank?`מקום כ־${Math.round(s.bRank.mean)} מתוך ${s.bN}`:'אין מספיק רשומות לדירוג';
  const rankRange=s.bRank?`<span class="comparison-range">טווח מיקום משוער: <bdi dir="ltr">${Math.max(1,Math.floor(s.bRank.lo+1e-9))}–${Math.min(s.bN,Math.ceil(s.bRank.hi-1e-9))}</bdi></span>`:'';
  const conditions=runs.map(x=>x.conditionalGrade).filter(x=>x!==null);
  const threshold=conditions.length?thresholdLabel(Math.max(...conditions)):null;
  return `<article class="comparison-card">
    <h3>${method.name}</h3>
    <div class="comparison-grid ${hasMor?'':'single'}">
      ${hasMor?`<div class="comparison-group"><h4>מכסה א׳ · מו״ר</h4>
        <span class="comparison-label">סכם סופי משוער</span><strong class="comparison-score">${f1(s.ownA)}</strong>
        <strong class="comparison-rank">${aPosition}</strong><span class="comparison-range">לפי הציונים שדווחו</span></div>`:''}
      <div class="comparison-group"><h4>מכסה ב׳ · ראיון</h4>
        <span class="comparison-label">סכם סופי משוער</span><strong class="comparison-score">${f1(s.ownB.mean)}</strong>
        <strong class="comparison-rank">${bPosition}</strong>${rankRange}
        <span class="comparison-range">הערכה, לא מיקום ידוע</span></div>
    </div>
    ${hasMor&&threshold!==null?`<p class="comparison-foot">רף הזהירות במיון הפנימי לפי שיטה זו: <strong>${threshold}</strong>. זה לא ציון מינימום לקבלה.</p>`:''}
  </article>`;
}
async function renderRecommendation(me){
  if(!AUTH_VERIFIED)return;
  const job=++ANALYSIS_JOB;
  LAST_RESULT={me};
  const current=()=>AUTH_VERIFIED&&job===ANALYSIS_JOB&&LAST_RESULT?.me===me;
  $('result').classList.remove('hidden');
  if(me.t==='M'){
    $('scenarioOutput').textContent='הציונים נשמרו. מתווה מילואים נבחן בנפרד ואינו מתאים להשוואה בין המכסות הרגילות.';return;
  }
  $('scenarioOutput').textContent='בודק את התפלגות הציונים ואת שיוך המתלבטים…';
  try{
    const history=DATA.survey?.historicalRows||[];
    const peers=[...DATA.rows.filter(x=>!x.self),...history];
    const reference=[...DATA.rows,...history].filter(x=>x.t!=='M');
    const ms=ScenarioModel.moments(reference.map(x=>x.c));
    const params={mu:ms.mu,sd:ms.sd,internalMu:200,internalSd:20,r:0,distribution:'normal',undecided:'exclude'};
    const hasMor=me.m!==null;
    const allRuns=[],rows=[];
    let coverageComplete=!!DATA.survey;
    for(const method of ScenarioModel.methods){
      if(method.id==='C'&&!(Number.isFinite(params.sd)&&params.sd>0)){
        coverageComplete=false;
        rows.push(`<article class="comparison-card"><h3>${method.name}</h3><p>אין פיזור מספיק לחישוב.</p></article>`);continue;
      }
      const methodRuns=[];
      for(const allocation of (hasMor?['exclude','A','B']:['exclude'])){
        for(const profile of (hasMor?ScenarioModel.profiles:[ScenarioModel.profiles[0]])){
          for(const r of (hasMor&&profile.distribution!=='uniform'?[0,.3,.6,.9]:[0])){
            await new Promise(resolve=>setTimeout(resolve,0));
            if(!current())return;
            const result=ScenarioModel.switchRun(me,peers,{...params,...profile,profile:profile.id,r,undecided:allocation},method.id,1000);
            methodRuns.push(result);
          }
        }
      }
      allRuns.push(...methodRuns);
      rows.push(comparisonMarkup(method,methodRuns,hasMor));
    }
    if(!current())return;
    const decision=ScenarioModel.switchRecommendation(allRuns,hasMor,coverageComplete);
    let title,why;
    if(decision.reason==='noMor'){
      title='ללא מו״ר: מכסה ב׳ היא המסלול הרלוונטי';
      why='אין לך כרגע ציון מו״ר שאפשר להשתמש בו להשוואה למסלול א׳. התוצאות מראות איך הסכם והמיקום שלך בב׳ עשויים להיראות, אבל ציון המיון הפנימי עדיין לא ידוע.';
    }else if(decision.reason==='robust'){
      title='יש בסיס במודל לשקול מעבר למכסה ב׳';
      why='לפי הנתונים והאפשרויות שבדקנו, מעבר לב׳ נראה כדאי גם כשמשנים את ההנחות לגבי ציוני המיון ובחירת המסלול של המתלבטים. לכן יש סיבה לשקול מעבר. עדיין לא ידוע איזה ציון תקבל במיון הפנימי, ואין כאן הבטחת קבלה.';
    }else if(decision.reason==='missing'||decision.reason==='limited'){
      title='כרגע: לשמור על המו״ר, אין בסיס מספיק למעבר';
      why='יש לך כבר ציון מו״ר ביד, אבל אין לנו מספיק נתונים כדי לדעת אם כדאי להחליף אותו במיון הפנימי. לכן ההצעה הזהירה כרגע היא לשמור על מה שיש. זה לא אומר שהוכח שמסלול א׳ טוב יותר עבורך.';
    }else{
      title='כרגע: להישאר עם המו״ר במכסה א׳';
      why=`יש לך כבר מו״ר ${f1(me.m)} ביד. במעבר לב׳ תחליף אותו בציון שעדיין לא ידוע: הוא יכול לשפר את מצבך, אבל גם להרע אותו. הבדיקות שלנו לא מראות יתרון מספיק עקבי למעבר, ולכן ההצעה הזהירה היא לשמור על מה שיש. זה לא אומר שהוכח שמסלול א׳ טוב יותר עבורך.`;
    }
    let conditionText='';
    if(hasMor&&decision.conditionalGrade!==undefined){
      conditionText=Number.isFinite(decision.conditionalGrade)?
        `<p style="margin:10px 0 0"><strong>מה אומר הציון ${thresholdLabel(decision.conditionalGrade)} שמוצג כאן?</strong> זהו רף זהירות מחמיר: אם תקבל אותו או יותר במיון הפנימי, המעבר לב׳ עומד בתנאים שקבענו גם באפשרויות המחמירות שבדקנו. <strong>גם ציון נמוך יותר עשוי להספיק כדי שהמעבר ישתלם.</strong> אנחנו לא יודעים מראש איזה ציון תקבל, וזה לא ציון הקבלה הנדרש באוניברסיטה.</p>`:
        '<p style="margin:10px 0 0"><strong>למה לא מוצג ציון שמצדיק מעבר בכל הבדיקות?</strong> אפילו ציון 250 לא עומד בכלל הזהירות שלנו בכל האפשרויות שבדקנו. זה לא אומר שמעבר לב׳ לא יכול להשתלם, ולא אומר שאי אפשר להתקבל בב׳.</p>';
    }
    $('scenarioOutput').innerHTML=`
      <div class="info"><h3 style="margin:0 0 8px">${title}</h3><p style="margin:0">${why}</p>${conditionText}</div>
      <h3 class="comparison-title">הסכם הסופי והמיקום שלך בכל קבוצה</h3>
      <p class="small muted">מקום 1 הוא הגבוה ביותר. המיקום הוא ביחס לרשומות במאגר, כולל אותך, ולא לכל המועמדים באוניברסיטה. המתלבטים ומתווה המילואים אינם נכללים בדירוגים האלה.</p>
      <div class="comparisons">${rows.join('')}</div>
      <p class="small muted">כל המספרים הם אומדן לפי נוסחאות המחשבון, לא ציון קבלה רשמי. בתוך כל שיטה אפשר להשוות בין א׳ לב׳, אבל אין להשוות מספרים בין שיטות שונות. הסכם והמיקום בב׳ מבוססים על ציוני מיון אפשריים שעדיין לא התקבלו.</p>
      <details class="comparison-details"><summary>איך לקרוא את המיקום והטווח?</summary>
        <p class="small">בא׳ משקללים את הציונים שדווחו ומשווים את הסכם שלך לסכם של כל רשומה בקבוצה. בתיקו מוצג מקום ממוצע, ולכן ייתכן מספר כמו 7.5. בב׳ מדמים ציוני מיון פנימי לכל הקבוצה, מחשבים סכם לכל רשומה ומדרגים מחדש בכל הדמיה.</p>
        <p class="small">המספר הראשי בב׳ הוא ממוצע בדיקות הבסיס. בבסיס הונחה התפלגות ציונים סביב 200 עם סטיית תקן 20, מוגבלת ל־150–250. כשיש מו״ר, נבדקו ארבע הנחות לגבי הקשר בינו לבין המיון הפנימי, במשקל שווה; בלי מו״ר משתמשים בבסיס ללא קשר כזה.</p>
        <p class="small">טווח המיקום מאחד את הטווחים המרכזיים של 90% מההדמיות בכל אחת מהנחות הבסיס. זה אינו רווח סמך או סיכוי קבלה, ומיקום בפועל יכול להיות גם מחוץ לטווח. קבוצות קטנות או כפילויות במאגר עלולות לשנות מאוד את התוצאה.</p>
        <p class="small">רשומת החשבון שלך אינה נספרת שוב כמתחרה. תשובות ישנות ללא זיהוי עלולות להישאר ככפילויות, לרבות תשובה ישנה שלך. המתלבטים נכללים בבדיקות הזהירות של ההמלצה, אך לא בדירוג הקבוצות שמוצג כאן.</p>
      </details>
      <p class="note small"><strong>זו עזרה בהתלבטות, לא תחזית קבלה.</strong> הסקר לא בהכרח משקף את כל המועמדים, וייתכנו בו כפילויות. ציוני המיון הפנימי עדיין לא ידועים, וכלל הזהירות שבחרנו אינו כלל מדעי מוכח. לכן ההמלצה יכולה להיות שגויה. <a href="https://github.com/naaman6/sechem-calculator/blob/main/README.md#כלל-ההחלטה" target="_blank" rel="noopener">איך המחשבון מחליט?</a></p>`;
    LAST_RESULT={me,analysis:{decision,runs:allRuns}};
  }catch(e){if(current())$('scenarioOutput').textContent=e.message;}
}
let REFRESHING=false;
async function refreshScenarioData(automatic=false){
  if(!AUTH_VERIFIED||SAVING||REFRESHING)return;
  const token=ID_TOKEN;
  const epoch=DATA_EPOCH;
  REFRESHING=true;$('refreshData').disabled=true;
  if(!automatic)$('refreshStatus').textContent='קורא את הנתונים העדכניים, ללא שמירה…';
  try{
    const j=await apiCall('session',{},token);
    if(token!==ID_TOKEN||SAVING||epoch!==DATA_EPOCH)return;
    applyData(j);renderStats();
    if(LAST_RESULT)renderRecommendation(LAST_RESULT.me);
    $('refreshStatus').textContent='הנתונים רועננו. לא נשמרו ציונים ולא נוצרה תשובה בטופס.';
  }catch(e){
    if(token!==ID_TOKEN)return;
    if(e.code==='AUTH')clearAuth(e.message);
    else $('refreshStatus').textContent='הרענון נכשל; מוצגת הקריאה הקודמת: '+e.message;
  }finally{REFRESHING=false;$('refreshData').disabled=!AUTH_VERIFIED||SAVING;}
}

$('refreshData').addEventListener('click',()=>refreshScenarioData(false));
setInterval(()=>{if(!document.hidden)refreshScenarioData(true);},60000);
syncAuthUi();
if(RedirectAuth.enabled())RedirectAuth.boot();else initAuth();
renderStats();
