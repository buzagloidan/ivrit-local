const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tools=require('../extension/transcript-tools.js');
const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
const cues=[{start:1.25,end:2.9,text:'שלום --> <script>עולם</script>'}];
assert.match(tools.captions(cues,'srt'),/00:00:01,250 --> 00:00:02,900/);
assert.match(tools.captions(cues,'vtt'),/^WEBVTT\n\n00:00:01.250/);
assert.equal(tools.validCues([{start:NaN,end:3,text:'bad'},...cues,{start:2,end:1,text:'bad'}]).length,1);
assert(!tools.captions(cues,'vtt').includes('שלום -->'));
assert(tools.captions(cues,'vtt').includes('&lt;script&gt;'));
assert.equal(tools.validCues(tools.validCues(cues))[0].text,cues[0].text);
tools.saveDraft(storage,'private',cues);assert.equal(storage.getItem('draft'),null);
storage.setItem('save-draft','true');tools.saveDraft(storage,'private',cues,1000);assert.equal(tools.readDraft(storage,2000).text,'private');
assert.equal(tools.readDraft(storage,8*86400000),null);assert.equal(storage.getItem('draft'),null);
storage.setItem('draft','malformed');assert.equal(tools.readDraft(storage),null);
console.log('PASS: caption timestamps/escaping, malformed cues, opt-in drafts, expiration and malformed recovery');
async function fileTest({size=100,duration=20,fail=false}={}){
  const calls={closed:0,revoked:0};
  class Audio{pause(){calls.closed++;}removeAttribute(){}load(){}set src(value){queueMicrotask(()=>{this.duration=duration;if(fail)this.onerror();else this.onloadedmetadata();});}}
  const context={IvritTranscript:tools,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){calls.revoked++;}},Audio,DOMException,queueMicrotask,setTimeout,clearTimeout};context.globalThis=context;
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/file-player.js'),'utf8'),context);
  const file={size,arrayBuffer(){throw Error('Whole-file PCM decoding must not occur');}};
  return {promise:context.IvritFilePlayer.open(file),calls};
}
(async()=>{
  const good=await fileTest();const opened=await good.promise;opened.close();assert.equal(good.calls.revoked,1);
  for(const options of [{size:tools.MAX_FILE_BYTES+1},{duration:3601},{duration:Infinity},{fail:true}]){
    const test=await fileTest(options);await assert.rejects(test.promise);if(options.size===undefined)assert.equal(test.calls.revoked,1);
  }
  console.log('PASS: bounded streaming file import, size/duration checks, decode errors and object-URL cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
