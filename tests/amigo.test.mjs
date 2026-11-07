import test from 'node:test';
import assert from 'node:assert/strict';
import { assign, validate, sign, verify, publicDraw } from '../netlify/lib/amigo-core.mjs';
import { makeService } from '../netlify/lib/amigo-service.mjs';
import { personalize, modelFor } from '../assets/amigo-modelos.mjs';
const sample = () => ({ title: 'Navidad', organizer: 'Ana', email: 'ana@example.com', date: '24 de diciembre', budget: '$20.000', place: 'Casa', occasion: 'navidad', consent: true, participants: ['Ana','Beto','Caro','Dani'].map((name,i)=>({name,email:`persona${i}@example.com`})), exclusions: [[0,1]] });
function setup() {
  const entries = new Map(); let version = 0, clock = Date.now(), calls = [], fail = false;
  const store = {
    async getWithMetadata(key) { return entries.has(key) ? structuredClone(entries.get(key)) : null; },
    async setJSON(key, data, opts = {}) {
      const old = entries.get(key);
      if ((opts.onlyIfNew && old) || (opts.onlyIfMatch && old?.etag !== opts.onlyIfMatch)) return { modified:false };
      const etag = String(++version); entries.set(key,{data:structuredClone(data),etag}); return {modified:true,etag};
    }
  };
  const env = { AMIGO_ENABLED:'true', AMIGO_SECRET:'x'.repeat(40), AMIGO_SITE_URL:'https://milsitios.netlify.app', AMIGO_FROM:'MilSitios <regalos@example.com>', RESEND_API_KEY:'test-only' };
  const service = makeService({store,env,now:()=>clock,fetcher:async(url,options)=>{
    calls.push({url,...options,payload:JSON.parse(options.body)});
    if(fail) throw new Error('timeout');
    return {ok:true,json:async()=>({data:JSON.parse(options.body).map((_,i)=>({id:`mail-${calls.length}-${i}`}))})};
  }});
  return { service, env, entries, calls, store, setFail(v){fail=v;}, advance(ms){clock+=ms;} };
}
const uuid = '12345678-1234-1234-1234-123456789abc';
async function created(s) { const r=await s.service.run({action:'create',...sample()},{ip:'127.0.0.1'}); const access={token:sign(r.code,s.env.AMIGO_SECRET),ip:'127.0.0.1'}; return {code:r.code,access}; }
async function get(s,c) {return s.service.run({action:'get',code:c.code},c.access);}
test('every participant gives and receives once, excluding self and restricted pairs',()=>{
  for(let n=3;n<=30;n++) for(let k=0;k<30;k++) {const excluded=n>3?[[0,1]]:[];const a=assign(n,excluded);assert.equal(new Set(a).size,n);a.forEach((r,g)=>assert.notEqual(r,g));if(excluded.length){assert.notEqual(a[0],1);assert.notEqual(a[1],0);}}
});
test('impossible restrictions are rejected without producing a partial draw',()=>assert.throws(()=>assign(3,[[0,1],[0,2]])));
test('validate enforces participants, unique emails and restrictions',()=>{assert.equal(validate(sample()).participants.length,4);for(const mutate of [s=>s.participants[1].email=s.participants[0].email,s=>s.participants=[],s=>s.exclusions=[[0,99]],s=>s.email='a\nb@example.com']) {const s=sample();mutate(s);assert.throws(()=>validate(s));}});
test('access tokens reject tampering, expiry, wrong code and wrong secret',()=>{const t=sign('ABC','secret',100);assert(verify(t,'ABC','secret',101));assert(!verify(t,'ABD','secret',101));assert(!verify(t+'x','ABC','secret',101));assert(!verify(t,'ABC','other',101));assert(!verify(t,'ABC','secret',100+8*86400000));});
test('secret assignments and pending payloads never reach the organizer',()=>{const safe=publicDraw({email:'private',assignments:[1,0],pending:{id:'id',messages:[{text:'secret'}]},participants:[]});assert(!('assignments' in safe));assert(!('email' in safe));assert(!('pending' in safe));assert.equal(safe.pendingId,'id');});
test('create sends only organizer access, then verified admin draws once',async()=>{
  const s=setup(),c=await created(s);assert.equal(s.calls.length,1);assert.equal(s.calls[0].payload.length,1);assert.equal(s.calls[0].payload[0].to[0],'ana@example.com');
  await assert.rejects(()=>s.service.run({action:'get',code:c.code}),/acceso/);
  let d=await get(s,c);assert.equal(d.drawn,false);
  d=await s.service.run({action:'draw',code:c.code,revision:d.revision,operationId:uuid},c.access);
  assert.equal(s.calls[1].payload.length,4);assert.equal(d.drawn,true);assert(!('assignments' in d));assert.equal(d.history.length,1);
  await assert.rejects(()=>s.service.run({action:'draw',code:c.code,revision:d.revision,operationId:'22345678-1234-1234-1234-123456789abc'},c.access),/ya se realizó/);
});
test('changing an email and resending preserves all original assignments',async()=>{
  const s=setup(),c=await created(s);let d=await get(s,c);d=await s.service.run({action:'draw',code:c.code,revision:d.revision,operationId:uuid},c.access);
  const original=structuredClone(s.entries.get(`draw/${c.code}`).data.assignments);const originalBody=s.calls[1].payload[0].text;
  const ps=structuredClone(d.participants);ps[0].email='correcto@example.com';
  d=await s.service.run({action:'edit',code:c.code,revision:d.revision,...d,participants:ps},c.access);assert.equal(s.calls.length,2);
  d=await s.service.run({action:'resend',code:c.code,revision:d.revision,participantId:'0',operationId:'22345678-1234-1234-1234-123456789abc'},c.access);
  assert.deepEqual(s.entries.get(`draw/${c.code}`).data.assignments,original);assert.equal(s.calls[2].payload[0].text,originalBody);assert.deepEqual(s.calls[2].payload[0].to,['correcto@example.com']);
});
test('selected messages are personalized and use separate recipient envelopes',async()=>{
  const s=setup(),c=await created(s);let d=await get(s,c);d=await s.service.run({action:'message',code:c.code,revision:d.revision,operationId:uuid,subject:'Hola {{nombre}}',body:'Nos vemos en {{lugar}}',recipients:['1','3']},c.access);
  assert.deepEqual(s.calls[1].payload.map(p=>p.subject),['Hola Beto','Hola Dani']);assert(s.calls[1].payload.every(p=>p.to.length===1));assert.equal(d.history[0].recipients.length,2);
});
test('unconfirmed sends persist payload; retries use same idempotency key and block edits',async()=>{
  const s=setup(),c=await created(s);let d=await get(s,c);s.setFail(true);
  await assert.rejects(()=>s.service.run({action:'draw',code:c.code,revision:d.revision,operationId:uuid},c.access),/confirmar/);
  d=await get(s,c);assert.equal(d.busy,true);assert.equal(d.drawn,true);
  await assert.rejects(()=>s.service.run({action:'edit',code:c.code,revision:d.revision},c.access),/pendiente/);
  s.setFail(false);d=await s.service.run({action:'retry',code:c.code,revision:d.revision,operationId:uuid},c.access);
  assert.equal(s.calls[1].headers['Idempotency-Key'],s.calls[2].headers['Idempotency-Key']);assert.deepEqual(s.calls[1].payload,s.calls[2].payload);assert.equal(d.busy,false);
});
test('concurrent draw requests do not send different assignments',async()=>{
  const s=setup(),c=await created(s);const d=await get(s,c);
  const result=await Promise.allSettled([uuid,'22345678-1234-1234-1234-123456789abc'].map(operationId=>s.service.run({action:'draw',code:c.code,revision:d.revision,operationId},c.access)));
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(s.calls.length,2);
});
test('unknown recovery is generic; matching recovery mails only the organizer',async()=>{
  const s=setup(),c=await created(s);const first=await s.service.run({action:'recover',code:c.code,email:'wrong@example.com'},{ip:'a'});assert.equal(s.calls.length,1);const second=await s.service.run({action:'recover',code:c.code,email:'ana@example.com'},{ip:'a'});assert.equal(first.message,second.message);assert.equal(s.calls.length,2);assert.equal(s.calls[1].payload[0].to[0],'ana@example.com');
});
test('configuration disabled fails closed without email',async()=>{const s=setup();s.env.AMIGO_ENABLED='false';await assert.rejects(()=>s.service.run({action:'create',...sample()}),/preparando/);assert.equal(s.calls.length,0);});
test('models preserve unknown text safely and personalize known fields',()=>{assert(modelFor('ideas','navidad').subject.includes('Navidad'));assert.equal(personalize('Hola {{nombre}}',sample(),{name:'<Ana>'}),'Hola <Ana>');});
