const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({document:{createElement:()=>({}),head:{appendChild(){}}}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../survey-charts.js'),'utf8')+'\nthis.chart=SurveyCharts;',context);
const group=context.chart.grouped;
const c=group({'0':1,'135':1,'709':1,'710':2,'719.9':3,'720':4,'775':2});
assert.equal(c.total,14);assert.equal(c.valid,12);assert.equal(c.invalid,2);
assert.equal(c.width,10);assert.equal(c.bins.length,8);
assert.equal(c.bins.find(b=>b.from===710).count,5);
assert.equal(c.bins.find(b=>b.from===720).count,4);
assert.equal(c.bins.find(b=>b.from===730).count,0);
assert.equal(c.bins.reduce((n,b)=>n+b.count,0),c.valid);
for(const mor of [false,true]){
  const lo=mor?150:200,hi=mor?250:800;
  const all=group(Object.fromEntries(Array.from({length:hi-lo+1},(_,i)=>[lo+i,1])),mor);
  assert(all.bins.length<=12);
  assert.equal(all.valid,hi-lo+1);
  assert.equal(all.bins.reduce((n,b)=>n+b.count,0),all.valid);
  assert.equal(all.bins.at(-1).to,hi);
  const top=group({[hi]:3},mor);
  assert.equal(top.bins.length,1);assert.equal(top.bins[0].count,3);
  assert.equal(top.bins[0].from,hi-10);
}
const m=group({'0':29,'150':3,'211':1,'250':2,'251':1,'לא מספרי / מחוץ לטווח':2},true);
assert.equal(m.noScore,29);assert.equal(m.valid,6);assert.equal(m.invalid,3);
assert.equal(m.total,m.valid+m.noScore+m.invalid);
assert.equal(group({'0':29},true).bins.length,0);
assert.equal(group({}).total,0);
console.log('PASS bins preserve counts, decimal boundaries, gaps and maximum scores; missing/invalid scores separate; at most 12 equal-width intervals');
