const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({Map,Set,Date});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../backend/Code.gs'),'utf8'),ctx);
const rows=[
 ['חותמת זמן','באיזה מסלול את/ה מתמיין/ת?','ציון סכם קוגנטיבי','ציון המו״ר / מרק״ם שלך','כתובת אימייל'],
 [new Date(),'מסלול רגיל + ציון מו"ר',749,211,''],
 [new Date(),'מסלול רגיל + ראיון פנימי',749,0,''],
 [new Date(),'לא בטוח/ה',135,0,''],
 [new Date(),'','', '', ''],
 [new Date(),'מתווה מילואים','not a score',200,''],
 ['', '', '', '', '']
];
const out=ctx.readForms_({getSheetByName:()=>({getDataRange:()=>({getValues:()=>rows})})});
assert.equal(out.survey.totalResponses,5);
assert.equal(out.survey.answered,4);
assert.equal(out.survey.validRows,2);
assert.equal(out.survey.distributions.cog['749'],2);
assert.equal(out.survey.distributions.cog['135'],1);
assert.equal(out.survey.distributions.cog['לא מספרי / מחוץ לטווח'],1);
assert.equal(out.survey.distributions.mor['0'],2);
assert.equal(out.survey.distributions.mor['200'],1);
assert(!JSON.stringify(out.survey.distributions).includes('not a score'));
assert.equal(out.survey.responseRows.length,5);
assert(out.survey.responseRows.every(r=>Object.keys(r).sort().join(',')==='c,m,t'));
assert.equal(out.survey.responseRows[0].c,749);
assert.equal(out.survey.responseRows[0].m,211);
assert.equal(out.survey.responseRows[0].t,'A');
assert.equal(out.survey.responseRows[1].m,0);
assert.equal(out.survey.responseRows[2].c,135);
assert.equal(out.survey.responseRows[3].t,null);
assert.equal(out.survey.responseRows[4].c,'לא תקין');
assert(!JSON.stringify(out.survey.responseRows).includes('not a score'));
console.log('PASS original form aggregates include invalid scores, omit blanks and never return free text');
console.log('PASS original rows expose only linked track/cognitive/MOR values, with no timestamps or arbitrary text');
