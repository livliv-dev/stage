import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const root=fileURLToPath(new URL('..',import.meta.url)), artifacts=await mkdtemp(join(tmpdir(), 'stage-journey-')), errors=[], requests=[], report={artifacts}
let server,browser,page,asrMode='ok'
function wav(){const rate=24000,n=rate/2,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.sin(i*440*Math.PI*2/rate)*8000,44+i*2);return b}
try{
 const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r))
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']})
 await new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Vite timeout')),15000);server.stdout.on('data',b=>{if(String(b).includes('Local:')){clearTimeout(t);r()}})})
 browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']})
 const context=await browser.newContext({viewport:{width:1440,height:900},permissions:['camera','microphone']})
 await context.addInitScript(()=>{if(!localStorage.getItem('livliv-stage:locale'))localStorage.setItem('livliv-stage:locale','zh-Hans')})
 await context.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname==='/api/me'){await r.fulfill({json:{signed_in:false}});return}if(u.hostname==='dashscope.aliyuncs.com'){
  if(u.pathname.endsWith('/models')){await r.fulfill({json:{data:[{id:'qwen-flash'}]}});return}
  const body=r.request().postDataJSON();requests.push({path:u.pathname,body});if(u.pathname.endsWith('/chat/completions'))await r.fulfill({json:{choices:[{message:{content:JSON.stringify({text:'你好，一起试试新的舞台吧。',emotion:'happy',action:'nod',to:null,look:'观众'})}}]}})
  else if(u.pathname.endsWith('/SpeechSynthesizer'))await r.fulfill({json:{output:{audio:{url:'https://stage-voice-fixture.test/clip.wav'}}}})
  else if(u.pathname.endsWith('/multimodal-generation/generation')){
   assert.equal(body.model,'qwen-audio-3.0-asr-flash');assert.equal(body.parameters.sample_rate,'16000');assert.equal(body.parameters.format,'wav')
   const input=body.input.messages[0].content[0];assert.equal(input.type,'input_audio');assert.ok(input.input_audio.data.startsWith('data:audio/wav;base64,'));assert.equal(Buffer.from(input.input_audio.data.split(',')[1],'base64').subarray(0,4).toString(),'RIFF')
   if(asrMode==='silence'){await r.fulfill({status:400,json:{code:'CLIENT_ERROR',message:'ASR_RESPONSE_HAVE_NO_WORDS'}});return}
   await r.fulfill({json:asrMode==='error'?{code:'InvalidApiKey',message:'fixture recognition denied'}:asrMode==='malformed'?{output:{}}:{output:{text:'周末一起去玩吧。'}}})
  }
  else throw Error('Unexpected provider request '+u.pathname);return}
  if(u.hostname==='stage-voice-fixture.test'){assert.equal(r.request().headers().authorization,undefined);await r.fulfill({contentType:'audio/wav',body:wav()});return}
  if(u.hostname==='127.0.0.1'||['blob:','data:'].includes(u.protocol))await r.continue();else await r.abort()
 })
 page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:'+port);await page.locator('.welcome-demo').waitFor();assert.equal(await page.locator('.coach').count(),0)
 await page.screenshot({path:join(artifacts,'welcome-zh-Hans.png')})
 const defaults=await page.evaluate(async()=>{const {samples}=await import('/src/library.ts'),{buildTemplate}=await import('/src/templates.ts');const cast=s=>s.items.filter(c=>c.kind==='character').map(c=>c.model.url);return {featured:samples().slice(0,3).map(c=>c.id),solo:cast(await buildTemplate('solo')),ai:cast(await buildTemplate('ai')),trio:cast(await buildTemplate('trio'))}})
 assert.deepEqual(defaults.featured,['d03ft','k01','v04']);assert.deepEqual(defaults.solo,['/characters/d03ft/']);assert.deepEqual(defaults.ai,['/characters/d03ft/']);assert.deepEqual(defaults.trio,['/characters/k01/','/characters/d03ft/','/characters/v04/']);report.characters=defaults
 await page.evaluate(async()=>{window.journeyAudio=[];window.journeyMouth=0;window.journeyMouthByName={};const a=await import('/src/actors.ts');a.onHeard(h=>window.journeyAudio.push(h));a.onFrame(a=>{window.journeyMouth=Math.max(window.journeyMouth,a.lastPose.params.mouthOpen);window.journeyMouthByName[a.item.name]=Math.max(window.journeyMouthByName[a.item.name]||0,a.lastPose.params.mouthOpen)})})
 await page.evaluate(()=>window.__stage.talk.setLimit(2));await page.locator('.welcome-demo').click();await page.waitForFunction(()=>window.__stage.actors.size===3&&[...window.__stage.actors.values()].every(a=>a.status==='ready'))
 await page.waitForFunction(()=>window.__stage.conversation().turns===15&&!window.__stage.conversation().running,null,{timeout:100000});const demo=await page.evaluate(()=>({lines:window.__stage.conversation().lines,audio:window.journeyAudio.map(h=>({who:h.who,start:h.start,size:h.blob.size})),mouth:window.journeyMouthByName,error:window.__stage.conversation().error}));assert.equal(demo.lines.length,15);assert.equal(demo.audio.length,15);assert.equal(demo.error,'');assert.ok(Object.values(demo.mouth).every(v=>v>.05));assert.equal(Object.keys(demo.mouth).length,3);assert.equal(demo.lines.some(l=>l.cut),false);assert.equal(requests.length,0);report.demo=demo;assert.equal(await page.evaluate(()=>window.__stage.conversation().limit),2);await page.evaluate(async()=>{const {Actor}=await import('/src/actors.ts');window.originalDemoPrepare=Actor.prototype.prepare;Actor.prototype.prepare=function(...args){if(args[4]?.endsWith('/02.mp3')){window.pendingDemoSignal=args[3];return new Promise((_,reject)=>args[3].addEventListener('abort',()=>reject(args[3].reason),{once:true}))}return window.originalDemoPrepare.apply(this,args)}})
 await page.getByRole('button',{name:'再看一次',exact:true}).click();await page.waitForFunction(()=>window.__stage.conversation().turns===1&&window.__stage.conversation().thinking&&window.pendingDemoSignal);await page.evaluate(()=>window.__stage.talk.stop());assert.equal(await page.evaluate(()=>window.pendingDemoSignal.aborted),true);await page.evaluate(async()=>{const {Actor}=await import('/src/actors.ts');Actor.prototype.prepare=window.originalDemoPrepare})
 const actorIds=await page.evaluate(()=>[...window.__stage.actors.keys()]);await page.evaluate(()=>{const c=window.__stage.store.get().items.find(c=>c.kind==='character'&&c.name==='Nana');window.__stage.store.patch(c.id,{lines:'me',muted:true})});await page.locator('.model-btn').click();await page.locator('.model-form .providers button.demo').click();await page.locator('.model-form .row.end button.primary').click();await page.waitForFunction(()=>window.__stage.conversation().speaking?.name==='Nana'&&!window.__stage.conversation().waiting);assert.deepEqual(await page.evaluate(()=>[...window.__stage.actors.keys()]),actorIds);assert.equal(await page.evaluate(()=>window.__stage.store.get().items.find(c=>c.name==='Nana').lines),'ai');await page.evaluate(()=>window.__stage.talk.stop());report.demoRecovery='promoted voice preparation aborts on stop; a human-controlled Nana returns to the prepared demo without replacing the actors'
 await page.locator('.actor-select').filter({hasText:'Nana'}).click()
 report.firstDemo='cold start → one click → all 15 lines in three distinct sample voices, moving mouths and captions; no model/voice API or autoplay flags'
 await page.evaluate(()=>{window.journeyCanvases=[...document.querySelectorAll('canvas.character')]})
 await page.locator('.sidebar-toggle.left.expanded').click();await page.locator('.sidebar-toggle.right.expanded').click()
 const left=await page.locator('.sidebar-toggle.left.collapsed').boundingBox(),right=await page.locator('.sidebar-toggle.right.collapsed').boundingBox()
 assert.equal(left.width,right.width);assert.equal(left.height,right.height);assert.equal(left.y,right.y)
 assert.equal(await page.locator('.sidebar-toggle.left.collapsed svg.lucide-chevron-right').count(),1);assert.equal(await page.locator('.sidebar-toggle.right.collapsed svg.lucide-chevron-left').count(),1)
 assert.equal(await page.locator('canvas.character:visible').count(),3)
 await page.screenshot({path:join(artifacts,'matching-sidebars.png')})
 await page.locator('.sidebar-toggle.left.collapsed').click();await page.locator('.sidebar-toggle.right.collapsed').click();assert.equal(await page.evaluate(()=>window.journeyCanvases.every((c,i)=>c===document.querySelectorAll('canvas.character')[i])),true)
 const persona=page.locator('.persona-settings');assert.equal(await persona.getAttribute('open'),null)
 const motion=page.locator('.tracking-adjustments');await motion.locator(':scope > summary').click();await motion.locator('.tracking-mapping > summary').click()
 const outputStart=motion.getByLabel('输出范围 · 起点'),outputEnd=motion.getByLabel('输出范围 · 终点')
 await outputStart.fill('-12');await outputStart.press('Tab');await outputEnd.fill('12');await outputEnd.press('Tab')
 const id=await page.evaluate(()=>window.__stage.store.selected());report.modes=[]
 for(const driver of ['auto','pointer','replay']){
  await page.evaluate(({id,driver})=>window.__stage.store.patch(id,{driver}),{id,driver})
  if(driver==='pointer')await page.mouse.move(1000,500)
  if(driver==='replay')await page.waitForFunction(id=>window.__stage.actors.get(id).inputPhase==='on',id)
  await page.waitForTimeout(400)
  const value=await page.evaluate(id=>{const a=window.__stage.actors.get(id),s=a.trackingSample;return {driver:a.item.driver,input:s?.input.angleX,output:s?.output.angleX,drawn:a.lastPose.params.angleX}},id)
  assert.ok(Math.abs(value.output-value.input*.4)<1e-6);assert.equal(value.output,value.drawn);report.modes.push(value)
 }
 await page.evaluate(id=>{window.__stage.store.patch(id,{driver:'auto'})},id)
 await page.locator('.model-btn').click();const model=page.locator('.popover.model');await model.getByRole('button',{name:'阿里云百炼',exact:true}).click();await model.locator('input[type=password]').fill('fixture-qwen-key');await model.getByPlaceholder('模型名', {exact:true}).fill('qwen-flash');await model.getByRole('button',{name:'保存',exact:true}).click()
 const config=await page.evaluate(async()=>{const v=await import('/src/voiceApi.ts'),b=await import('/src/brain.ts'),cast=window.__stage.store.get().items.filter(c=>c.kind==='character'),s=v.activeSpeech();return {provider:s.provider,model:s.model,voices:cast.map(c=>v.apiVoice(c,s,cast)),brain:b.loadBrainConfig().provider}})
 assert.equal(config.provider,'qwen');assert.equal(config.model,'qwen-audio-3.1-tts-flash');assert.equal(new Set(config.voices).size,3);const stable=await page.evaluate(async()=>{const v=await import('/src/voiceApi.ts'),cast=window.__stage.store.get().items.filter(c=>c.kind==='character'),s=v.activeSpeech();return cast.every(c=>v.apiVoice(c,s,cast)===v.apiVoice(c,s,[...cast].reverse())&&v.apiVoice(c,s,cast)===v.apiVoice(c,s,[c]))});assert.equal(stable,true);report.defaults=config
 await page.evaluate(()=>{const s=window.__stage.store;s.set({talk:{...s.get().talk,order:'round'}});window.__stage.talk.clear();window.__stage.talk.setLimit(2)})
 await page.getByRole('button',{name:'对谈',exact:true}).click();await page.waitForFunction(()=>window.__stage.conversation().turns===2&&!window.__stage.conversation().running)
 assert.equal((await page.evaluate(()=>window.__stage.conversation().error)),'');assert.ok(requests.some(r=>r.path.endsWith('/SpeechSynthesizer')))
 assert.equal(await page.evaluate(async()=>{const v=await import('/src/voiceApi.ts');return v.asrReady({...v.activeSpeech(),key:''})}),false)
 await page.evaluate(()=>localStorage.setItem('livliv-stage:fake-mic','https://stage-voice-fixture.test/mic.wav'))
 const mic=page.getByRole('button',{name:'按住说话',exact:true});assert.equal(await mic.isEnabled(),true);await mic.dispatchEvent('pointerdown',{pointerId:1});await page.waitForFunction(async()=> (await import('/src/ptt.ts')).pttState().phase==='listening');await page.waitForTimeout(700);await mic.dispatchEvent('pointerup',{pointerId:1})
 await page.waitForFunction(()=>window.__stage.conversation().lines.some(l=>l.human&&l.text==='周末一起去玩吧。'));await page.waitForFunction(()=>!window.__stage.conversation().running)
 assert.equal(await page.evaluate(async()=> (await import('/src/livliv.ts')).signedIn()),false);assert.equal(await page.evaluate(async()=> (await import('/src/ptt.ts')).pttState().error),'')
 for(const mode of ['error','malformed']){asrMode=mode;const message=await page.evaluate(async()=>{const v=await import('/src/voiceApi.ts');try{await v.transcribeApi(v.activeSpeech(),await(await fetch('https://stage-voice-fixture.test/mic.wav')).blob());return ''}catch(e){return e.message}});assert.match(message,mode==='error'?/fixture recognition denied/:/没有返回文字/)}asrMode='ok'
 asrMode='silence';await mic.dispatchEvent('pointerdown',{pointerId:1});await page.waitForFunction(async()=> (await import('/src/ptt.ts')).pttState().phase==='listening');await page.waitForTimeout(600);await mic.dispatchEvent('pointerup',{pointerId:1});await page.waitForFunction(async()=> (await import('/src/ptt.ts')).pttState().phase==='idle'&&(await import('/src/ptt.ts')).pttState().error==='没听清，请再说一次');asrMode='ok'
 report.voiceInput='Bailian key enables hold-to-talk while signed out; 16 kHz WAV data URI, transcript submitted to conversation, provider errors surfaced'
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('livliv-stage:brain')))
 await page.locator('.model-btn').click();await page.locator('.model-form .providers button.demo').click();await page.locator('.model-form .row.end button.primary').click();await page.waitForFunction(()=>window.__stage.conversation().running);await page.evaluate(()=>window.__stage.talk.stop())
 await page.locator('.model-btn').click();await page.locator('.popover.model').getByRole('button',{name:'阿里云百炼',exact:true}).click();assert.equal(await page.locator('.popover.model input[type=password]').inputValue(),before.key)
 await page.locator('.popover.model').getByRole('button',{name:'OpenAI',exact:true}).click();assert.equal(await page.locator('.popover.model input[type=password]').inputValue(),'')
 await page.locator('.popover.model button[data-close]').click();report.settings='Bailian model automatically enables native TTS with separate character voices; demo preserves API config; changing provider clears its key; audio download has no auth header'
 for(const locale of ['zh-Hans','zh-Hant','en','ja']){
  await page.locator('.topbar button:has(svg.lucide-settings)').click();await page.locator('.language-select').selectOption(locale);await page.locator('.settings-head button[data-close]').click();await page.setViewportSize({width:1100,height:760})
  await page.locator('.actor-select').first().click();await page.screenshot({path:join(artifacts,'workspace-'+locale+'.png')});assert.equal(await page.locator('.panel').evaluate(e=>e.scrollWidth>e.clientWidth),false);assert.equal(await page.locator('.cast').evaluate(e=>e.scrollWidth>e.clientWidth),false)
  await page.locator('.topbar button:has(svg.lucide-settings)').click();await page.locator('.account-tab').click();assert.equal(await page.locator('.account-benefit').count(),3);assert.equal(await page.locator('.account-panel').evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.screenshot({path:join(artifacts,'account-'+locale+'.png')});await page.locator('.settings-head button[data-close]').click()
 }
 assert.deepEqual(errors,[]);report.errors=errors;await writeFile(join(artifacts,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}catch(e){await page?.screenshot({path:join(artifacts,'failure.png')}).catch(()=>{});console.error(artifacts);throw e}
finally{await browser?.close();server?.kill('SIGTERM')}
