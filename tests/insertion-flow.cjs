// Production panel/background routing. No real browser permissions are granted.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {environment,drain}=require('./microphone-flow.cjs');
async function panel({response={ok:true,tabId:42},granted=true,pending}={}) {
  const env=environment();await env.ready();env.order=[];
  env.context.chrome.permissions={request(options){env.order.push({type:'permission',origins:Array.from(options.origins)});return pending||Promise.resolve(granted);}};
  env.context.chrome.runtime.sendMessage=async message=>{env.order.push(message);return response;};
  env.elements.get('transcript').value='שלום';env.elements.get('transcript').events.input();return env;
}
function result(env,session='test-session',id=42){env.message({type:'ivrit-insertion-result',session,ok:true,undo:true},{id:'ivrit-test',tab:{id}});}
(async()=>{
  const temporary=await panel();await temporary.click('insert');
  assert.equal(temporary.order[0].type,'start-insertion');assert.equal(temporary.order[0].windowId,10);
  assert(!temporary.order.some(item=>item.type==='permission'),'Temporary tab access needs no persistent host permission');
  result(temporary,'wrong');assert(temporary.elements.get('insert').disabled);result(temporary);
  assert.equal(temporary.elements.get('undo-insert').hidden,false);
  await temporary.click('undo-insert');assert.equal(temporary.order.at(-1).type,'undo-insertion');
  console.log('PASS: temporary access is default; matching completion enables explicit Undo');
  const perSite=await panel({response:{ok:false,needsAccess:true,tabId:42,origin:'https://example.com'}});
  await perSite.click('insert');assert.equal(perSite.elements.get('insertion-access').hidden,false);
  const enabling=perSite.click('enable-insertion');
  assert.deepEqual(perSite.order.at(-1),{type:'permission',origins:['https://example.com/*']},'Request occurs synchronously in Allow click');
  await enabling;await perSite.click('cancel-insert');
  console.log('PASS: per-site permission is explicit, least-scoped, and requested within the gesture');
  const broad=await panel({response:{ok:false,needsAccess:true,tabId:42}});await broad.click('insert');
  broad.elements.get('insertion-all-sites').checked=true;await broad.click('enable-insertion');
  assert.deepEqual(broad.order.find(item=>item.type==='permission').origins,['https://*/*','http://*/*']);await broad.click('cancel-insert');
  const denied=await panel({response:{ok:false,needsAccess:true,tabId:42,origin:'https://example.com'},granted:false});await denied.click('insert');await denied.click('enable-insertion');
  assert.equal(denied.elements.get('copy').disabled,false);await denied.click('cancel-insert');
  console.log('PASS: all-sites requires checked opt-in; denying access leaves Copy available');
  const changed=await panel();await changed.click('insert');changed.elements.get('transcript').events.input();
  assert.equal(changed.order.at(-1).type,'cancel-insertion');result(changed);assert(!changed.order.some(item=>item.type==='undo-insertion'));
  let handler;const messages=[];
  const chrome={action:{onClicked:{addListener(){}}},runtime:{id:'test',getURL:file=>`chrome-extension://test/${file}`,onMessage:{addListener(fn){handler=fn;}}},tabs:{query:async()=>[{id:42,url:'https://example.com'}],sendMessage:async(tabId,message)=>{messages.push(message);return{ok:true};}},scripting:{executeScript:async()=>{}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/background.js'),'utf8'),{chrome,console,URL});
  async function send(message,sender={id:'test',url:'chrome-extension://test/panel.html'}){let response;const handled=handler(message,sender,value=>response=value);await drain();return{response,handled};}
  const start={type:'start-insertion',text:'שלום',session:'x'};
  assert.equal((await send(start)).response.ok,true);
  assert.equal((await send(start,{id:'test',url:'https://example.com'})).handled,undefined);
  assert.equal((await send({...start,text:'x'.repeat(200001)})).response.ok,false);
  chrome.scripting.executeScript=async()=>{throw Error('withheld');};assert.equal((await send(start)).response.needsAccess,true);
  assert.equal((await send({...start,tabId:99})).response.ok,false);
  console.log('PASS: background validates sender, text bounds, destination identity and withheld permissions');
  console.log('All insertion-flow checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
