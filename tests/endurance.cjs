// Repeated CC0 speech plus silence; no private recordings, network, or unbounded input buffer.
const {createEngine}=require('./wasm-harness.cjs');
const {execFileSync}=require('node:child_process');const path=require('node:path');
(async()=>{
  const seconds=Number(process.env.ENDURANCE_SECONDS||1800);
  if(!Number.isFinite(seconds)||seconds<60||seconds>3600)throw Error('Use 60–3600 seconds');
  const data=execFileSync(process.env.FFMPEG||'ffmpeg',['-v','error','-i',path.resolve(__dirname,'../extension/demo/sample-hebrew.wav'),'-ar','16000','-ac','1','-f','f32le','pipe:1']);
  const greeting=new Float32Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
  let final,error;const engine=await createEngine(message=>{if(message.type==='finished')final=message;if(message.type==='error')error=message.message;});
  await engine.send({type:'start',id:1});const started=performance.now(),memory=[];
  for(let offset=0;offset<seconds*16000;offset+=5120){
    const count=Math.min(5120,seconds*16000-offset),samples=new Float32Array(count);
    for(let i=0;i<count;i++){const position=(offset+i)%(12*16000);if(position<greeting.length)samples[i]=greeting[position];}
    await engine.send({type:'audio',id:1,samples:samples.buffer});if(error)throw Error(error);
    if(offset%(16000*60)===0)memory.push({audioSeconds:offset/16000,rssMiB:Math.round(process.memoryUsage().rss/1024**2)});
  }
  await engine.send({type:'finish',id:1});if(error)throw Error(error);
  if(!final?.text.includes('שלום')||final.cues.length<Math.floor(seconds/24))throw Error('Speech/endpoint output did not survive endurance run');
  const warm=memory.filter(row=>row.audioSeconds>=60),growth=warm.length?Math.max(...warm.map(row=>row.rssMiB))-warm[0].rssMiB:0;
  if(growth>256)throw Error(`Unexpected sustained memory growth: ${growth} MiB`);
  console.log(JSON.stringify({audioSeconds:seconds,processingSeconds:+((performance.now()-started)/1000).toFixed(2),segments:final.cues.length,heapMiB:engine.heap()/1024**2,rssGrowthAfterWarmupMiB:growth,memory},null,2));
  await engine.send({type:'start',id:2});await engine.send({type:'finish',id:2});if(final.text)throw Error('Previous transcript leaked to fresh session');
  console.log('PASS: endurance, segmentation, bounded memory and clean new session');
})().catch(error=>{console.error(error);process.exitCode=1;});
