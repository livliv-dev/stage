import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { freePort, startVite, testTimeout } from './vite.mjs'
const root=fileURLToPath(new URL('..',import.meta.url)), artifacts=await mkdtemp(join(tmpdir(), 'stage-journey-')), errors=[], requests=[], report={artifacts}
let server,browser,page,asrMode='ok'
function wav(){const rate=24000,n=rate/2,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.sin(i*440*Math.PI*2/rate)*8000,44+i*2);return b}
try{
 const port=await freePort();server=await startVite({port})
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
 page=await context.newPage();page.setDefaultTimeout(testTimeout(20000));page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:'+port);await page.locator('.welcome-demo').waitFor();assert.equal(await page.locator('.coach').count(),0)
 await page.screenshot({path:join(artifacts,'welcome-zh-Hans.png')})
 const defaults=await page.evaluate(async()=>{const {samples}=await import('/src/library.ts'),{buildTemplate}=await import('/src/templates.ts');const cast=s=>s.items.filter(c=>c.kind==='character').map(c=>c.model.url);return {featured:samples().slice(0,3).map(c=>c.id),solo:cast(await buildTemplate('solo')),ai:cast(await buildTemplate('ai')),trio:cast(await buildTemplate('trio'))}})
 assert.deepEqual(defaults.featured,['d03ft','k01','v04']);assert.deepEqual(defaults.solo,['/characters/d03ft/']);assert.deepEqual(defaults.ai,['/characters/d03ft/']);assert.deepEqual(defaults.trio,['/characters/k01/','/characters/d03ft/','/characters/v04/']);report.characters=defaults
 await page.evaluate(async()=>{window.journeyAudio=[];window.journeyMouth=0;window.journeyMouthByName={};const a=await import('/src/actors.ts');a.onHeard(h=>window.journeyAudio.push(h));a.onFrame(a=>{window.journeyMouth=Math.max(window.journeyMouth,a.lastPose.params.mouthOpen);window.journeyMouthByName[a.item.name]=Math.max(window.journeyMouthByName[a.item.name]||0,a.lastPose.params.mouthOpen)})})
 await page.evaluate(async()=>{
  const {Actor}=await import('/src/actors.ts');window.journeyReactions=[];window.journeySenaClosedSmile=false
  window.originalDemoReact=Actor.prototype.react
  Actor.prototype.react=function(cue,planned){const applied=window.originalDemoReact.call(this,cue,planned);if(applied)window.journeyReactions.push({listener:this.item.name,speaker:window.__stage.conversation().speaking?.name,turn:window.__stage.conversation().turns,cue});return applied}
  ;(await import('/src/actors.ts')).onFrame(actor=>{if(actor.item.name==='Sena'&&window.__stage.conversation().turns===2&&actor.expression==='smile')window.journeySenaClosedSmile=true})
 })
 await page.evaluate(()=>window.__stage.talk.setLimit(2));await page.locator('.welcome-demo').click();await page.waitForFunction(()=>window.__stage.actors.size===3&&[...window.__stage.actors.values()].every(a=>a.status==='ready'))
 await page.waitForFunction(()=>window.__stage.conversation().turns===6&&!window.__stage.conversation().running,null,{timeout:100000});const demo=await page.evaluate(()=>({lines:window.__stage.conversation().lines,audio:window.journeyAudio.map(h=>({who:h.who,start:h.start,size:h.blob.size})),mouth:window.journeyMouthByName,error:window.__stage.conversation().error}));assert.equal(demo.lines.length,6);assert.equal(demo.audio.length,6);assert.equal(demo.error,'');assert.ok(Object.values(demo.mouth).every(v=>v>.05));assert.equal(Object.keys(demo.mouth).length,3);assert.equal(demo.lines.some(l=>l.cut),false);assert.equal(requests.length,0);report.demo=demo;assert.equal(await page.evaluate(()=>window.__stage.conversation().limit),2);await page.evaluate(async()=>{const {Actor}=await import('/src/actors.ts');window.originalDemoPrepare=Actor.prototype.prepare;Actor.prototype.prepare=function(...args){if(args[4]?.endsWith('/02.mp3')){window.pendingDemoSignal=args[3];return new Promise((_,reject)=>args[3].addEventListener('abort',()=>reject(args[3].reason),{once:true}))}return window.originalDemoPrepare.apply(this,args)}})
 const reactions=await page.evaluate(()=>window.journeyReactions)
 assert.ok(reactions.some(r=>r.listener==='Nana'&&r.speaker==='Sena'&&r.turn===2&&r.cue.action==='tilt'))
 assert.ok(reactions.some(r=>r.listener==='Kai'&&r.speaker==='Sena'&&r.turn===2&&r.cue.action==='shake'))
 assert.ok(reactions.some(r=>r.listener==='Sena'&&r.speaker==='Kai'&&r.turn===3&&r.cue.action==='shy'))
 assert.equal(await page.evaluate(()=>window.journeySenaClosedSmile),false,'the high-note line keeps Sena out of the closed-eye smile texture')
 report.demoListenerReactions=reactions
 // the demo's end leads on (the same three with a model of one's own), and watching it marks nothing done: the
 // checklist still asks for a model
 const checklist=page.locator('.popover.checklist'),modelRow=checklist.locator('li.check').filter({hasText:'文字模型'})
 await page.getByRole('button',{name:'用你的模型重来一遍',exact:true}).waitFor();await page.locator('.status-line .st-tag').filter({hasText:'准备清单'}).click();await checklist.waitFor()
 assert.equal(await modelRow.getAttribute('class'),'check todo','watching the demo sets up no model');await checklist.locator('button[data-close]').click();await checklist.waitFor({state:'detached'})
 report.demoEnd='再看一次 and 用你的模型重来一遍 offered; the checklist still asks for a model'
 await page.getByRole('button',{name:'再看一次',exact:true}).click();await page.waitForFunction(()=>window.__stage.conversation().turns===1&&window.__stage.conversation().thinking&&window.pendingDemoSignal);await page.evaluate(()=>window.__stage.talk.stop());assert.equal(await page.evaluate(()=>window.pendingDemoSignal.aborted),true);await page.evaluate(async()=>{const {Actor}=await import('/src/actors.ts');Actor.prototype.prepare=window.originalDemoPrepare})
 const actorIds=await page.evaluate(()=>[...window.__stage.actors.keys()]);await page.evaluate(()=>{const c=window.__stage.store.get().items.find(c=>c.kind==='character'&&c.name==='Nana');window.__stage.store.patch(c.id,{lines:'me',muted:true})});await page.locator('.topbar .scene-switcher button[aria-expanded]').click();await page.locator('.shot-start').click();await page.locator('.start-overlay .welcome-demo').click();await page.waitForFunction(()=>window.__stage.conversation().speaking?.name==='Nana'&&!window.__stage.conversation().waiting);assert.deepEqual(await page.evaluate(()=>[...window.__stage.actors.keys()]),actorIds);assert.equal(await page.evaluate(()=>window.__stage.store.get().items.find(c=>c.name==='Nana').lines),'ai');await page.evaluate(()=>window.__stage.talk.stop());const stoppedReactions=await page.evaluate(()=>window.journeyReactions.length);await page.waitForTimeout(4500);assert.equal(await page.evaluate(()=>window.journeyReactions.length),stoppedReactions,'stopping cancels pending listener directions');await page.evaluate(async()=>{(await import('/src/actors.ts')).Actor.prototype.react=window.originalDemoReact});report.demoRecovery='promoted voice preparation aborts on stop; a human-controlled Nana returns to the prepared demo without replacing the actors'
 await page.locator('.actor-select').filter({hasText:'Nana'}).click()
 report.firstDemo='cold start → one click → all 6 lines in three distinct sample voices, moving mouths and captions; no model/voice API or autoplay flags'
 report.demoLanguages=[]
 for(const locale of ['en','ja','zh-Hant']){
  await page.evaluate(async locale=>{(await import('/src/i18n.ts')).setLocale(locale);window.journeyAudio=[];window.journeyMouthByName={}},locale)
  const started=Date.now()
  await page.getByRole('button',{name:locale==='en'?'Replay demo':locale==='ja'?'もう一度見る':'再看一次',exact:true}).click()
  if(locale==='en'){
   await page.waitForFunction(()=>window.__stage.conversation().lines.length>=1)
   await page.evaluate(async()=>(await import('/src/i18n.ts')).setLocale('ja'))
  }
  await page.waitForFunction(()=>window.__stage.conversation().turns===6&&!window.__stage.conversation().running,null,{timeout:35000})
  const localized=await page.evaluate(()=>({lines:window.__stage.conversation().lines,audio:window.journeyAudio.length,mouth:window.journeyMouthByName,error:window.__stage.conversation().error}))
  const language=locale==='zh-Hant'?'zh':locale
  assert.equal(localized.lines.length,6);assert.equal(localized.audio,6);assert.equal(localized.error,'')
  assert.ok(localized.lines.every(line=>line.demoLocale===locale&&line.audio.includes('/trio/'+language+'/')))
  assert.equal(Object.keys(localized.mouth).length,3);assert.ok(Object.values(localized.mouth).every(value=>value>.05))
  if(locale==='en')assert.match(localized.lines[0].text,/first show/)
  if(locale==='ja')assert.match(localized.lines[0].text,/共演/)
  if(locale==='zh-Hant')assert.match(localized.lines[0].text,/你們/)
  report.demoLanguages.push({locale,seconds:(Date.now()-started)/1000,audio:localized.audio,mouth:localized.mouth})
 }
 assert.equal(requests.length,0,'all localized demos use bundled speech only')
 await page.evaluate(async()=>(await import('/src/i18n.ts')).setLocale('zh-Hans'))
 await page.evaluate(()=>{window.journeyCanvases=[...document.querySelectorAll('canvas.character')]})
 await page.locator('.sidebar-toggle.left.expanded').click();await page.locator('.sidebar-toggle.right.expanded').click()
 const left=await page.locator('.sidebar-toggle.left.collapsed').boundingBox(),right=await page.locator('.sidebar-toggle.right.collapsed').boundingBox()
 assert.equal(left.width,right.width);assert.equal(left.height,right.height);assert.equal(left.y,right.y)
 assert.equal(await page.locator('.sidebar-toggle.left.collapsed svg.lucide-chevron-right').count(),1);assert.equal(await page.locator('.sidebar-toggle.right.collapsed svg.lucide-chevron-left').count(),1)
 assert.equal(await page.locator('canvas.character:visible').count(),3)
 await page.screenshot({path:join(artifacts,'matching-sidebars.png')})
 await page.locator('.sidebar-toggle.left.collapsed').click();await page.locator('.sidebar-toggle.right.collapsed').click();assert.equal(await page.evaluate(()=>window.journeyCanvases.every((c,i)=>c===document.querySelectorAll('canvas.character')[i])),true)
 // the persona is out of the way: the card opens on 谁来演, the persona on its own page
 assert.equal(await page.locator('.panel .card-pages [aria-selected="true"]').innerText(),'谁来演');assert.equal(await page.locator('.panel').getByText('人设与风格',{exact:true}).count(),0)
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
 // a model of one's own after the demo: 用你的模型重来一遍 → the checklist → 连接 (百炼) → 保存 → the checklist again
 await page.locator('.console').getByRole('button',{name:'用你的模型重来一遍',exact:true}).click();await checklist.waitFor();await modelRow.getByRole('button',{name:'去设置',exact:true}).click()
 const settings=page.locator('.popover.settings'),model=settings.locator('[data-section="model"]');await model.getByRole('button',{name:'阿里云百炼',exact:true}).click();await model.locator('input[type=password]').fill('fixture-qwen-key');await model.getByPlaceholder('模型名', {exact:true}).fill('qwen-flash');await model.getByRole('button',{name:'保存',exact:true}).click()
 await settings.waitFor({state:'detached'});await checklist.waitFor()
 const config=await page.evaluate(async()=>{const v=await import('/src/voiceApi.ts'),b=await import('/src/brain.ts'),cast=window.__stage.store.get().items.filter(c=>c.kind==='character'),s=v.activeSpeech();return {provider:s.provider,model:s.model,voices:cast.map(c=>v.apiVoice(c,s,cast)),brain:b.loadBrainConfig().provider}})
 assert.equal(config.provider,'qwen');assert.equal(config.model,'qwen-audio-3.1-tts-flash');assert.equal(new Set(config.voices).size,3);const stable=await page.evaluate(async()=>{const v=await import('/src/voiceApi.ts'),cast=window.__stage.store.get().items.filter(c=>c.kind==='character'),s=v.activeSpeech();return cast.every(c=>v.apiVoice(c,s,cast)===v.apiVoice(c,s,[...cast].reverse())&&v.apiVoice(c,s,cast)===v.apiVoice(c,s,[c]))});assert.equal(stable,true);report.defaults=config
 await page.evaluate(()=>{const s=window.__stage.store;s.set({talk:{...s.get().talk,order:'round'}});window.__stage.talk.clear();window.__stage.talk.setLimit(2)})
 assert.equal((await checklist.locator('footer .primary').innerText()).trim(),'开始聊天');await checklist.locator('footer .primary').click();await page.waitForFunction(()=>window.__stage.conversation().turns===2&&!window.__stage.conversation().running)
 assert.equal((await page.evaluate(()=>window.__stage.conversation().error)),'');assert.ok(requests.some(r=>r.path.endsWith('/SpeechSynthesizer')))
 assert.equal(await page.evaluate(async()=>{const v=await import('/src/voiceApi.ts');return v.asrReady({...v.activeSpeech(),key:''})}),false)
 await page.evaluate(()=>localStorage.setItem('livliv-stage:fake-mic','https://stage-voice-fixture.test/mic.wav'))
 // hold-to-talk with nothing running: the ` key (the console's 按住说话 button is there while a session runs); the start
 // options offer 按住说 once a key covers recognition
 await page.locator('.console .start-rows').click();const holdOption=page.locator('.popover.start-options .option-row').nth(2).getByRole('button',{name:'按住说',exact:true})
 assert.equal(await holdOption.isEnabled(),true);await page.locator('.popover.start-options button[data-close]').click();await page.evaluate(()=>document.activeElement?.blur?.())
 const mic={dispatchEvent:async(type)=>{if(type==='pointerdown')await page.keyboard.down('Backquote');else await page.keyboard.up('Backquote')}};await mic.dispatchEvent('pointerdown',{pointerId:1});await page.waitForFunction(async()=> (await import('/src/ptt.ts')).pttState().phase==='listening');await page.waitForTimeout(700);await mic.dispatchEvent('pointerup',{pointerId:1})
 await page.waitForFunction(()=>window.__stage.conversation().lines.some(l=>l.human&&l.text==='周末一起去玩吧。'));await page.waitForFunction(()=>!window.__stage.conversation().running)
 assert.equal(await page.evaluate(async()=> (await import('/src/livliv.ts')).signedIn()),false);assert.equal(await page.evaluate(async()=> (await import('/src/ptt.ts')).pttState().error),'')
 for(const mode of ['error','malformed']){asrMode=mode;const message=await page.evaluate(async()=>{const v=await import('/src/voiceApi.ts');try{await v.transcribeApi(v.activeSpeech(),await(await fetch('https://stage-voice-fixture.test/mic.wav')).blob());return ''}catch(e){return e.message}});assert.match(message,mode==='error'?/fixture recognition denied/:/没有返回文字/)}asrMode='ok'
 asrMode='silence';await mic.dispatchEvent('pointerdown',{pointerId:1});await page.waitForFunction(async()=> (await import('/src/ptt.ts')).pttState().phase==='listening');await page.waitForTimeout(600);await mic.dispatchEvent('pointerup',{pointerId:1});await page.waitForFunction(async()=> (await import('/src/ptt.ts')).pttState().phase==='idle'&&(await import('/src/ptt.ts')).pttState().error==='没听清，请再说一次');asrMode='ok'
 report.voiceInput='Bailian key enables hold-to-talk while signed out; 16 kHz WAV data URI, transcript submitted to conversation, provider errors surfaced'
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('livliv-stage:brain')))
 await page.locator('.topbar .scene-switcher button[aria-expanded]').click();await page.locator('.shot-start').click();await page.locator('.start-overlay .welcome-demo').click();await page.waitForFunction(()=>window.__stage.conversation().running);await page.evaluate(()=>window.__stage.talk.stop())
 await page.locator('.status-line .st-tag').first().click();const form=page.locator('.popover.settings [data-section="model"]');await form.getByRole('button',{name:'阿里云百炼',exact:true}).click();assert.equal(await form.locator('input[type=password]').inputValue(),before.key)
 await form.getByRole('button',{name:'OpenAI',exact:true}).click();assert.equal(await form.locator('input[type=password]').inputValue(),'')
 await page.locator('.popover.settings .settings-head button[data-close]').click();report.settings='Bailian model automatically enables native TTS with separate character voices; demo preserves API config; changing provider clears its key; audio download has no auth header'
 for(const locale of ['zh-Hans','zh-Hant','en','ja']){
  await page.locator('.topbar button:has(svg.lucide-settings)').click();await page.locator('.language-select').selectOption(locale);await page.locator('.settings-head button[data-close]').click();await page.setViewportSize({width:1100,height:760})
  await page.locator('.actor-select').first().click();await page.screenshot({path:join(artifacts,'workspace-'+locale+'.png')});assert.equal(await page.locator('.panel').evaluate(e=>e.scrollWidth>e.clientWidth),false);assert.equal(await page.locator('.cast').evaluate(e=>e.scrollWidth>e.clientWidth),false)
  await page.locator('.topbar button:has(svg.lucide-settings)').click();await page.locator('.account-tab').click();assert.equal(await page.locator('.account-benefit').count(),3);assert.equal(await page.locator('.account-panel').evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.screenshot({path:join(artifacts,'account-'+locale+'.png')});await page.locator('.settings-head button[data-close]').click()
 }
 assert.deepEqual(errors,[]);report.errors=errors;await writeFile(join(artifacts,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}catch(e){await page?.screenshot({path:join(artifacts,'failure.png')}).catch(()=>{});console.error(artifacts);throw e}
finally{await browser?.close();server?.kill('SIGTERM')}
