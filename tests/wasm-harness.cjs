const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {fileURLToPath,pathToFileURL}=require('node:url');
async function createEngine(onMessage=()=>{}){
  const root=path.resolve(__dirname,'../extension');let context,resolveReady,rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const globals={console,performance,setTimeout,clearTimeout,TextDecoder,TextEncoder,URL,Response,Headers,process,require,module:{exports:{}},__dirname:path.join(root,'vendor'),
    fetch:async url=>{const parsed=new URL(url);if(parsed.protocol!=='file:')throw Error('Unexpected network request');return new Response(fs.readFileSync(fileURLToPath(parsed)));},
    location:{href:pathToFileURL(path.join(root,'engine-worker.js')).href},
    postMessage:message=>{if(message.type==='ready')resolveReady(message);if(message.type==='error')rejectReady(Error(message.message));onMessage(message);},
    importScripts:(...names)=>{for(const name of names)vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});}
  };globals.self=globals;context=vm.createContext(globals);
  vm.runInContext(fs.readFileSync(path.join(root,'engine-worker.js'),'utf8'),context);
  const timer=setTimeout(()=>rejectReady(Error('Engine startup timed out')),60000);
  try{await ready;}finally{clearTimeout(timer);}
  return {send:data=>context.onmessage({data}),heap:()=>context.Module.HEAPU8.length};
}
module.exports={createEngine};
