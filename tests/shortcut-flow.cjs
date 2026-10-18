// Real background/panel modules with browser APIs mocked: never captures a physical mic.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {environment,drain}=require('./microphone-flow.cjs');
const manifest=require('../extension/manifest.json');
function background({openError,openPromise}={}){
  const calls={opened:[],broadcast:[]},panels=[];
  let command,handler,removed,now=Date.now();
  const chrome={
    action:{onClicked:{addListener(){}}},
    commands:{onCommand:{addListener(fn){command=fn;}}},
    windows:{onRemoved:{addListener(fn){removed=fn;}}},
    sidePanel:{open(options){calls.opened.push(options);return openError?Promise.reject(openError):openPromise||Promise.resolve();}},
    runtime:{id:'ivrit-test',getURL:file=>`chrome-extension://ivrit-test/${file}`,onMessage:{addListener(fn){handler=fn;}},async sendMessage(message){
      calls.broadcast.push(message);
      for(const env of panels)env.message(message,{id:'ivrit-test',url:'chrome-extension://ivrit-test/background.js'});
    }},
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/background.js'),'utf8'),{chrome,URL,Date:{now:()=>now},console:{warn(){}}});
  function send(message,sender={id:'ivrit-test',url:'chrome-extension://ivrit-test/panel.html'}){
    let response;handler(message,sender,value=>response=value);return response;
  }
  return{calls,send,command:(windowId=10)=>command('toggle-microphone',{id:42,windowId}),removed,
    advance(ms){now+=ms;},
    connect(env){panels.push(env);env.context.chrome.runtime.sendMessage=async message=>{
      env.calls.messages.push(message);
      if(['claim-microphone-shortcut','cancel-microphone-shortcut'].includes(message.type))return send(message);
      return{accepted:true};
    };return env;},
  };
}
(async()=>{
  assert.equal(manifest.commands['toggle-microphone'].suggested_key.default,'Ctrl+Shift+Space');
  assert.equal(manifest.commands['toggle-microphone'].suggested_key.mac,'Command+Shift+Space');
  assert(!manifest.commands['toggle-microphone'].global,'Recording is scoped to Chrome');

  const cold=background();cold.command();assert.equal(cold.calls.opened.length,1,'Panel open called synchronously in shortcut gesture');
  const recorder=cold.connect(environment({permission:'granted'}));await drain();
  assert.equal(recorder.calls.audio,0,'Cold model never records before ready');
  await recorder.ready();assert.equal(recorder.calls.audio,1);
  assert.equal(cold.send({type:'claim-microphone-shortcut',windowId:10}).requestId,undefined,'Intent consumed once');
  cold.command();await drain();assert.equal(recorder.calls.tracksStopped,1,'Second key press flushes and releases the microphone');
  console.log('PASS: cold open, model-ready handoff, one-time claim, toggle Stop');

  const windows=background();const first=windows.connect(environment({windowId:10,permission:'granted'}));const second=windows.connect(environment({windowId:20,permission:'granted'}));
  await first.ready();await second.ready();windows.command(20);await drain();
  assert.equal(first.calls.audio,0);assert.equal(second.calls.audio,1);await second.click('record');
  console.log('PASS: separate Chrome windows cannot trigger each other’s microphone');

  const permissions=background();const prompt=permissions.connect(environment());await prompt.ready();permissions.command();await drain();
  assert.equal(prompt.calls.windows.length,1);assert.equal(prompt.calls.audio,0,'First use follows the existing permission window');
  permissions.command();await drain();assert.deepEqual(prompt.calls.removed,[50]);
  assert.equal(prompt.message({type:'ivrit-microphone-ready',session:'test-session'}).accepted,false,'Cancelled permission cannot later record');
  console.log('PASS: permission setup/cancellation and stale approval');

  const loading=background();loading.command();loading.command();await drain();
  const cancelled=loading.connect(environment({permission:'granted'}));await cancelled.ready();assert.equal(cancelled.calls.audio,0,'Second press cancels a queued cold start');
  const expired=background();expired.command();await drain();expired.advance(30001);
  const late=expired.connect(environment({permission:'granted'}));await late.ready();assert.equal(late.calls.audio,0,'Expired shortcuts cannot start delayed recording');
  const closed=background();closed.command();await drain();closed.removed(10);assert(!closed.send({type:'claim-microphone-shortcut',windowId:10}).requestId);
  console.log('PASS: queued cancellation, expiration and closed-window cleanup');

  const isolation=background();isolation.command();await drain();
  assert.equal(isolation.send({type:'claim-microphone-shortcut',windowId:10},{id:'other',url:'chrome-extension://ivrit-test/panel.html'}),undefined);
  assert.equal(isolation.send({type:'claim-microphone-shortcut',windowId:10},{id:'ivrit-test',url:'https://example.com'}),undefined);
  assert(!isolation.send({type:'claim-microphone-shortcut',windowId:20}).requestId);
  assert(isolation.send({type:'claim-microphone-shortcut',windowId:10}).requestId,'Unauthorized claims do not consume the intent');

  let finishOpen;const early=background({openPromise:new Promise(resolve=>finishOpen=resolve)});early.command();
  assert(!early.send({type:'claim-microphone-shortcut',windowId:10}).requestId,'No claim before Chrome opens the panel');
  finishOpen();await drain();assert(early.send({type:'claim-microphone-shortcut',windowId:10}).requestId);
  const failed=background({openError:new Error('gesture lost')});failed.command();await drain();assert(!failed.send({type:'claim-microphone-shortcut',windowId:10}).requestId);
  console.log('PASS: sender/window isolation and failed/opening panel safety');

  const hiddenBg=background();const hidden=hiddenBg.connect(environment({permission:'granted'}));hidden.context.document.hidden=true;await hidden.ready();hiddenBg.command();await drain();assert.equal(hidden.calls.audio,0);
  hidden.listeners.document.visibilitychange();hidden.context.document.hidden=false;hidden.listeners.document.visibilitychange();await drain();assert.equal(hidden.calls.audio,0,'Hiding cancels a queued intent');
  const disposedBg=background();const disposed=disposedBg.connect(environment({permission:'granted'}));await disposed.ready();disposed.listeners.page.pagehide();disposedBg.command();await drain();assert.equal(disposed.calls.audio,0,'Closed panels cannot record');
  const earlyCloseBg=background();earlyCloseBg.command();const earlyClosed=earlyCloseBg.connect(environment({permission:'granted'}));earlyClosed.listeners.page.pagehide();await drain();
  assert(!earlyCloseBg.send({type:'claim-microphone-shortcut',windowId:10}).requestId,'Closing before window lookup completes still cancels the request');
  console.log('PASS: hidden and closed panels cannot begin capture');

  const raceBg=background();const race=raceBg.connect(environment({permission:'granted'}));await race.ready();
  let resolveMedia;race.context.navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>resolveMedia=resolve);
  raceBg.command();await drain();assert(resolveMedia);raceBg.command();await drain();let stopped=0;
  const track={stop(){stopped++;}};resolveMedia({getTracks:()=>[track],getAudioTracks:()=>[track]});await drain();
  assert.equal(stopped,1,'Late media after shortcut cancellation is immediately released');
  assert.equal(race.elements.get('record-label').textContent,'התחלת הקלטה');
  console.log('PASS: a second key press cancels opening capture, including a late media grant');

  const sourceBg=background();const source=sourceBg.connect(environment({permission:'granted'}));await source.ready();source.elements.get('audio-source').value='tab';source.elements.get('audio-source').events.change();
  source.context.navigator.mediaDevices.getDisplayMedia=()=>{throw Error('Keyboard must never invoke the tab picker');};sourceBg.command();await drain();
  assert.equal(source.elements.get('audio-source').value,'microphone');assert.equal(source.calls.audio,1);await source.click('record');
  const noBinding=environment({shortcuts:[]});await noBinding.ready();assert.match(noBinding.elements.get('record-shortcut').textContent,/לא הוגדר קיצור/);await noBinding.click('configure-shortcuts');assert.equal(noBinding.calls.tabs[0].url,'chrome://extensions/shortcuts');
  noBinding.context.chrome.commands.getAll=async()=>[{name:'toggle-microphone',shortcut:'Alt+Shift+R'}];
  await noBinding.listeners.page.focus();assert.match(noBinding.elements.get('record-shortcut').textContent,/Alt\+Shift\+R/);
  console.log('PASS: microphone-only start, missing binding feedback and shortcut settings button');
  console.log('All keyboard-shortcut flow checks passed. Native Chrome keyboard registration remains a manual check.');
})().catch(error=>{console.error(error);process.exitCode=1;});
