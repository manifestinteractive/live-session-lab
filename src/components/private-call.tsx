"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState, LocalVideoTrack, RoomEvent, Track } from "livekit-client";
import {
  isTrackReference,
  RoomAudioRenderer,
  RoomContext,
  setLogLevel,
  StartAudio,
  useConnectionState,
  useConnectionQualityIndicator,
  useLocalParticipant,
  useParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { LockKeyhole, Settings, VideoOff } from "lucide-react";
import { CallSession, DeviceAccessError, type InputKind } from "@/lib/call-session";
import { VideoStage, VideoControls } from "@/components/video-stage";
import { PageFrame } from "@/components/page-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { connectionMessage, mediaFailureMessage, qualityLabel } from "@/lib/call-feedback";
import { cn } from "@/lib/utils";

const admissionMessages: Record<string, string> = {
  invalid_code: "This invite code is not valid. Check the code supplied by the host.",
  invalid_invitation:
    "This invitation is invalid or expired. Ask the operator for a new invitation.",
  admission_disabled: "New calls are disabled. Contact the operator before trying again.",
  origin_rejected:
    "This page does not match the configured application address. Contact the operator.",
  invalid_request: "Enter a test name with 1 to 40 characters, without control characters.",
  service_unavailable: "The call service is unavailable. Try again later.",
};

function mergeInputDevices(previous: MediaDeviceInfo[], result: MediaDeviceInfo[]) {
  return (["videoinput", "audioinput"] as const).flatMap((kind) => {
    const inputs = result.filter((device) => device.kind === kind);
    // Safari may redact an input again when temporary capture stops. Keep its last usable list.
    if (inputs.some((device) => !device.deviceId))
      return previous.filter((device) => device.kind === kind);
    return inputs;
  });
}

export function PrivateCall() {
  const invitation = useRef<string | null>(null);
  const fragmentRead = useRef(false);
  const restart = useRef<(reason: "cancel" | "leave") => void>(() => {});
  const [focusJoinForm, setFocusJoinForm] = useState(false);
  const [session, setSession] = useState<CallSession | null>(null);
  const [, refresh] = useState(0);
  const [hasInvitation, setHasInvitation] = useState(false);
  const [code, setCode] = useState("");
  const [codeFromLink, setCodeFromLink] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    const readFragment = () => {
      const hash = window.location.hash;
      if (new URLSearchParams(hash.slice(1)).has("invite"))
        history.replaceState(history.state, "", window.location.pathname + window.location.search);
      const value = new URLSearchParams(hash.slice(1)).get("invite");
      const linkedCode = value && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : "";
      // Signed invitations contain periods. Plain codes use the code exchange.
      // Both credentials are validated on the server, never by this format check.
      invitation.current = !linkedCode && value && value.length <= 2048 ? value : null;
      setCode(linkedCode);
      setCodeFromLink(!!linkedCode);
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
    const replaceSession = () => {
      current.dispose();
      current = new CallSession(() => refresh((revision) => revision + 1));
      setSession(current);
      setSessionVersion((version) => version + 1);
    };
    restart.current = (reason) => {
      if (reason === "leave") {
        invitation.current = null;
        setHasInvitation(false);
        setCode("");
        setCodeFromLink(false);
      }
      setFocusJoinForm(true);
      replaceSession();
    };
    const changedInvitation = () => {
      if (!new URLSearchParams(window.location.hash.slice(1)).has("invite")) return;
      readFragment();
      setFocusJoinForm(false);
      replaceSession();
    };
    window.addEventListener("hashchange", changedInvitation);
    const exit = () => {
      invitation.current = null;
      setCode("");
      setCodeFromLink(false);
      current.dispose();
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
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
    <PageFrame>
      {!session ? (
        <p role="status">Preparing your call...</p>
      ) : (
        <RoomContext.Provider value={session.room}>
          <CallExperience
            key={sessionVersion}
            session={session}
            getInvitation={() => invitation.current}
            hasInvitation={hasInvitation}
            code={code}
            codeFromLink={codeFromLink}
            setCode={setCode}
            restartSession={(reason) => restart.current(reason)}
            focusOnMount={focusJoinForm}
          />
        </RoomContext.Provider>
      )}
    </PageFrame>
  );
}

function PreviewVideo({ track }: { track?: LocalVideoTrack }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!track || !element) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);
  return track ? (
    <video
      ref={video}
      autoPlay
      muted
      playsInline
      aria-label="Local camera preview"
      className="h-full w-full object-cover"
    />
  ) : (
    <CameraPlaceholder />
  );
}

