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
  function frequency(title,map,isMor=false){
    const values=entries(map),n=values.reduce((s,x)=>s+x[1],0),max=Math.max(1,...values.map(x=>x[1]));
    if(!n)return `<article class="survey-chart"><h3>${title}</h3><p class="small muted">אין תשובות להצגה.</p></article>`;
    const bars=values.map(([value,count])=>{
      const label=value==='0'&&isMor?'0 · אין ציון':value;
      const percent=(count/n*100).toLocaleString('he-IL',{maximumFractionDigits:1});
      return `<div class="frequency-column" tabindex="0" title="${esc(label)}: ${count} תשובות (${percent}%)" aria-label="${esc(label)}: ${count} תשובות, ${percent}%"><div class="frequency-track"><span class="frequency-fill" style="height:${count/max*100}%"><b>${count}</b></span></div><span class="frequency-label">${esc(label)}</span></div>`;
    }).join('');
    return `<article class="survey-chart"><h3>${title}</h3><p class="small muted">${n} תשובות בטופס · גובה העמודה = מספר תשובות</p><p class="small muted">כל עמודה היא ערך שהוזן. אפשר לגלול לרוחב ולגעת בעמודה או להתמקד בה לקבלת פירוט.</p><div class="frequency-scroll" tabindex="0" aria-label="${title}"><div class="frequency-bars">${bars}</div></div><p class="chart-readout small" role="status"></p><details><summary>נתונים מספריים ונגישים</summary><table><thead><tr><th>ערך</th><th>תשובות</th><th>אחוז</th></tr></thead><tbody>${values.map(([v,c])=>`<tr><td>${esc(v==='0'&&isMor?'0 · אין ציון':v)}</td><td>${c}</td><td>${(100*c/n).toLocaleString('he-IL',{maximumFractionDigits:1})}%</td></tr>`).join('')}</tbody></table></details></article>`;
  }
  function render(root,s){
    if(!root)return;
    if(!s){root.replaceChildren();return;}
    const tracks=['A','B','M','U'].map(k=>({k,n:validCount(s.tracks?.[k])?s.tracks[k]:0}));
    const n=tracks.reduce((a,x)=>a+x.n,0);let offset=0;
    const gradient=tracks.map(({k,n:count})=>{const start=offset;offset+=n?100*count/n:0;return `${colors[k]} ${start}% ${offset}%`;}).join(',');
    const legend=tracks.map(({k,n:count})=>`<li><i style="background:${colors[k]}" aria-hidden="true"></i><span>${labels[k]}</span><b>${count} · ${(n?100*count/n:0).toLocaleString('he-IL',{maximumFractionDigits:1})}%</b></li>`).join('');
    root.innerHTML=`<div class="survey-chart-group"><h3>התפלגות התשובות, כמו בסקר</h3><p class="small muted">${validCount(s.totalResponses)?`${s.totalResponses} תשובות בסך הכול. `:''}לכל שאלה מספר תשובות משלה; אלו תשובות טופס ולא ספירת אנשים ייחודיים.</p><article class="survey-chart"><h3>באיזה מסלול את/ה מתמיין/ת?</h3><p class="small muted">${n} תשובות לשאלה</p><div class="survey-pie-layout"><div class="survey-donut" role="img" aria-label="התפלגות מסלולים; הפירוט ברשימה הסמוכה" style="background:${n?'conic-gradient('+gradient+')':'var(--surface-2)'}"><div><strong>${n}</strong><span>תשובות</span></div></div><ul class="survey-key">${legend}</ul></div></article>${s.distributions?frequency('ציון סכם קוגניטיבי',s.distributions.cog)+frequency('ציון מו״ר / מרק״ם',s.distributions.mor,true):'<p class="note">תרשימי הציונים יופיעו לאחר עדכון השרת. לא מוצגים במקומם נתונים מאוכלוסייה אחרת.</p>'}<p class="small muted">התרשימים משקפים גם ערכים חריגים כפי שנענו; החישוב משתמש רק בציונים תקינים. הערות חופשיות ופרטים מזהים אינם מוצגים. <a href="https://docs.google.com/forms/d/1zJFk-Yvxe-lA_lkIiRISQSKJZheKpd_RWLz0ZZGb7bU/viewanalytics" target="_blank" rel="noopener noreferrer">פתיחת סיכום Google Forms</a></p></div>`;
    root.querySelectorAll('.frequency-column').forEach(column=>{
      const show=()=>column.closest('article').querySelector('.chart-readout').textContent=column.title;
      column.addEventListener('focus',show);column.addEventListener('click',show);
    });
  }
  const style=document.createElement('style');
  style.textContent=`
  .survey-chart-group{margin-block:24px}.survey-chart{border:1px solid var(--border);border-radius:12px;padding:20px;margin-block:16px;overflow:hidden}
  .survey-chart h3{font-size:1rem;margin:0 0 6px}.survey-pie-layout{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-block:20px}
  .survey-donut{width:176px;height:176px;flex:none;border-radius:50%;display:grid;place-items:center;direction:ltr}
  .survey-donut>div{width:100px;height:100px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;flex-direction:column}
  .survey-donut strong{font-size:1.7rem;line-height:1.2}.survey-donut span{font-size:.8rem;color:var(--muted)}
  .survey-key{list-style:none;padding:0;margin:0;flex:1;min-width:220px}.survey-key li{display:flex;align-items:center;gap:8px;margin-block:12px;font-size:.85rem}.survey-key b{margin-inline-start:auto;direction:ltr;white-space:nowrap;font-variant-numeric:tabular-nums}.survey-key i{width:10px;height:10px;border-radius:50%;flex:none}
  .frequency-scroll{overflow-x:auto;direction:ltr;padding:28px 4px 8px;overscroll-behavior-inline:contain}
  .frequency-bars{display:flex;gap:10px;min-width:100%;width:max-content;border-bottom:1px solid var(--border)}
  .frequency-column{width:42px;flex:none;text-align:center;font-size:.75rem;outline-offset:2px}
  .frequency-track{height:160px;display:flex;align-items:flex-end;justify-content:center;border-bottom:1px solid var(--border)}
  .frequency-fill{display:block;width:28px;min-height:2px;background:var(--accent);position:relative;border-radius:3px 3px 0 0}
  .frequency-fill b{position:absolute;bottom:100%;left:0;right:0;color:var(--text);line-height:1.8}
  .frequency-label{display:block;min-height:44px;padding-top:6px;overflow-wrap:anywhere;direction:rtl}
  .frequency-column:focus .frequency-fill,.frequency-column:hover .frequency-fill{background:var(--blue)}
  @media(max-width:500px){.survey-chart{padding:14px}.survey-pie-layout{justify-content:center;gap:16px}.survey-key{min-width:0;flex-basis:100%}.survey-key li{font-size:.78rem}}
  `;
  document.head.appendChild(style);
  return {render,entries};
})();
