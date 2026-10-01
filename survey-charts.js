'use strict';
// Only aggregate original Google Forms counts. Never substitute the merged
// calculator population for a chart labelled "form responses".
const SurveyCharts=(()=>{
  const labels={A:'מכסה א׳ · מו״ר',B:'מכסה ב׳ · מיון פנימי',M:'מתווה מילואים',U:'לא בטוח/ה'};
  const colors={A:'#4267b2',B:'#c64d45',M:'#d59c27',U:'#429766'};
  const validCount=x=>Number.isSafeInteger(x)&&x>=0;
  const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  function entries(map){
    return Object.entries(map||{}).filter(([key,n])=>validCount(n)&&n>0&&
      (/^(?:\d+(?:\.\d+)?)$/.test(key)||key==='לא מספרי / מחוץ לטווח'))
      .sort((a,b)=>Number.isFinite(Number(a[0]))&&Number.isFinite(Number(b[0]))?Number(a[0])-Number(b[0]):a[0].localeCompare(b[0]));
  }
  function grouped(map,isMor=false){
    const values=entries(map),lo=isMor?150:200,hi=isMor?250:800;
    const known=values.map(([v,n])=>[Number(v),n]).filter(([v])=>Number.isFinite(v)&&v>=lo&&v<=hi);
    const total=values.reduce((s,x)=>s+x[1],0),valid=known.reduce((s,x)=>s+x[1],0);
    const noScore=isMor?values.filter(([v])=>Number(v)===0).reduce((s,x)=>s+x[1],0):0;
    const result={values,total,valid,noScore,invalid:total-valid-noScore,bins:[],width:10,upper:hi};
    if(!known.length)return result;
    const min=Math.min(...known.map(x=>x[0])),max=Math.max(...known.map(x=>x[0]));
    // Equal-width, non-overlapping intervals. The scale maximum belongs in
    // the last interval. Widen only when a very broad range needs >12 rows.
    const index=(v,w)=>Math.min(Math.floor((v-lo)/w),Math.ceil((hi-lo)/w)-1);
    const width=[10,20,25,50,100].find(w=>index(max,w)-index(min,w)+1<=12)||100;
    const first=index(min,width),last=index(max,width);
    for(let i=first;i<=last;i++)result.bins.push({from:lo+i*width,to:Math.min(hi,lo+(i+1)*width),count:0});
    known.forEach(([v,n])=>result.bins[index(v,width)-first].count+=n);
    result.width=width;return result;
  }
  function frequency(title,map,isMor=false){
    const g=grouped(map,isMor),max=Math.max(1,...g.bins.map(x=>x.count));
    if(!g.total)return `<article class="survey-chart"><h3>${title}</h3><p class="small muted">אין תשובות להצגה.</p></article>`;
    const bars=g.bins.map(b=>{
      const percent=(b.count/g.valid*100).toLocaleString('he-IL',{maximumFractionDigits:1});
      const description=`${b.from} עד ${b.to===g.upper?'כולל':'פחות מ־'}${b.to}: ${b.count} תשובות (${percent}%)`;
      return `<li class="histogram-row" aria-label="${esc(description)}"><span class="histogram-range" aria-hidden="true">${b.from}–${b.to}</span><span class="histogram-track" aria-hidden="true"><span style="width:${b.count/max*100}%"></span></span><span class="histogram-count" aria-hidden="true">${b.count} <small>(${percent}%)</small></span></li>`;
    }).join('');
    const badges=[g.noScore?`<span>${g.noScore} ללא ציון מו״ר</span>`:'',g.invalid?`<span>${g.invalid} ערכים מחוץ לטווח / לא תקינים</span>`:''].join('');
    return `<article class="survey-chart"><h3>${title}</h3><p class="small muted">${g.total} תשובות בטופס · ${g.valid} ציונים תקינים בהתפלגות</p>${badges?`<div class="histogram-excluded">${badges}</div>`:''}${g.valid?`<div class="histogram-head" aria-hidden="true"><span>טווח ציון</span><span>מספר תשובות</span></div><ul class="histogram" aria-label="${title}: טווחים של ${g.width} נקודות">${bars}</ul><p class="histogram-note small muted">טווחים של ${g.width} נקודות. הגבול העליון אינו כלול, למעט ${g.upper}. האחוזים מחושבים מתוך ${g.valid} הציונים התקינים בלבד.</p>`:'<p class="small muted">אין ציונים תקינים להצגת התפלגות.</p>'}<details><summary>פירוט מדויק לכל ציון</summary><p class="small muted">כל ${g.total} התשובות, כולל ללא ציון וערכים חריגים. האחוזים כאן מחושבים מתוך כלל התשובות לשאלה.</p><table><thead><tr><th>ערך</th><th>תשובות</th><th>אחוז</th></tr></thead><tbody>${g.values.map(([v,c])=>`<tr><td>${esc(v==='0'&&isMor?'0 · אין ציון':v)}</td><td>${c}</td><td>${(100*c/g.total).toLocaleString('he-IL',{maximumFractionDigits:1})}%</td></tr>`).join('')}</tbody></table></details></article>`;
  }
  function render(root,s){
    if(!root)return;
    if(!s){root.replaceChildren();return;}
    const tracks=['A','B','M','U'].map(k=>({k,n:validCount(s.tracks?.[k])?s.tracks[k]:0}));
    const n=tracks.reduce((a,x)=>a+x.n,0);let offset=0;
    const gradient=tracks.map(({k,n:count})=>{const start=offset;offset+=n?100*count/n:0;return `${colors[k]} ${start}% ${offset}%`;}).join(',');
    const legend=tracks.map(({k,n:count})=>`<li><i style="background:${colors[k]}" aria-hidden="true"></i><span>${labels[k]}</span><b>${count} · ${(n?100*count/n:0).toLocaleString('he-IL',{maximumFractionDigits:1})}%</b></li>`).join('');
    root.innerHTML=`<div class="survey-chart-group"><h3>התפלגות התשובות, כמו בסקר</h3><p class="small muted">${validCount(s.totalResponses)?`${s.totalResponses} תשובות בסך הכול. `:''}לכל שאלה מספר תשובות משלה; אלו תשובות טופס ולא ספירת אנשים ייחודיים.</p><article class="survey-chart"><h3>באיזה מסלול את/ה מתמיין/ת?</h3><p class="small muted">${n} תשובות לשאלה</p><div class="survey-pie-layout"><div class="survey-donut" role="img" aria-label="התפלגות מסלולים; הפירוט ברשימה הסמוכה" style="background:${n?'conic-gradient('+gradient+')':'var(--surface-2)'}"><div><strong>${n}</strong><span>תשובות</span></div></div><ul class="survey-key">${legend}</ul></div></article>${s.distributions?frequency('ציון סכם קוגניטיבי',s.distributions.cog)+frequency('ציון מו״ר / מרק״ם',s.distributions.mor,true):'<p class="note">תרשימי הציונים יופיעו לאחר עדכון השרת. לא מוצגים במקומם נתונים מאוכלוסייה אחרת.</p>'}<p class="small muted">התרשימים משקפים גם ערכים חריגים כפי שנענו; החישוב משתמש רק בציונים תקינים. הערות חופשיות ופרטים מזהים אינם מוצגים. <a href="https://docs.google.com/forms/d/1zJFk-Yvxe-lA_lkIiRISQSKJZheKpd_RWLz0ZZGb7bU/viewanalytics" target="_blank" rel="noopener noreferrer">פתיחת סיכום Google Forms</a></p></div>`;
  }
  const style=document.createElement('style');
  style.textContent=`
  .survey-chart-group{margin-block:24px}.survey-chart{border:1px solid var(--border);border-radius:12px;padding:20px;margin-block:16px;overflow:hidden}
  .survey-chart h3{font-size:1rem;margin:0 0 6px}.survey-pie-layout{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-block:20px}
  .survey-donut{width:176px;height:176px;flex:none;border-radius:50%;display:grid;place-items:center;direction:ltr}
  .survey-donut>div{width:100px;height:100px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;flex-direction:column}
  .survey-donut strong{font-size:1.7rem;line-height:1.2}.survey-donut span{font-size:.8rem;color:var(--muted)}
  .survey-key{list-style:none;padding:0;margin:0;flex:1;min-width:220px}.survey-key li{display:flex;align-items:center;gap:8px;margin-block:12px;font-size:.85rem}.survey-key b{margin-inline-start:auto;direction:ltr;white-space:nowrap;font-variant-numeric:tabular-nums}.survey-key i{width:10px;height:10px;border-radius:50%;flex:none}
  .histogram{list-style:none;padding:0;margin:12px 0 16px;direction:ltr}
  .histogram-row{display:grid;grid-template-columns:70px minmax(0,1fr) 84px;align-items:center;gap:12px;min-height:30px;font-size:.85rem;font-variant-numeric:tabular-nums}
  .histogram-range{text-align:left;white-space:nowrap}.histogram-count{text-align:right;white-space:nowrap;font-weight:700}
  .histogram-count small{font-size:.75rem;color:var(--muted);font-weight:400}
  .histogram-track{height:16px;border-radius:3px;background:var(--surface-2);overflow:hidden}
  .histogram-track>span{height:100%;display:block;background:var(--accent);border-radius:3px}
  .histogram-head{display:flex;justify-content:space-between;direction:ltr;font-size:.75rem;color:var(--muted);margin-top:20px}
  .histogram-excluded{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.histogram-excluded>span{padding:4px 8px;background:var(--surface-2);border-radius:6px;font-size:.8rem;color:var(--muted)}
  .histogram-note{font-size:.78rem}.survey-chart details table{table-layout:fixed}.survey-chart details td{overflow-wrap:anywhere}
  @media(max-width:500px){.histogram-row{grid-template-columns:62px minmax(0,1fr) 76px;gap:8px;font-size:.78rem}}
  @media(max-width:500px){.survey-chart{padding:14px}.survey-pie-layout{justify-content:center;gap:16px}.survey-key{min-width:0;flex-basis:100%}.survey-key li{font-size:.78rem}}
  `;
  document.head.appendChild(style);
  return {render,entries,grouped};
})();
