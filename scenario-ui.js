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

function renderRecommendation(me){
  if(!AUTH_VERIFIED)return;
  LAST_RESULT={me};
  $('result').classList.remove('hidden');
  if(me.t==='M'){
    $('scenarioOutput').textContent='הציונים נשמרו. מתווה מילואים נבחן בנפרד ואינו מתאים להשוואה בין המכסות הרגילות.';return;
  }
  try{
    const history=DATA.survey?.historicalRows||[];
    const peers=[...DATA.rows.filter(x=>!x.self),...history];
    const reference=[...DATA.rows,...history].filter(x=>x.t!=='M');
    const ms=ScenarioModel.moments(reference.map(x=>x.c));
    const params={mu:ms.mu,sd:ms.sd,internalMu:200,internalSd:20,
      r:0,distribution:'normal',undecided:'exclude'};
    const runs=[],table=[];
    for(const method of ScenarioModel.methods){
      if(method.id==='C'&&!(Number.isFinite(params.sd)&&params.sd>0)){
        table.push(`<tr><td>${method.name}</td><td colspan="2">אין פיזור מספיק לחישוב</td></tr>`);continue;
      }
      const group=[0,.3,.6,.9].map(r=>ScenarioModel.run(me,peers,{...params,r},method.id,1500));
      runs.push(...group);
      const ownB=group.reduce((sum,x)=>sum+x.B[0].final.mean,0)/group.length;
      table.push(`<tr><td>${method.name}</td><td class="num">${group[0].ownA==null?'ללא מו״ר':f1(group[0].ownA)}</td><td class="num">${f1(ownB)}</td></tr>`);
    }
    const rec=ScenarioModel.recommendation(runs,me.m!==null);
    let title='',why='';
    if(rec.reason==='noMor'){
      title='ההמלצה: מכסה ב׳, המיון הפנימי';
      why='לא הזנת ציון מו״ר, ולכן אין כרגע ציון קיים להשוואה במכסה א׳.';
    }else if(rec.reason==='missing'){
      title='עדיין אין מספיק נתונים להמלצה';
      why='חסרה קבוצת השוואה באחת המכסות. הציונים למטה הם חישובים, לא בסיס להכרעה.';
    }else if(rec.reason==='close'){
      title='ההמלצה המסויגת: להישאר כרגע במכסה א׳';
      why='במרכז התרחישים שנבדקו לא מתקבל יתרון יחסי ברור לאחת המכסות. לכן ברירת המחדל הזהירה כאן היא לשמור על המו״ר הקיים, ולא משום שהוכח שסיכויי הקבלה בא׳ גבוהים יותר.';
    }else{
      title=rec.choice==='B'?'המלצה מסויגת: מכסה ב׳, המיון הפנימי':'המלצה מסויגת: מכסה א׳, עם המו״ר הקיים';
      why=`מרכז התרחישים שנבדקו מצביע על מיקום יחסי טוב יותר עבורך מול הרשומות במכסה ${rec.choice==='B'?'ב׳':'א׳'}. זו המלצת עבודה לפי המודל, לא תחזית קבלה.`;
    }
    if(rec.mixed)why+=' הכיוון מתהפך בחלק מההנחות, ולכן ההמלצה אינה יציבה.';
    const nA=runs[0]?.A.length||0,nB=(runs[0]?.B.length||1)-1;
    $('scenarioOutput').innerHTML=`
      <div class="info"><h3 style="margin:0 0 8px">${title}</h3><p style="margin:0">${why}</p></div>
      <div class="table-scroll compact-scores"><table><thead><tr><th>שיטת חישוב</th><th>הסכם שלך בא׳</th><th>הסכם המשוער שלך בב׳</th></tr></thead><tbody>${table.join('')}</tbody></table></div>
      <p class="small muted">ההשוואה מבוססת על ${nA} רשומות בא׳ ו־${nB} בב׳, ללא המתלבטים. ציון ב׳ הוא ממוצע תרחישים; משווים ציונים רק בתוך אותה שיטה.</p>
      <p class="note small"><strong>ייתכן שההמלצה שגויה.</strong> הסקר אינו מייצג וייתכנו כפילויות, לרבות תשובה ישנה שלך. החישוב תלוי בהנחות לא מאומתות על המיון הפנימי והשקלול, ואינו הסתברות קבלה.</p>`;
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

$('refreshData').addEventListener('click',()=>refreshScenarioData(false));
setInterval(()=>{if(!document.hidden)refreshScenarioData(true);},60000);
syncAuthUi();
initAuth();
renderStats();