function CameraPlaceholder({ variant = "preview" }: { variant?: "preview" | "local" | "remote" }) {
  const remote = variant === "remote";
  return (
    <Empty className="video-placeholder" data-camera-placeholder={variant}>
      <EmptyHeader>
        <EmptyMedia>
          <VideoOff className="video-camera-icon" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{remote ? "Camera is off" : "Your camera is off"}</EmptyTitle>
        <EmptyDescription>
          {remote ? "Audio may still be active." : "Turn on Camera or Microphone"}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function ConnectedMedia({
  controls,
  details,
}: {
  controls: React.ReactNode;
  details: React.ReactNode;
}) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });
  const participants = useParticipants();
  const localTrack = tracks.find((reference) => reference.participant.isLocal);
  const remote = participants.find((participant) => !participant.isLocal);
  const remoteTrack = tracks.find(
    (reference) => reference.participant.identity === remote?.identity,
  );
  const media = (reference: typeof localTrack, isRemote = false) =>
    reference &&
    isTrackReference(reference) &&
    reference.publication.track &&
    !reference.publication.isMuted ? (
      <VideoTrack trackRef={reference} />
    ) : (
      <CameraPlaceholder variant={isRemote ? "remote" : "local"} />
    );
  return (
    <>
      <VideoStage
        allowFullscreen
        controls={controls}
        details={details}
        inset={
          <section aria-label="Your media" className="bg-black/35">
            {media(localTrack)}
            <p className="video-stage-label">You</p>
          </section>
        }
      >
        {remote ? (
          <section aria-label="Remote participant media">
            {media(remoteTrack, true)}
            <p className="video-stage-label">
              <span className="block truncate" title={remote.name || "Test participant"}>
                {remote.name || "Test participant"}
              </span>
            </p>
          </section>
        ) : (
          <Empty className="video-placeholder" data-camera-placeholder="remote">
            <EmptyHeader>
              <EmptyTitle>
                <span role="status">Waiting for the other participant</span>
              </EmptyTitle>
              <EmptyDescription>
                They can join with their own invite code or private invitation.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </VideoStage>
      <RoomAudioRenderer />
      <StartAudio
        label="Enable audio playback"
        className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
      />
    </>
  );
}

function CallExperience({
  session,
  getInvitation,
  hasInvitation,
  code,
  codeFromLink,
  setCode,
  restartSession,
  focusOnMount,
}: {
  session: CallSession;
  getInvitation: () => string | null;
  hasInvitation: boolean;
  code: string;
  codeFromLink: boolean;
  setCode: (code: string) => void;
  restartSession: (reason: "cancel" | "leave") => void;
  focusOnMount: boolean;
}) {
  const state = useConnectionState();
  const local = useLocalParticipant();
  const { quality } = useConnectionQualityIndicator({ participant: local.localParticipant });
  const participants = useParticipants();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceListError, setDeviceListError] = useState("");
  const [deviceChoices, setDeviceChoices] = useState<Partial<Record<InputKind, string>>>({});
  const [deviceListStatus, setDeviceListStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const mounted = useRef(true);
  const operation = useRef<AbortController | null>(null);
  const gate = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorAlert = useRef<HTMLDivElement>(null);
  const enumeration = useRef(0);
  const connected = state === ConnectionState.Connected;
  const active = joined && state !== ConnectionState.Disconnected;
  const camera = active ? local.isCameraEnabled : session.enabled("camera");
  const microphone = active ? local.isMicrophoneEnabled : session.enabled("microphone");

  const previousActive = useRef(active);
  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);
  const enumerate = useCallback(async () => {
    const version = ++enumeration.current;
    setDeviceListStatus("loading");
    try {
      // Direct enumeration avoids waiting for cancelled capture in the SDK.
      const result = await navigator.mediaDevices.enumerateDevices();
      if (mounted.current && version === enumeration.current) {
        setDevices((previous) => mergeInputDevices(previous, result));
        setDeviceListStatus("ready");
      }
    } catch {
      // A failed refresh is not evidence that previously listed inputs disappeared.
      if (mounted.current && version === enumeration.current) {
        setDeviceListError("Could not refresh devices. The previous list is unchanged. Try again.");
        setDeviceListStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    if (previousActive.current !== active) heading.current?.focus();
    previousActive.current = active;
  }, [active]);
  useEffect(() => {
    if (message) errorAlert.current?.focus();
  }, [message]);

  useEffect(() => {
    mounted.current = true;
    const disconnected = () => {
      setJoined(false);
      setNotice("");
    };
    const reconnected = () => setNotice("Connection restored.");
    const deviceChanged = () => {
      if (!gate.current) void enumerate();
    };
    session.room.on(RoomEvent.Disconnected, disconnected);
    session.room.on(RoomEvent.Reconnected, reconnected);
    navigator.mediaDevices?.addEventListener("devicechange", deviceChanged);
    return () => {
      mounted.current = false;
      operation.current?.abort();
      session.room.off(RoomEvent.Disconnected, disconnected);
      session.room.off(RoomEvent.Reconnected, reconnected);
      navigator.mediaDevices?.removeEventListener("devicechange", deviceChanged);
    };
  }, [session, enumerate]);

  async function action(
    work: () => Promise<void>,
    fallback: string | ((error: unknown) => string),
  ) {
    if (gate.current) return;
    gate.current = true;
    setPending(true);
    setMessage("");
    try {
      await work();
    } catch (error) {
      if (mounted.current) setMessage(typeof fallback === "function" ? fallback(error) : fallback);
    } finally {
      gate.current = false;
      if (mounted.current) setPending(false);
    }
  }

  async function join() {
    const invitation = getInvitation();
    if (!invitation && !code.trim()) {
      setMessage(admissionMessages.invalid_code);
      return;
    }
    if (gate.current) return;
    const abort = new AbortController();
    operation.current = abort;
    await action(async () => {
      setNotice("");
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
        body: JSON.stringify({
          ...(invitation ? { invitation } : { code: code.trim() }),
          displayName: name.trim(),
        }),
      });
      const result = await response.json();
      if (!mounted.current || abort.signal.aborted) return;
      if (!response.ok) {
        await session.leave();
        setMessage(admissionMessages[result.error] ?? admissionMessages.service_unavailable);
        return;
      }
      if (typeof result.serverUrl !== "string" || typeof result.token !== "string")
        throw new Error();
      await session.join(result.serverUrl, result.token);
      if (mounted.current && !abort.signal.aborted) setJoined(true);
    }, "Could not join. The room may be full or unavailable. Capture has stopped; try again when a place is free.");
    // A failed token request must release preview capture as well.
    if (!abort.signal.aborted && session.room.state === ConnectionState.Disconnected)
      await session.leave();
  }

  async function leave() {
    operation.current?.abort();
    try {
      await session.leave();
    } finally {
      if (mounted.current) restartSession("leave");
    }
  }

  const toggle = (kind: InputKind) =>
    action(
      async () => {
        const enabled = kind === "camera" ? camera : microphone;
        if (!enabled) {
          if (!navigator.mediaDevices?.getUserMedia) throw { name: "SecurityError" };
          // Safari versions can reject camera/microphone queries. The SDK handles that path.
          const permission = await navigator.permissions
            ?.query({ name: kind as PermissionName })
            .catch(() => undefined);
          if (permission?.state === "denied") throw { name: "NotAllowedError" };
          if (!mounted.current) return;
        }
        await session.toggle(kind, deviceChoices[kind]);
        if (mounted.current) await enumerate();
      },
      (error) => mediaFailureMessage(error, kind),
    );
  const discoverDevices = (kind: InputKind) =>
    action(async () => {
      const version = ++enumeration.current;
      setDeviceListStatus("loading");
      setDeviceListError("");
      try {
        const result = await session.discoverDevices(kind);
        if (mounted.current && version === enumeration.current) {
          setDevices((previous) => mergeInputDevices(previous, result));
          setDeviceListStatus("ready");
        }
      } catch (error) {
        if (mounted.current && version === enumeration.current) {
          setDeviceListError(
            error instanceof DeviceAccessError
              ? mediaFailureMessage(error.cause, kind, "refresh the device list")
              : "Could not refresh devices. The previous list is unchanged. Try again.",
          );
          setDeviceListStatus("error");
        }
      }
    }, "Could not refresh devices.");
  const changeDevice = (kind: InputKind, id: string) =>
    action(
      async () => {
        if (!id) return;
        const enabled = kind === "camera" ? camera : microphone;
        if (active || enabled) await session.select(kind, id);
        if (mounted.current) setDeviceChoices((choices) => ({ ...choices, [kind]: id }));
      },
      (error) => mediaFailureMessage(error, kind),
    );
  const trackFor = (kind: InputKind) =>
    active
      ? kind === "camera"
        ? local.cameraTrack?.track
        : local.microphoneTrack?.track
      : session.tracks.get(kind);

  const deviceSettings = (kind: InputKind) => {
    const enabled = kind === "camera" ? camera : microphone;
    const available = devices.filter(
      (device) => device.kind === (kind === "camera" ? "videoinput" : "audioinput"),
    );
    const selected =
      (enabled ? trackFor(kind)?.mediaStreamTrack.getSettings().deviceId : deviceChoices[kind]) ??
      "";
    const unavailable = pending || !available.length || (active && !connected);
    return (
      <FieldGroup className="gap-3">
        <Field data-disabled={unavailable}>
          <FieldLabel htmlFor={`call-${kind}`} className="sr-only">
            {kind === "camera" ? "Camera" : "Microphone"}
          </FieldLabel>
          <NativeSelect
            id={`call-${kind}`}
            value={selected}
            disabled={unavailable}
            aria-busy={deviceListStatus === "loading"}
            onChange={(event) => void changeDevice(kind, event.target.value)}
            className="w-full [&_select]:min-h-11"
          >
            <NativeSelectOption value="" disabled>
              {available.length
                ? "Select a device"
                : deviceListStatus === "loading"
                  ? "Loading devices..."
                  : "No devices listed"}
            </NativeSelectOption>
            {available.map((device, index) => (
              <NativeSelectOption key={device.deviceId} value={device.deviceId}>
                {device.label || `Input ${index + 1}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        {deviceListStatus === "error" && (
          <p role="status" className="text-sm text-destructive">
            {deviceListError}
          </p>
        )}
      </FieldGroup>
    );
  };

  const controls = (
    <VideoControls
      camera={camera}
      microphone={microphone}
      disabled={pending || (active && !connected)}
      onMicrophone={() => void toggle("microphone")}
      onCamera={() => void toggle("camera")}
      onLeave={active ? () => void leave().catch(() => {}) : undefined}
      cameraSettings={deviceSettings("camera")}
      microphoneSettings={deviceSettings("microphone")}
      onDeviceMenuOpen={(kind) => void discoverDevices(kind)}
      deviceRefreshDisabled={pending}
    />
  );

  const details = (
    <Popover>
      <PopoverTrigger
        aria-label="Connection details"
        title="Connection details"
        render={
          <Button
            variant="mediaInfo"
            size="icon"
            className="video-control size-[44px] rounded-full"
          />
        }
      >
        <Settings data-icon="inline-start" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="max-h-[var(--available-height)] w-80 max-w-[calc(100vw-32px)] overflow-y-auto p-4"
      >
        <PopoverHeader>
          <PopoverTitle className="text-center font-semibold">Connection details</PopoverTitle>
        </PopoverHeader>
        <dl className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-x-2 gap-y-2 text-right text-sm wrap-anywhere [&_dd]:text-left [&_dd]:text-muted-foreground">
          <div className="contents">
            <dt>Connection</dt>
            <dd>{state}</dd>
          </div>
          <div className="contents">
            <dt>Connected participants</dt>
            <dd>{connected ? participants.length : 0}</dd>
          </div>
          <div className="contents">
            <dt>Connection quality</dt>
            <dd>{qualityLabel(quality, connected)}</dd>
          </div>
          <div className="contents">
            <dt>Camera</dt>
            <dd>{camera ? "On" : "Off"}</dd>
          </div>
          <div className="contents">
            <dt>Microphone</dt>
            <dd>{microphone ? "On" : "Off"}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex flex-col">
      {active ? (
        <div className="mb-2 flex flex-col gap-1">
          <Badge variant="secondary" className="w-fit">
            Private call
          </Badge>
          <h1
            ref={heading}
            tabIndex={-1}
            className="scroll-mt-4 text-3xl font-semibold tracking-tight outline-none"
          >
            {connectionMessage(state, quality)}
          </h1>
          {notice && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          )}
        </div>
      ) : (
        <div className="flex max-w-2xl flex-col items-start gap-4">
          <Badge variant="secondary" className="h-auto px-3 py-1">
            Let&apos;s connect
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance wrap-anywhere sm:text-5xl">
            Connecting people.
            <div className="pt-2 font-light text-muted-foreground">Exploring what’s possible.</div>
          </h1>
          <p className="max-w-xl pb-4 text-base/relaxed text-muted-foreground">
            A small experiment in face-to-face conversation.
          </p>
        </div>
      )}
      {message && (
        <Alert
          ref={errorAlert}
          tabIndex={-1}
          variant="destructive"
          aria-labelledby="call-error"
          className="scroll-mt-4"
        >
          <AlertTitle id="call-error" className="font-semibold">
            Server Error
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {pending && !active && (
        <Alert role="status" aria-labelledby="pending-title">
          <AlertTitle id="pending-title">Request in progress</AlertTitle>
          <AlertDescription>
            <p>Respond to any browser permission prompt. You can cancel this request.</p>
            <Button
              variant="outline"
              className="mt-3 min-h-11"
              onClick={() => restartSession("cancel")}
            >
              Cancel request
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {session.endedDevice && (
        <Alert role="status">
          <AlertTitle>Input stopped</AlertTitle>
          <AlertDescription>
            Your {session.endedDevice} stopped. Check the device and enable it again if needed.
          </AlertDescription>
        </Alert>
      )}
      {active && connected && (
        <p role="status" className="text-sm text-muted-foreground">
          {camera
            ? "Camera is on."
            : microphone
              ? "Audio-only call. Your camera is off."
              : "Listening only. Your camera and microphone are off."}
        </p>
      )}
      {active ? (
        <ConnectedMedia controls={controls} details={details} />
      ) : (
        <div className="setup-columns grid items-stretch gap-6 lg:grid-cols-2">
          <VideoStage controls={controls} details={details}>
            <PreviewVideo
              track={camera ? (session.tracks.get("camera") as LocalVideoTrack) : undefined}
            />
          </VideoStage>
          <Card className="wrap-anywhere [--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle>
                <h2 ref={heading} tabIndex={-1} className="scroll-mt-4 text-xl outline-none">
                  Start a conversation
                </h2>
              </CardTitle>
              <CardDescription>
                {hasInvitation
                  ? "Your invitation is ready. Enter a test name to join."
                  : "Enter your invite code below to join."}
              </CardDescription>
            </CardHeader>
            <CardContent className="@container/setup-fields">
              <FieldGroup
                className={cn(
                  "grid grid-cols-1 items-start",
                  !hasInvitation && "@min-[24rem]/setup-fields:grid-cols-2",
                )}
              >
                <Field className="min-w-0">
                  <FieldLabel htmlFor="call-name">What is your name?</FieldLabel>
                  <Input
                    id="call-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="off"
                    maxLength={40}
                    disabled={pending}
                    aria-describedby="call-name-help"
                    className="min-h-11"
                  />
                  <FieldDescription id="call-name-help">
                    Seen by others when you join.
                  </FieldDescription>
                </Field>
                {!hasInvitation && (
                  <Field className="min-w-0">
                    <FieldLabel htmlFor="call-code">Invite code</FieldLabel>
                    <Input
                      id="call-code"
                      type="password"
                      value={code}
                      readOnly={codeFromLink}
                      onChange={(event) => setCode(event.target.value)}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={128}
                      disabled={pending}
                      aria-describedby="call-code-help"
                      className="min-h-11"
                    />
                    <FieldDescription id="call-code-help">
                      {codeFromLink
                        ? "Provided by your invite link."
                        : "Enter your host or guest code."}
                    </FieldDescription>
                  </Field>
                )}
              </FieldGroup>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button
                className="h-auto min-h-11 w-full py-2 whitespace-normal"
                disabled={pending || !name.trim() || (!hasInvitation && !code.trim())}
                onClick={() => void join()}
              >
                <LockKeyhole data-icon="inline-start" aria-hidden="true" />
                {pending ? "Please wait..." : "Join session"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
