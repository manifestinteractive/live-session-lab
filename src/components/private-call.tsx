"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConnectionState, LocalVideoTrack, Room, RoomEvent, Track } from "livekit-client";
import { isTrackReference, RoomAudioRenderer, RoomContext, setLogLevel, StartAudio, useConnectionState, useLocalParticipant, useParticipants, useTracks, VideoTrack } from "@livekit/components-react";
import { LockKeyhole, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { CallSession, type InputKind } from "@/lib/call-session";
import { PageFrame } from "@/components/session-preview";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const admissionMessages: Record<string, string> = {
  invalid_invitation: "This invitation is invalid or expired. Ask the operator for a new invitation.",
  admission_disabled: "New calls are disabled. Contact the operator before trying again.",
  origin_rejected: "This invitation does not match the configured application address. Contact the operator.",
  invalid_request: "Enter a test name with 1 to 40 characters, without control characters.",
  service_unavailable: "The call service is unavailable. Try again later.",
};

export function PrivateCall() {
  const invitation = useRef<string | null>(null);
  const fragmentRead = useRef(false);
  const [session, setSession] = useState<CallSession | null>(null);
  const [, refresh] = useState(0);
  const [hasInvitation, setHasInvitation] = useState(false);
  const [invitationVersion, setInvitationVersion] = useState(0);

  useEffect(() => {
    const readFragment = () => {
      const hash = window.location.hash;
      if (hash) history.replaceState(history.state, "", window.location.pathname + window.location.search);
      const value = new URLSearchParams(hash.slice(1)).get("invite");
      invitation.current = value && value.length <= 2048 ? value : null;
      setHasInvitation(!!invitation.current);
    };
    if (!fragmentRead.current) {
      fragmentRead.current = true;
      readFragment();
    }
    setLogLevel("silent");
    let current = new CallSession(() => refresh((revision) => revision + 1));
    // Bind the browser-only Room to this effect lifetime, including Strict Mode cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(current);
    const changedInvitation = () => {
      if (!window.location.hash) return;
      readFragment();
      current.dispose();
      current = new CallSession(() => refresh((revision) => revision + 1));
      setSession(current);
      setInvitationVersion((version) => version + 1);
    };
    window.addEventListener("hashchange", changedInvitation);
    const exit = () => { invitation.current = null; current.dispose(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pagehide", exit);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("hashchange", changedInvitation);
      window.removeEventListener("pagehide", exit);
      window.removeEventListener("pageshow", restored);
      current.dispose();
    };
  }, []);

  return (
    <PageFrame call>
      {!session ? <p role="status">Preparing private setup...</p> : !hasInvitation ? (
        <Card className="mx-auto max-w-xl [--card-spacing:--spacing(6)]">
          <CardHeader><CardTitle><h1 className="text-2xl">An invitation is required</h1></CardTitle><CardDescription>Open the private link supplied by the operator.</CardDescription></CardHeader>
          <CardContent><p>No camera or microphone access has started. Reloading a call page clears its invitation.</p></CardContent>
          <CardFooter><Link href="/" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Return to setup preview</Link></CardFooter>
        </Card>
      ) : <RoomContext.Provider value={session.room}><CallExperience key={invitationVersion} session={session} getInvitation={() => invitation.current} /></RoomContext.Provider>}
    </PageFrame>
  );
}

function PreviewVideo({ track }: { track?: LocalVideoTrack }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!track || !element) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [track]);
  return track ? <video ref={video} autoPlay muted playsInline aria-label="Local camera preview" className="aspect-video w-full rounded-2xl bg-stage object-contain" /> : <CameraPlaceholder />;
}

function CameraPlaceholder({ remote = false }: { remote?: boolean }) {
  return <Empty className="media-stage min-h-64 border"><EmptyHeader><EmptyMedia><VideoOff className="size-8" aria-hidden="true" /></EmptyMedia><EmptyTitle>{remote ? "Camera is off" : "Your camera is off"}</EmptyTitle><EmptyDescription>{remote ? "Audio may still be active." : "Enable your camera only when you are ready."}</EmptyDescription></EmptyHeader></Empty>;
}

