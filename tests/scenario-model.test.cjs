const assert=require('node:assert/strict'),M=require('../scenario-model.js');
const p={mu:745,sd:15,internalMu:200,internalSd:20,r:0,distribution:'normal',undecided:'exclude',profile:'base'};
const me={c:749,m:211,t:'A'};
const rows=[...Array.from({length:20},(_,i)=>({c:737+i,m:190+i,t:'A'})),
  ...Array.from({length:32},(_,i)=>({c:720+i,m:null,t:'B'})),
  {c:750,m:210,t:'U'},{c:740,m:null,t:'U'},{c:780,m:230,t:'M'}];
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}
test('all undecideds assigned legally in both allocation extremes',()=>{
  const a=M.groups(rows,'A'),b=M.groups(rows,'B'),base=M.groups(rows,'exclude');
  assert.equal(a.A.length,21);assert.equal(a.B.length,33);
  assert.equal(b.A.length,20);assert.equal(b.B.length,34);
  assert.equal(base.A.length,20);assert.equal(base.B.length,32);
  assert.equal(a.excluded,1);assert.equal(b.excluded,1);
});
test('inverse final score recovers internal grade in all methods',()=>{
  for(const method of ['A','B','C'])for(const grade of [150,170,191,211,230,250]){
    assert(Math.abs(M.inverseScore(749,M.score(749,grade,p,method),p,method)-grade)<1e-7);
  }
});
test('unreachable and automatically sufficient cutoffs remain explicit',()=>{
  assert.equal(M.inverseScore(749,99999,p,'C'),Infinity);
  assert.equal(M.inverseScore(749,-99999,p,'C'),150);
});
test('cutoff matches peer-relative rank instead of raw-score equality with own A',()=>{
  const scores=[190,200,210,220].map(m=>M.score(749,m,p,'B'));
  assert.equal(Math.round(M.threshold(749,.5,scores,p,'B')),200);
  assert.equal(Math.round(M.threshold(749,0,scores,p,'B')),220);
  assert.equal(M.threshold(749,1,scores,p,'B'),150);
});
test('simulation incorporates every B peer and both tails of own score',()=>{
  const a=M.switchRun(me,rows,p);
  assert.equal(a.aPeers,20);assert.equal(a.bPeers,32);
  assert(a.internal.lo<a.internal.median&&a.internal.hi>a.internal.median);
  assert(a.benefitShare>=0&&a.benefitShare<=1);
  assert(a.lossShare>=0&&a.lossShare<=1);
  assert(a.thresholdP90>=a.thresholdMedian);
  assert.deepEqual(a,M.switchRun(me,rows,p));
});
test('changing distribution changes outcomes, not merely labels',()=>{
  const base=M.switchRun(me,rows,p);
  const other=M.switchRun(me,rows,{...p,internalSd:25,r:.6});
  assert.notEqual(base.internal.lo,other.internal.lo);
  assert.notEqual(base.thresholdMedian,other.thresholdMedian);
});
const robust={aFraction:.8,bFraction:.1,aPeers:20,bPeers:30,benefitShare:.9,lossShare:.02,conditionalGrade:210};
test('all scenarios, not a majority, must pass conservative switch rule',()=>{
  assert.equal(M.switchRecommendation([robust,robust]).choice,'B');
  assert.equal(M.switchRecommendation([robust,{...robust,benefitShare:.69}]).choice,'A');
  assert.equal(M.switchRecommendation([robust,{...robust,lossShare:.11}]).choice,'A');
});
test('small samples, missing groups, and missing method coverage cannot endorse switching',()=>{
  assert.equal(M.switchRecommendation([{...robust,aPeers:4}]).reason,'limited');
  assert.equal(M.switchRecommendation([robust],true,false).choice,'A');
  assert.equal(M.switchRecommendation([{...robust,bFraction:null}]).reason,'missing');
});
test('no MOR means B only, not a recommendation to abandon an existing grade',()=>{
  assert.equal(M.switchRecommendation([],false).reason,'noMor');
  const x=M.switchRun({...me,m:null},rows,p);
  assert.equal(x.ownA,null);assert.equal(x.thresholdMedian,null);assert.equal(x.benefitShare,null);
});
test('equivalent A records use average tie rank',()=>{
  const x=M.switchRun(me,[{...me},{c:730,m:null,t:'B'}],p);
  assert.equal(x.aRank,1.5);assert.equal(x.aFraction,.5);
});
test('zero SD rejects normalized scoring but not raw scoring',()=>{
  assert.throws(()=>M.switchRun(me,rows,{...p,sd:0}));
  assert(Number.isFinite(M.switchRun(me,rows,{...p,sd:0},'B').ownA));
});
test('threshold for an empty B group is not fabricated',()=>{
  const x=M.switchRun(me,[{...me}],p);
  assert.equal(x.thresholdMedian,null);assert.equal(x.bFraction,null);
});
test('published conditional grade actually meets the same gain and loss rule when obtained',()=>{
  for(const method of M.methods)for(const allocation of ['exclude','A','B'])for(const r of [0,.6,.9]){
    const params={...p,r,undecided:allocation};
    const baseline=M.switchRun(me,rows,params,method.id);
    if(!Number.isFinite(baseline.conditionalGrade))continue;
    const fixed=M.switchRun(me,rows,params,method.id,1000,Math.ceil(baseline.conditionalGrade));
    assert(fixed.benefitShare>=M.switchPolicy.minBenefitShare-1e-12,method.id+' gain');
    assert(fixed.lossShare<=M.switchPolicy.maxLossShare+1e-12,method.id+' loss');
  }
});
test('perfect A position cannot improve by five percentage points, regardless of B grade',()=>{
  const best={c:800,m:250,t:'A'};
  const x=M.switchRun(best,rows,p,'B');
  assert.equal(x.aFraction,0);
  assert.equal(x.conditionalGrade,Infinity);
});
test('fixed grade cannot silently exceed the modeled score scale',()=>{
  assert.throws(()=>M.switchRun(me,rows,p,'B',1000,251));
});
test('a tie at maximum grade cannot be treated as strictly better than the peer',()=>{
  for(const method of M.methods){
    const top=M.score(me.c,250,p,method.id);
    assert.equal(M.threshold(me.c,0,[top],p,method.id),Infinity);
    assert.equal(M.threshold(me.c,.5,[top],p,method.id),250);
  }
});
test('B rank summary describes the same simulated peer-relative positions',()=>{
  const x=M.switchRun(me,rows,p,'C');
  assert(Math.abs(x.bRank.mean-(1+x.bFraction*x.bPeers))<1e-9);
  assert(x.bRank.lo>=1&&x.bRank.hi<=x.bPeers+1);
  assert(x.bRank.lo<=x.bRank.mean&&x.bRank.mean<=x.bRank.hi);
});
test('display summaries exclude undecideds and stress allocations without changing means',()=>{
  const runs=[0,.3,.6,.9].map(r=>M.switchRun(me,rows,{...p,r},'C'));
  const expected=M.comparisonSummary(runs);
  const extra=M.switchRun(me,rows,{...p,undecided:'A',profile:'higher'},'C');
  assert.deepEqual(M.comparisonSummary([...runs,extra]),expected);
  assert.equal(expected.aN,21);assert.equal(expected.bN,33);
  assert.equal(expected.ownB.mean,runs.reduce((s,x)=>s+x.ownB.mean,0)/runs.length);
  assert.equal(expected.bRank.lo,Math.min(...runs.map(x=>x.bRank.lo)));
  assert.equal(expected.bRank.hi,Math.max(...runs.map(x=>x.bRank.hi)));
  assert.equal(expected.aRank,runs[0].aRank);
});
test('empty groups do not invent a rank and absent baseline has no display summary',()=>{
  const x=M.switchRun(me,[],p,'B');
  const s=M.comparisonSummary([x]);
  assert.equal(s.aRank,null);assert.equal(s.bRank,null);
  assert.equal(M.comparisonSummary([]),null);
});
test('no MOR displays only a hypothetical B score and rank, never a fabricated A score',()=>{
  const x=M.switchRun({...me,m:null},rows,p,'B');
  const s=M.comparisonSummary([x]);
  assert.equal(s.ownA,null);assert.equal(s.aRank,null);
  assert(Number.isFinite(s.ownB.mean));assert(s.bRank.mean>=1);
});
console.log(`${passed} model checks passed`);
if(process.argv.includes('--bench')){
  const start=Date.now();const runs=[];
  for(const m of M.methods)for(const allocation of ['exclude','A','B'])for(const profile of M.profiles)
    for(const r of profile.distribution==='uniform'?[0]:[0,.3,.6,.9])
      runs.push(M.switchRun(me,rows,{...p,...profile,profile:profile.id,r,undecided:allocation},m.id));
  console.log({runs:runs.length,ms:Date.now()-start,decision:M.switchRecommendation(runs)});
}
