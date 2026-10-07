const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','index.js'),'utf8');
function harness(fetch){
 const errors=[],logs=[];
 const context={module:{exports:{}},require(){throw Error('unexpected dependency')},fetch,AbortSignal,process:{env:{}},console:{log:m=>logs.push(m),error:m=>errors.push(m)}};
 vm.runInNewContext(source,context);
 return {...context.module.exports,errors,logs,process:context.process};
}
const healthy={ok:true,service:'radar',database:'up'};
test('exactly one Radar target, with no retired project URL',()=>{
 const h=harness(()=>{throw Error('network on import')});
 const targets=h.HTTP_TARGETS.map(t=>typeof t==='string'?t:t.url);
 assert.equal(targets.filter(u=>u.includes('radar.softery.io')).length,1);
 assert.ok(!targets.some(u=>/seqsmqthzhvvaxgeyqow|qrxmuungrbddzjqikcol/.test(u)));
});
test('Radar uses uncached JSON, no credentials and no redirects',async()=>{
 let request;const h=harness(async(u,o)=>{request=o;return Response.json(healthy)});
 await h.pingHttp(h.HTTP_TARGETS.find(t=>t.expectedHealth?.service==='radar'));
 assert.equal(h.errors.length,0);assert.equal(request.redirect,'error');assert.equal(request.cache,'no-store');assert.equal(request.credentials,'omit');
});
for(const [name,body,status] of [['HTML','<html>ok</html>',200],['wrong service',{...healthy,service:'other'},200],['database down',{...healthy,database:'down'},200],['failure',{error:'PRIVATE_DETAILS'},503]]){
 test('reject '+name,async()=>{
  const h=harness(async()=>typeof body==='string'?new Response(body,{status}):Response.json(body,{status}));
  await h.pingHttp(h.HTTP_TARGETS.find(t=>t.expectedHealth?.service==='radar'));
  assert.equal(h.errors.length,1);assert.ok(!h.errors.join('').includes('PRIVATE_DETAILS'));
 });
}
test('Radar failure causes a nonzero complete run',async()=>{
 const h=harness(async url=>url.includes('radar.softery.io')?Response.json({ok:false},{status:503}):url.includes('redact.softery.io')?Response.json({ok:true,service:'softery-redact',database:'up'}):new Response('ok'));
 await h.keepAlive();assert.equal(h.process.exitCode,1);assert.equal(h.errors.length,1);
});
