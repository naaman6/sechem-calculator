/* Scenario analysis, not an admissions prediction.
 * Conditional normal assumptions: https://online.stat.psu.edu/stat505/Lesson06
 * No parameters here have been fitted to Ariel internal assessment outcomes.
 * No names, emails, hashes or tokens enter this module.
 */
'use strict';
const ScenarioModel = (() => {
  const methods = [
    {id:'C',name:'תקנון קוגניטיבי ל־200/20'},
    {id:'B',name:'חיבור גולמי'},
    {id:'A',name:'המרת אחוזוני מו״ר לפסיכומטרי'}
  ];
  const mx=[150,170,175,180,185,190,195,200,205,210,215,220,225,230,235,250];
  const mp=[0,7,11,16,22,29,37,46,57,66,76,84,91,96,99,100];
  const px=[200,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,800];
  const pp=[0,4,7,11,16,22,28,35,42,50,58,66,74,82,89,95,99,100];
  function interp(x,xs,ys){
    if(x<=xs[0])return ys[0];
    for(let i=1;i<xs.length;i++)if(x<=xs[i]){
      const t=(x-xs[i-1])/(xs[i]-xs[i-1]);return ys[i-1]+t*(ys[i]-ys[i-1]);
    }
    return ys[ys.length-1];
  }
  function moments(a){
    if(!a.length)return {mu:NaN,sd:NaN};
    const mu=a.reduce((s,x)=>s+x,0)/a.length;
    return {mu,sd:a.length>1?Math.sqrt(a.reduce((s,x)=>s+(x-mu)**2,0)/(a.length-1)):NaN};
  }
  function summary(a){
    const b=[...a].sort((x,y)=>x-y);
    const q=p=>{const z=p*(b.length-1),i=Math.floor(z);return b[i]+(b[Math.min(i+1,b.length-1)]-b[i])*(z-i);};
    return {mean:a.reduce((s,x)=>s+x,0)/a.length,lo:q(.05),median:q(.5),hi:q(.95)};
  }
  function rng(seed=1072026){
    let x=seed>>>0;
    return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  function normal(random){return Math.sqrt(-2*Math.log(Math.max(random(),1e-12)))*Math.cos(2*Math.PI*random());}
  function internal(m,p,random){
    if(p.distribution==='uniform')return 150+100*random();
    const mu=m==null?p.internalMu:p.internalMu+p.r*p.internalSd*(m-200)/20;
    const sd=m==null?p.internalSd:p.internalSd*Math.sqrt(1-p.r*p.r);
    // Rejection sampling gives a truncated normal, not clipped point masses at the bounds.
    for(let i=0;i<10000;i++){const v=mu+sd*normal(random);if(v>=150&&v<=250)return v;}
    throw new Error('הנחות ההתפלגות קיצוניות מדי. בחר/י ממוצע ופיזור מתונים יותר.');
  }
  function score(c,m,p,method){
    if(method==='A')return .7*c+.3*interp(interp(m,mx,mp),pp,px);
    if(method==='B')return .7*c+.3*m;
    return .7*(200+20*(c-p.mu)/p.sd)+.3*m;
  }
  function rank(me,others){
    return 1+others.reduce((n,x)=>n+(x>me?1:x===me?.5:0),0);
  }
  function groups(rows,mode){
    const A=[],B=[];let excluded=0;
    rows.forEach((r,i)=>{
      const x={...r,label:i+1};
      if(r.t==='A'&&r.m!=null)A.push(x);
      else if(r.t==='B')B.push(x);
      else if(r.t==='U'&&mode==='A'&&r.m!=null)A.push(x);
      else if(r.t==='U'&&mode==='B')B.push(x);
      else excluded++;
    });
    return {A,B,excluded};
  }
  function run(me,rows,p,method='C',sims=1500){
    if(!Number.isInteger(sims)||sims<10)throw new Error('מספר סימולציות לא תקין');
    if(method==='C'&&!(Number.isFinite(p.sd)&&p.sd>0&&Number.isFinite(p.mu)))throw new Error('לשיטת התקנון נדרשת סטיית תקן חיובית. בחר/י שיטה אחרת או הזן/י פיזור כהנחה.');
    const {A,B,excluded}=groups(rows,p.undecided);
    const ownA=me.m==null?null:score(me.c,me.m,p,method);
    const aRows=A.map(x=>({...x,final:score(x.c,x.m,p,method)}));
    const aRank=ownA==null||!A.length?null:rank(ownA,aRows.map(x=>x.final));
    const random=rng();
    const inputs=[{...me,label:'אני'},...B];
    const internalValues=inputs.map(()=>[]),finalValues=inputs.map(()=>[]),ranks=[];
    for(let s=0;s<sims;s++){
      const scores=inputs.map((x,i)=>{
        const v=internal(x.m,p,random);internalValues[i].push(v);
        const f=score(x.c,v,p,method);finalValues[i].push(f);return f;
      });
      if(B.length)ranks.push(rank(scores[0],scores.slice(1)));
    }
    const bRows=inputs.map((x,i)=>({...x,internal:summary(internalValues[i]),final:summary(finalValues[i])}));
    return {method,A:aRows,B:bRows,excluded,ownA,aRank,aN:A.length+1,
      bRank:ranks.length?summary(ranks):null,bN:B.length+1,sims,
      // Relative sample position, deliberately not a population percentile.
      aFraction:aRank==null?null:(aRank-.5)/(A.length+1),
      bFraction:ranks.length?(summary(ranks).mean-.5)/(B.length+1):null};
  }
  // A transparent decision heuristic, not a probability or a validated ensemble.
  // Compare within-group relative ranks, never scores from different scales.
  function recommendation(runs,hasMor=true){
    if(!hasMor)return {choice:'B',reason:'noMor',mixed:false};
    const differences=runs.filter(x=>x.aFraction!==null&&x.bFraction!==null)
      .map(x=>x.aFraction-x.bFraction);
    if(!differences.length)return {choice:null,reason:'missing',mixed:false};
    const middle=summary(differences).median;
    const mixed=differences.some(x=>x>.03)&&differences.some(x=>x<-.03);
    if(Math.abs(middle)<=.03)return {choice:'A',reason:'close',mixed};
    return {choice:middle>0?'B':'A',reason:'rank',mixed};
  }
  return {methods,moments,summary,score,groups,run,recommendation};
})();
if(typeof module!=='undefined')module.exports=ScenarioModel;