function ConnectedMedia() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const participants = useParticipants();
  return <>
    <div className="grid gap-4 md:grid-cols-2">
      {tracks.map((reference) => <section key={reference.participant.identity} aria-label={reference.participant.isLocal ? "Your media" : "Remote participant media"} className="flex min-w-0 flex-col gap-2">
        {isTrackReference(reference) && reference.publication.track && !reference.publication.isMuted
          ? <VideoTrack trackRef={reference} className="aspect-video w-full rounded-2xl bg-stage object-contain" /> : <CameraPlaceholder remote={!reference.participant.isLocal} />}
        <p className="break-words text-sm">{reference.participant.isLocal ? "You" : reference.participant.name || "Test participant"}</p>
      </section>)}
      {participants.length < 2 && <Empty className="min-h-64 rounded-2xl border"><EmptyHeader><EmptyTitle>Waiting for the other participant</EmptyTitle><EmptyDescription>They can join with the same private invitation.</EmptyDescription></EmptyHeader></Empty>}
    </div>
    <RoomAudioRenderer />
    <StartAudio label="Enable audio playback" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")} />
  </>;
}

function CallExperience({ session, getInvitation }: { session: CallSession; getInvitation: () => string | null }) {
  const router = useRouter();
  const state = useConnectionState();
  const local = useLocalParticipant();
  const participants = useParticipants();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const mounted = useRef(true);
  const operation = useRef<AbortController | null>(null);
  const gate = useRef(false);
  const connected = state === ConnectionState.Connected;
  const active = joined && state !== ConnectionState.Disconnected;
  const camera = connected ? local.isCameraEnabled : session.enabled("camera");
  const microphone = connected ? local.isMicrophoneEnabled : session.enabled("microphone");

  useEffect(() => {
    mounted.current = true;
    const disconnected = () => { setJoined(false); setNotice("Disconnected. Capture has stopped. You can rejoin while the invitation is valid."); };
    session.room.on(RoomEvent.Disconnected, disconnected);
    return () => { mounted.current = false; operation.current?.abort(); session.room.off(RoomEvent.Disconnected, disconnected); };
  }, [session]);

  async function enumerate() {
    const result = await Room.getLocalDevices(undefined, false);
    if (mounted.current) setDevices(result.filter((device) => !!device.deviceId));
  }

  async function action(work: () => Promise<void>, fallback: string) {
    if (gate.current) return;
    gate.current = true;
    setPending(true);
    setMessage("");
    try { await work(); }
    catch { if (mounted.current) setMessage(fallback); }
    finally { gate.current = false; if (mounted.current) setPending(false); }
  }

  async function join() {
    const invitation = getInvitation();
    if (!invitation) { setMessage(admissionMessages.invalid_invitation); return; }
    const abort = new AbortController();
    operation.current = abort;
    await action(async () => {
      setNotice("");
      const response = await fetch("/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store", signal: abort.signal, body: JSON.stringify({ invitation, displayName: name.trim() }) });
      const result = await response.json();
      if (!mounted.current || abort.signal.aborted) return;
      if (!response.ok) {
        await session.leave();
        setMessage(admissionMessages[result.error] ?? admissionMessages.service_unavailable);
        return;
      }
      if (typeof result.serverUrl !== "string" || typeof result.token !== "string") throw new Error();
      await session.join(result.serverUrl, result.token);
      if (mounted.current && !abort.signal.aborted) setJoined(true);
    }, "Could not join. The room may be full or unavailable. Capture has stopped; try again when a place is free.");
    // A failed token request must release preview capture as well.
    if (!abort.signal.aborted && session.room.state === ConnectionState.Disconnected) await session.leave();
  }

  async function leave() {
    operation.current?.abort();
    await action(async () => { await session.leave(); setJoined(false); setNotice("You left the call. Capture has stopped. You can rejoin with this invitation."); }, "Capture has stopped. Reload the page before trying again.");
  }

  const toggle = (kind: InputKind) => action(async () => { await session.toggle(kind); await enumerate(); }, "Could not access that device. Check browser permissions, then try again.");
  const changeDevice = (kind: InputKind, id: string) => action(() => session.select(kind, id), "Could not switch devices. Check the selected device and try again.");
  const trackFor = (kind: InputKind) => connected ? (kind === "camera" ? local.cameraTrack?.track : local.microphoneTrack?.track) : session.tracks.get(kind);

  return <div className="flex flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-3"><Badge variant="secondary">Private invitation</Badge><h1 className="text-3xl font-semibold tracking-tight">{active ? "Your session" : "Before you join"}</h1><p role="status" className="text-muted-foreground">{state === ConnectionState.Disconnected ? "Disconnected. Preview stays on this device until you join." : `Connection: ${state}`}</p></div>
      <Button variant="outline" className="min-h-11" onClick={() => { operation.current?.abort(); void session.leave().catch(() => {}); router.push("/"); }}>Exit setup</Button>
    </div>
    {message && <Alert variant="destructive" aria-labelledby="call-error"><AlertTitle id="call-error">Action needed</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    {active ? <ConnectedMedia /> : <div className="grid items-start gap-6 lg:grid-cols-2">
      <PreviewVideo track={camera ? session.tracks.get("camera") as LocalVideoTrack : undefined} />
      <Card className="[--card-spacing:--spacing(6)]">
        <CardHeader><CardTitle><h2>Private call setup</h2></CardTitle><CardDescription>Use a made-up name. Enable only the devices you want to share.</CardDescription></CardHeader>
        <CardContent><FieldGroup><Field><FieldLabel htmlFor="call-name">Temporary display name</FieldLabel><Input id="call-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" maxLength={40} disabled={pending} aria-describedby="call-name-help" className="min-h-11" /><FieldDescription id="call-name-help">Your test name is sent to the call service when you join.</FieldDescription></Field></FieldGroup></CardContent>
        <CardFooter><Button className="min-h-11 w-full" disabled={pending || !name.trim()} onClick={() => void join()}><LockKeyhole data-icon="inline-start" aria-hidden="true" />{pending ? "Please wait..." : "Join session"}</Button></CardFooter>
      </Card>
    </div>}
    <div className="flex flex-wrap gap-3" role="group" aria-label="Media controls">
      <Button variant="outline" className="min-h-11" disabled={pending || (active && !connected)} aria-pressed={microphone} onClick={() => void toggle("microphone")}>{microphone ? <Mic data-icon="inline-start" aria-hidden="true" /> : <MicOff data-icon="inline-start" aria-hidden="true" />}{microphone ? "Turn microphone off" : "Enable microphone"}</Button>
      <Button variant="outline" className="min-h-11" disabled={pending || (active && !connected)} aria-pressed={camera} onClick={() => void toggle("camera")}>{camera ? <Video data-icon="inline-start" aria-hidden="true" /> : <VideoOff data-icon="inline-start" aria-hidden="true" />}{camera ? "Turn camera off" : "Enable camera"}</Button>
      {active && <Button variant="destructive" className="min-h-11" disabled={pending} onClick={() => void leave()}>Leave session</Button>}
    </div>
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      {(["camera", "microphone"] as const).map((kind) => {
        const enabled = kind === "camera" ? camera : microphone;
        const available = devices.filter((device) => device.kind === (kind === "camera" ? "videoinput" : "audioinput"));
        const selected = trackFor(kind)?.mediaStreamTrack.getSettings().deviceId ?? "";
        return <Field key={kind}><FieldLabel htmlFor={`call-${kind}`}>{kind === "camera" ? "Camera" : "Microphone"}</FieldLabel><NativeSelect id={`call-${kind}`} value={selected} disabled={pending || !enabled || !available.length || (active && !connected)} aria-describedby={`help-${kind}`} onChange={(event) => void changeDevice(kind, event.target.value)} className="w-full [&_select]:min-h-11"><NativeSelectOption value="">System default</NativeSelectOption>{available.map((device, index) => <NativeSelectOption key={device.deviceId} value={device.deviceId}>{device.label || `Input ${index + 1}`}</NativeSelectOption>)}</NativeSelect><FieldDescription id={`help-${kind}`}>Enable this device to see available inputs.</FieldDescription></Field>;
      })}
    </FieldGroup>
    <details className="rounded-xl border bg-card px-4 text-sm"><summary className="min-h-11 cursor-pointer content-center py-3 font-medium">Connection details</summary><dl className="grid gap-3 border-t py-4 sm:grid-cols-2"><div><dt>Connection</dt><dd>{state}</dd></div><div><dt>Connected participants</dt><dd>{connected ? participants.length : 0}</dd></div><div><dt>Camera</dt><dd>{camera ? "On" : "Off"}</dd></div><div><dt>Microphone</dt><dd>{microphone ? "On" : "Off"}</dd></div></dl></details>
    <p className="text-sm text-muted-foreground">Test conversations only. No recording or transcription. Invitation expiry does not end an existing call.</p>
  </div>;
}
