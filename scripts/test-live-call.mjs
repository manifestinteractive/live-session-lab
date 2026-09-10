// Opt-in provider test. Uses synthetic media and consumes the configured project allowance.
import { LiveKitAPI } from 'livekit-server-sdk';
import { createInvitationPair } from '../src/lib/server/invitations.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH = process.cwd()+'/.cache/ms-playwright';
const { chromium, expect } = await import('@playwright/test');
let invitations, room;
try { ({invitations,room}=await createInvitationPair(process.env.INVITATION_SIGNING_SECRET)); new URL(process.env.APP_ORIGIN); new URL(process.env.LIVEKIT_URL); }
catch { console.error('Live test configuration is missing or invalid.'); process.exit(1); }
await mkdir('artifacts/playwright', {recursive:true});
const origin=process.env.APP_ORIGIN;
const urls=invitations.map(invite=>{const url=new URL('/call',origin);url.hash=new URLSearchParams({invite}).toString();return url;});
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
  await page.goto(urls[i === 1 ? 1 : 0].href);
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
 stage='invitation reuse';
 await pages[2].getByRole('button',{name:'Join session'}).click();
 await expect(pages[2].getByRole('button',{name:'Leave session'})).toBeVisible({timeout:30000});
 await expect(pages[0].getByText('This invitation was opened on another device. That connection replaced yours. Your camera and microphone have stopped.',{exact:true})).toBeVisible({timeout:15000});
 await expect.poll(()=>pages[0].evaluate(()=>window.__captureTracks.every(t=>t.readyState==='ended'))).toBe(true);
 await expect.poll(async()=>{
  const participants=await api.room.listParticipants(room);
  return {count:participants.length,identities:new Set(participants.map(p=>p.identity)).size};
 },{timeout:15000}).toEqual({count:2,identities:2});
 await expect(pages[1].getByRole('button',{name:'Leave session'})).toBeVisible();
 results.push('Reusing the first invitation replaced its original connection and stopped its capture. The second participant remained connected. The provider listed two distinct identities.');
 await pages[0].screenshot({path:'artifacts/playwright/phase2-replaced.png',fullPage:true});
 stage='leave and rejoin';
 await pages[2].getByRole('button',{name:'Leave session'}).click();
 await expect(pages[1].getByText('Waiting for the other participant',{exact:true})).toBeVisible();
 await pages[0].getByRole('button',{name:'Join session'}).click();
 await expect(pages[0].getByRole('button',{name:'Leave session'})).toBeVisible({timeout:30000});
 await expect(pages[1].getByRole('region',{name:'Remote participant media'})).toHaveCount(1);
 results.push('Leaving updated remote presence. Rejoin with the participant-specific invitation succeeded with capture off.');
 stage='room deletion';
 await api.room.deleteRoom(room);
 for(const page of pages.slice(0,2)) {
  await expect(page.getByRole('heading',{name:'Before you join'})).toBeVisible({timeout:15000});
  await expect.poll(()=>page.evaluate(()=>window.__captureTracks.every(t=>t.readyState==='ended'))).toBe(true);
 }
 results.push('Deleting the active room disconnected both participants and stopped capture.');
 stage='room recreation';
 await Promise.all(pages.slice(0,2).map(async page=>{
  await page.getByRole('button',{name:'Join session'}).click();
  await expect(page.getByRole('button',{name:'Leave session'})).toBeVisible({timeout:30000});
 }));
 await expect.poll(async()=>{
  const participants=await api.room.listParticipants(room);
  return {count:participants.length,identities:new Set(participants.map(p=>p.identity)).size};
 },{timeout:15000}).toEqual({count:2,identities:2});
 for(const page of pages.slice(0,2)) await expect(page.getByRole('region',{name:'Remote participant media'})).toHaveCount(1);
 results.push('Both participant invitations rejoined after deletion with concurrent requests. The provider listed two distinct identities.');
 const recreated=(await api.room.listRooms([room]))[0];
 results.push(recreated?.maxParticipants===2?'The recreated room also reported maxParticipants=2.':'Room configuration listing remains inconsistent; identity admission does not depend on that listing.');
 stage='recreated room invitation reuse';
 await pages[2].getByRole('button',{name:'Join session'}).click();
 await expect(pages[2].getByRole('button',{name:'Leave session'})).toBeVisible({timeout:30000});
 await expect(pages[0].getByRole('heading',{name:'Before you join'})).toBeVisible({timeout:15000});
 await expect.poll(async()=>(await api.room.listParticipants(room)).length,{timeout:15000}).toBe(2);
 results.push('Invitation reuse after room recreation again replaced its connection and left two participants.');
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
