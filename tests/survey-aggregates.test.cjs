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
console.log('PASS original form aggregates include invalid scores, omit blanks and never return free text');
