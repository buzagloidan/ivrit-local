let session=0;
function message(data,sender={id:'ivrit-test'}){let response;insertionHandlers[0](data,sender,value=>response=value);return response;}
function pick(text){const token=`test-${++session}`;const result=message({type:'ivrit-pick-target',text,session:token});if(!result?.ok)throw Error(result?.error||'Could not arm');return token;}
const wait=()=>new Promise(resolve=>setTimeout(resolve,20));
document.getElementById('demo').addEventListener('click',()=>{pick('שלום ');document.getElementById('results').textContent='Armed: click the text field, or focus it and press Enter.';});
document.getElementById('replace').addEventListener('click',()=>{const field=document.getElementById('area');field.value='replace me';pick('החלף');field.focus();field.setSelectionRange(0,7);document.getElementById('results').textContent='Armed selection replacement: press Enter in the text area.';});
document.getElementById('literal').addEventListener('click',()=>{const field=document.getElementById('editor');field.textContent='Existing: ';pick('<script>שלום</script>');field.focus();const range=document.createRange();range.selectNodeContents(field);range.collapse(false);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
document.getElementById('undo').addEventListener('click',()=>{const result=message({type:'ivrit-undo-insertion',session:`test-${session}`});document.getElementById('results').textContent=result.ok?'Undo passed':result.error;});
document.getElementById('run').addEventListener('click',async()=>{
 const log=[],check=(value,label)=>{if(!value)throw Error(label);log.push('PASS: '+label);};
 try{
  const field=document.getElementById('plain');field.value='before after';
  const token=pick('secret transcript');field.click();await wait();
  check(field.value==='before after'&&!insertionResults.some(row=>row.session===token),'Scripted clicks cannot steal the pending transcript');
  field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,composed:true}));await wait();
  check(field.value==='before after','Synthetic keyboard events cannot insert or submit');
  const hidden=document.createElement('input');hidden.hidden=true;document.body.append(hidden);hidden.click();await wait();check(hidden.value==='','Hidden destinations cannot receive text');hidden.remove();
  document.getElementById('secret').click();await wait();check(document.getElementById('secret').value==='untouched','Password remains unchanged');
  message({type:'ivrit-cancel-insertion',session:token});field.click();await wait();check(field.value==='before after','Cancellation disarms the page');
  check(!message({type:'ivrit-pick-target',session:'huge',text:'x'.repeat(200001)}).ok,'Oversized insertion is rejected');
  message({type:'ivrit-pick-target',session:'spoof',text:'bad'},{id:'spoof'});check(!document.querySelector('[data-ivrit-picker]'),'Untrusted senders cannot arm insertion');
  document.getElementById('results').textContent=log.join('\n')+'\nAll adversarial checks passed. Use the arm buttons for real browser-input checks.';
 }catch(error){document.getElementById('results').textContent=log.join('\n')+'\nFAIL: '+error.message;}
});
