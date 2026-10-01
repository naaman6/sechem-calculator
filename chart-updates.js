'use strict';
// Refresh only presentation code in long-lived tabs. Do not navigate, sign out,
// modify inputs or save scores. The manifest contains no user data.
(()=>{
  if(window.sechemChartUpdates)return;
  let checking=false;
  async function check(){
    if(checking||document.hidden)return;
    checking=true;
    try{
      const manifest=new URL('release.json',location.href);
      manifest.searchParams.set('fresh',String(Date.now()));
      const response=await fetch(manifest,{cache:'no-store',credentials:'omit'});
      if(!response.ok)return;
      const release=await response.json();
      const version=release.charts;
      if(typeof version!=='string'||!/^\d+\.\d+\.\d+$/.test(version))return;
      if(typeof SurveyCharts!=='undefined'&&SurveyCharts.version===version)return;
      const url=new URL('survey-charts.js',location.href);
      url.searchParams.set('v',version);url.searchParams.set('fresh',String(Date.now()));
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        const timer=setTimeout(()=>{script.remove();reject(new Error('timeout'));},15000);
        script.src=url.href;script.async=true;
        script.onload=()=>{clearTimeout(timer);script.remove();resolve();};
        script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('load'));};
        document.head.appendChild(script);
      });
      if(typeof SurveyCharts!=='undefined'&&SurveyCharts.version===version&&
         typeof AUTH_VERIFIED!=='undefined'&&AUTH_VERIFIED&&typeof DATA!=='undefined'){
        SurveyCharts.render(document.getElementById('surveyCharts'),DATA.survey);
      }
    }catch(_){
      // Keep the current charts on a network failure; retry on visibility/minute.
    }finally{checking=false;}
  }
  window.sechemChartUpdates={check};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  setInterval(check,60000);
  check();
})();
