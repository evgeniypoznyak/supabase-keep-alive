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
const getTarget=h=>h.HTTP_TARGETS.find(target=>target.url?.includes('yomqhnktzlovtholeqgp.supabase.co'));
test('one SnapChange sentinel target, only public apikey and exact safe query',()=>{
 const h=harness(()=>{throw Error('network on import')});
 const matches=h.HTTP_TARGETS.filter(target=>target.url?.includes('yomqhnktzlovtholeqgp.supabase.co'));
 assert.equal(matches.length,1);const target=matches[0];
 assert.equal(target.url,'https://yomqhnktzlovtholeqgp.supabase.co/rest/v1/keep_alive?select=id&limit=1');
 assert.match(target.headers.apikey,/^sb_publishable_/);assert.deepEqual(Object.keys(target.headers),['apikey']);
});
test('SnapChange requires a real uncached read with public apikey, no bearer, cookies or redirects',async()=>{
 let request;const h=harness(async(url,init)=>{request=init;return Response.json([{id:1}]);});
 await h.pingHttp(getTarget(h));assert.equal(h.errors.length,0);
 assert.equal(request.redirect,'error');assert.equal(request.cache,'no-store');assert.equal(request.credentials,'omit');
 assert.equal(request.headers.apikey,getTarget(h).headers.apikey);assert.equal(request.headers.Authorization,undefined);assert.equal(request.headers.accept,'application/json');
});
for(const [name,body,status] of [['HTML','<html>ok</html>',200],['empty',[],200],['wrong id',[{id:2}],200],['extra rows',[{id:1},{id:1}],200],['extra fields',[{id:1,email:'PRIVATE_DETAILS'}],200],['object',{id:1},200],['denied',{error:'PRIVATE_DETAILS'},401]]){
 test('SnapChange rejects '+name+' without printing body',async()=>{
  const h=harness(async()=>typeof body==='string'?new Response(body,{status}):Response.json(body,{status}));
  await h.pingHttp(getTarget(h));assert.equal(h.errors.length,1);assert.ok(!h.errors.join('').includes('PRIVATE_DETAILS'));
 });
}
test('SnapChange failure fails the full workflow while other targets are healthy',async()=>{
 const h=harness(async url=>url.includes('yomqhnktzlovtholeqgp.supabase.co')?Response.json([]):url.includes('radar.softery.io')?Response.json({ok:true,service:'radar',database:'up'}):new Response('ok'));
 await h.keepAlive();assert.equal(h.process.exitCode,1);assert.equal(h.errors.length,1);
});
