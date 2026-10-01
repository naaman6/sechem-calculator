'use strict';
$('result').innerHTML=`
  <h2><span class="step">2</span> הסכם המשוער וההמלצה שלך</h2>
  <div id="scenarioOutput" aria-live="polite"></div>`;
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


let ANALYSIS_JOB=0;
function thresholdLabel(value){
  if(value===null)return 'אין קבוצה';
  if(!Number.isFinite(value))return 'מעל 250';
  if(value<=150)return 'עד 150';
  return String(Math.ceil(value));
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
        rows.push(`<tr><td>${method.name}</td><td colspan="${hasMor?3:1}">אין פיזור מספיק לחישוב</td></tr>`);continue;
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
      const baseline=methodRuns.filter(x=>x.allocation==='exclude'&&x.profile==='base');
      const bMean=baseline.reduce((s,x)=>s+x.ownB.mean,0)/baseline.length;
      if(hasMor){
        const thresholds=methodRuns.map(x=>x.thresholdMedian).filter(x=>x!==null);
        const lo=thresholds.length?Math.min(...thresholds):null,hi=thresholds.length?Math.max(...thresholds):null;
        const thresholdText=lo===null?'אין קבוצת השוואה':lo===hi?thresholdLabel(lo):
          `<bdi dir="ltr">${thresholdLabel(lo)} – ${thresholdLabel(hi)}</bdi>`;
        rows.push(`<tr><td>${method.name}</td><td class="num">${f1(baseline[0].ownA)}</td><td class="num">${f1(bMean)}</td><td>${thresholdText}</td></tr>`);
      }else{
        rows.push(`<tr><td>${method.name}</td><td class="num">${f1(bMean)}</td></tr>`);
      }
    }
    if(!current())return;
    const decision=ScenarioModel.switchRecommendation(allRuns,hasMor,coverageComplete);
    let title,why;
    if(decision.reason==='noMor'){
      title='ללא מו״ר: מכסה ב׳ היא המסלול הרלוונטי';
      why='אין כאן החלטה על מעבר מא׳. הטבלה מציגה את הסכם הסופי המשוער שלך בב׳ לפי כל שיטה.';
    }else if(decision.reason==='robust'){
      title='יש בסיס במודל לשקול מעבר למכסה ב׳';
      why='יתרון הדירוג לב׳ נשמר בכל התפלגויות הציונים וחלוקות המתלבטים שנבדקו, גם כשמביאים בחשבון תוצאת מיון פחות טובה. זו המלצה מותנית בהנחות, לא הבטחת קבלה.';
    }else if(decision.reason==='missing'||decision.reason==='limited'){
      title='כרגע: לשמור על המו״ר, אין בסיס מספיק למעבר';
      why='חסרים נתונים או שאין מספיק רשומות להשוואה מלאה. שמירת הציון הידוע היא ברירת מחדל זהירה, לא הוכחה שמכסה א׳ עדיפה.';
    }else{
      title='כרגע: להישאר עם המו״ר במכסה א׳';
      why='המעבר לב׳ לא עבר את כלל הזהירות בכל בדיקות ההתפלגות והמתלבטים. מעבר עשוי להשתלם בתנאים מסוימים; ציון האיזון בטבלה מראה מה תצטרך להשיג, אך אינו ציון שהוכח שתוכל לקבל.';
    }
    $('scenarioOutput').innerHTML=`
      <div class="info"><h3 style="margin:0 0 8px">${title}</h3><p style="margin:0">${why}</p></div>
      <div class="table-scroll compact-scores ${hasMor?'switch-scores':''}"><table><thead><tr><th>שיטה</th>${hasMor?'<th>סכם בא׳</th>':''}<th>סכם משוער בב׳</th>${hasMor?'<th>פנימי לאיזון עם א׳*</th>':''}</tr></thead><tbody>${rows.join('')}</tbody></table></div>
      ${hasMor?'<p class="small muted">* טווח ציוני האיזון בין התרחישים, לא טווח הציון הצפוי שלך ולא סף קבלה. בכל תרחיש זהו חציון הציון הדרוש לשוויון בדירוג היחסי מול א׳. ציון ב׳ מוצג בתרחיש הבסיס.</p><p class="small muted">המתלבטים נבדקו בנפרד, בעלי מו״ר בא׳ והיתר בב׳, וכולם בב׳. אלה תרחישי קצה, לא כל החלוקות האפשריות.</p>':'<p class="small muted">ציון ב׳ הוא ממוצע מדומה בהנחת התפלגות בסיס, לא ציון שנמדד. ציונים משיטות שונות אינם באותו סולם.</p>'}
      <p class="note small"><strong>ההמלצה עלולה להיות שגויה.</strong> הסקר אינו מייצג וייתכנו כפילויות. נבדקו התפלגויות אפשריות, לא התפלגות מאומתת של אריאל; גם כלל הזהירות אינו סף מדעי מוכח. <a href="https://github.com/naaman6/sechem-calculator/blob/main/README.md#כלל-ההחלטה" target="_blank" rel="noopener">הנחות וכלל ההחלטה</a></p>`;
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
initAuth();
renderStats();
