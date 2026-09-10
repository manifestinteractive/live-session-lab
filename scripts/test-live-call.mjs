// Opt-in provider test. Uses synthetic media and consumes the configured project allowance.
import { LiveKitAPI } from 'livekit-server-sdk';
import { createInvitation } from '../src/lib/server/invitations.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH = process.cwd()+'/.cache/ms-playwright';
const { chromium, expect } = await import('@playwright/test');
let invitation, room;
try { ({invitation,room}=await createInvitation(process.env.INVITATION_SIGNING_SECRET)); new URL(process.env.APP_ORIGIN); new URL(process.env.LIVEKIT_URL); }
catch { console.error('Live test configuration is missing or invalid.'); process.exit(1); }
await mkdir('artifacts/playwright', {recursive:true});
const origin=process.env.APP_ORIGIN;
const url=new URL('/call',origin);
url.hash=new URLSearchParams({invite:invitation}).toString();
const host=new URL(process.env.LIVEKIT_URL);host.protocol='https:';
const api=new LiveKitAPI({host:host.origin,apiKey:process.env.LIVEKIT_API_KEY,secret:process.env.LIVEKIT_API_SECRET});
let browser;
let stage='browser startup';
const results=[];
const pages=[];
try {
 browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 stage='browser context creation';

 for(let i=0;i<3;i++) {
  const context=await browser.newContext({permissions:['camera','microphone'],viewport:{width:i===1?390:1440,height:900}});
  const page=await context.newPage();pages.push(page);
  await page.addInitScript(()=>{
   const NativePeer=window.RTCPeerConnection;const peers=[];Object.defineProperty(window,'__testPeers',{value:peers});
   window.RTCPeerConnection=class extends NativePeer {constructor(...args){super(...args);peers.push(this);}};
   const tracks=[];Object.defineProperty(window,'__captureTracks',{value:tracks});
   const capture=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async options=>{const stream=await capture(options);tracks.push(...stream.getTracks());return stream;};
  });
  stage='opening private setup';
  await page.goto(url.href);
  await expect(page.getByRole('heading',{name:'Before you join'})).toBeVisible();
  if(new URL(page.url()).hash) throw new Error('Fragment retained');
  await page.getByLabel('Temporary display name').fill('Test visitor');
 }
 for(let i=0;i<2;i++) {
  stage='joining participant '+(i+1);
  const page=pages[i];
  await page.getByRole('button',{name:'Enable camera',exact:true}).click();
  await expect(page.getByRole('button',{name:'Turn camera off'})).toBeVisible();
  await page.getByRole('button',{name:'Enable microphone',exact:true}).click();
  await expect(page.getByRole('button',{name:'Turn microphone off'})).toBeVisible();
  await page.getByRole('button',{name:'Join session'}).click();
  await expect(page.getByRole('button',{name:'Leave session'})).toBeVisible({timeout:30000});
 }
 stage='remote video playback';
 for(const page of pages.slice(0,2)) {
  const video=page.getByRole('region',{name:'Remote participant media'}).locator('video');
  await expect(video).toBeVisible({timeout:20000});
  await expect.poll(()=>video.evaluate(v=>v.videoWidth>0&&v.currentTime>0),{timeout:15000}).toBe(true);
  await expect(page.locator('audio')).toHaveCount(1);
  await expect.poll(()=>page.evaluate(async()=>{let received=false;for(const peer of window.__testPeers){const stats=await peer.getStats();stats.forEach(report=>{if(report.type==='inbound-rtp'&&report.kind==='audio'&&report.bytesReceived>0)received=true;});}return received;}),{timeout:15000}).toBe(true);
 }
 results.push('Two isolated browser participants connected; remote video decoded in both directions and inbound audio RTP bytes were received in both directions.');
 stage='third participant rejection';
 await pages[2].getByRole('button',{name:'Join session'}).click();
 await expect.poll(async()=>await pages[2].getByRole('alert',{name:'Action needed'}).count()+await pages[2].getByRole('button',{name:'Leave session'}).count(),{timeout:30000}).toBeGreaterThan(0);
 const listed=await api.room.listParticipants(room);
 const roomEvidence=(await api.room.listRooms([room]))[0];
 if(listed.length===2 && await pages[2].getByRole('alert',{name:'Action needed'}).count()) {
  results.push('LiveKit rejected a third connection while two participants were connected.');
 } else {
  results.push('FAILED: LiveKit admitted '+listed.length+' participants despite reported maxParticipants='+roomEvidence?.maxParticipants+'.');
  process.exitCode=1;
  await pages[2].getByRole('button',{name:'Leave session'}).click();
  await expect(pages[0].getByRole('region',{name:'Remote participant media'})).toHaveCount(1,{timeout:15000});
 }
 stage='SDK mute propagation';
 await pages[0].getByRole('button',{name:'Turn camera off'}).click();
 await expect(pages[0].getByRole('button',{name:'Enable camera',exact:true})).toHaveAttribute('aria-pressed','false');
 await expect(pages[1].getByRole('region',{name:'Remote participant media'}).getByText('Camera is off',{exact:true})).toBeVisible();
 await pages[0].getByRole('button',{name:'Enable camera',exact:true}).click();
 await expect(pages[1].getByRole('region',{name:'Remote participant media'}).locator('video')).toBeVisible();
 await pages[0].getByRole('button',{name:'Turn microphone off'}).click();
 await expect(pages[0].getByRole('button',{name:'Enable microphone',exact:true})).toHaveAttribute('aria-pressed','false');
 results.push('Camera mute and unmute propagated to the remote interface; microphone control reflected SDK mute state.');
 await pages[0].screenshot({path:'artifacts/playwright/phase2-live-desktop.png',fullPage:true});
 await pages[1].screenshot({path:'artifacts/playwright/phase2-live-mobile.png',fullPage:true});
 stage='leave and rejoin';
 await pages[0].getByRole('button',{name:'Leave session'}).click();
 await expect(pages[0].getByRole('heading',{name:'Before you join'})).toBeVisible();
 await expect.poll(()=>pages[0].evaluate(()=>window.__captureTracks.every(t=>t.readyState==='ended'))).toBe(true);
 await expect(pages[1].getByText('Waiting for the other participant',{exact:true})).toBeVisible();
 await pages[0].getByRole('button',{name:'Join session'}).click();
 await expect(pages[0].getByRole('button',{name:'Leave session'})).toBeVisible({timeout:30000});
 results.push('Leaving stopped synthetic capture and updated remote presence. Rejoin with the in-memory invitation succeeded.');
 for(const page of pages.slice(0,2)) await page.getByRole('button',{name:'Leave session'}).click();
 stage='room recreation';
 await api.room.deleteRoom(room);
 await pages[2].getByRole('button',{name:'Join session'}).click();
 await expect(pages[2].getByRole('button',{name:'Leave session'})).toBeVisible({timeout:30000});
 await expect.poll(async()=>(await api.room.listRooms([room]))[0]?.maxParticipants,{timeout:15000}).toBe(2);
 await pages[2].getByRole('button',{name:'Leave session'}).click();
 results.push('The same invitation recreated a deleted room with maxParticipants set to 2.');
} catch {
 results.push('FAILED during '+stage+'. Credential-bearing errors are suppressed.');
 process.exitCode=1;
} finally {
 try { await browser?.close(); }
 catch { results.push('Browser cleanup failed; verify that the test browser stopped.'); process.exitCode=1; }
 try {await api.room.deleteRoom(room);results.push('The temporary provider room was deleted.');}
 catch (error) {if (['not_found','not-found'].includes(error.code)) results.push('No temporary provider room remained.'); else { console.error('Temporary room cleanup requires verification. Provider status:', ['unauthenticated','permission_denied','unavailable','not_found'].includes(error.code)?error.code:'unclassified'); process.exitCode=1; }}
 await writeFile('artifacts/live-provider-results.json',JSON.stringify({date:new Date().toISOString(),results,passed:process.exitCode!==1},null,2));
 for(const result of results)console.log(result);
}
